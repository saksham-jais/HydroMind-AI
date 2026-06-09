"""RAG assistant — Gemini + LangChain + ChromaDB with rule-based fallback."""

from __future__ import annotations

import logging
from pathlib import Path

from app.config import settings
from app.data.mock_villages import INSIGHTS, VILLAGES
from app.services.firebase import get_alerts, get_totals

logger = logging.getLogger(__name__)

_chroma_ready = False
_retriever = None

CANNED = {
    "why is mehsana critical": (
        "Mehsana's groundwater has declined 18% in the last 6 months — the steepest in Gujarat. "
        "Current depth is 98 ft, projected to cross the 150 ft critical threshold within 143 days "
        "based on the LightGBM forecast."
    ),
    "which villages need inspection": (
        "Top inspection priority (composite risk ≥80%): Mehsana (92%), Bhuj (88%), Patan (84%), "
        "Palanpur (81%). Field officers have been notified via n8n."
    ),
    "show highest risk zones": (
        "Critical belt: Mehsana, Banaskantha, and Patan districts. Kutch trending warning. "
        "Ahmedabad rural pockets remain stable."
    ),
    "what actions should be taken": (
        "1) Immediate borewell audit in Mehsana & Bhuj. 2) Rationing notice for Banaskantha. "
        "3) Halt new commercial extraction permits across critical districts. "
        "4) Schedule monsoon recharge structures."
    ),
}


def _build_knowledge_docs() -> list[str]:
    docs = []
    for v in VILLAGES:
        docs.append(
            f"Village {v['name']} in {v['district']} district: water level {v['waterLevel']} ft, "
            f"risk score {v['riskScore']}%, 6-month trend {v['trend6mo']}% decline, "
            f"predicted crisis date {v['predictedCrisisDate']}, officer {v['officer']} ({v['officerEmail']})."
        )
    for insight in INSIGHTS:
        docs.append(f"AI Insight: {insight}")
    totals = get_totals()
    docs.append(
        f"State totals: {totals['villages']} villages monitored, average water level {totals['avgWaterLevel']} ft, "
        f"{totals['highRisk']} high-risk villages, {totals['activeAlerts']} active alerts."
    )
    for a in get_alerts():
        docs.append(
            f"Alert {a['id']}: {a['village']} ({a['district']}) risk {a['risk']}%, status {a['status']}, date {a['date']}."
        )
    docs.append(
        "Government guidelines: Monitor borewell extraction permits quarterly. "
        "Critical threshold is 150 ft below ground. Deploy recharge structures before monsoon. "
        "District officers must acknowledge alerts within 24 hours."
    )
    return docs


def _init_chroma() -> bool:
    global _chroma_ready, _retriever
    if _chroma_ready:
        return _retriever is not None
    _chroma_ready = True

    if not settings.gemini_api_key:
        logger.info("Gemini API key not set — RAG uses rule-based fallback")
        return False

    try:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        from langchain_community.vectorstores import Chroma
        from langchain_core.documents import Document

        persist_dir = str(Path("chroma_db"))
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=settings.gemini_api_key)
        docs = [Document(page_content=d) for d in _build_knowledge_docs()]
        vectorstore = Chroma.from_documents(docs, embeddings, persist_directory=persist_dir)
        _retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
        logger.info("ChromaDB RAG initialized with %d documents", len(docs))
        return True
    except Exception as e:
        logger.warning("RAG init failed: %s — using fallback", e)
        return False


def _rule_based(query: str) -> str:
    q = query.lower().strip()
    for key, answer in CANNED.items():
        if key in q:
            return answer

    if "risk" in q or "critical" in q:
        top = sorted(VILLAGES, key=lambda v: v["riskScore"], reverse=True)[:3]
        names = ", ".join(f"{v['name']} ({v['riskScore']}%)" for v in top)
        return f"Highest risk villages: {names}. Mehsana leads with 18% 6-month decline."

    if "alert" in q:
        alerts = get_alerts()
        pending = [a for a in alerts if a["status"] == "pending"]
        return f"There are {len(alerts)} total alerts, {len(pending)} pending dispatch via n8n."

    totals = get_totals()
    return (
        f"HydroMind monitors {totals['villages']} Gujarat villages. "
        f"Average water level is {totals['avgWaterLevel']} ft with {totals['highRisk']} high-risk zones. "
        "Ask about specific villages, risk zones, alerts, or recommended actions."
    )


async def chat(query: str) -> dict:
    if _init_chroma() and _retriever and settings.gemini_api_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            from langchain_core.prompts import ChatPromptTemplate

            docs = _retriever.invoke(query)
            context = "\n".join(d.page_content for d in docs)
            llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=settings.gemini_api_key)
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are HydroMind AI, a groundwater intelligence assistant for Gujarat government officials. Answer concisely using only the provided context."),
                ("human", "Context:\n{context}\n\nQuestion: {query}"),
            ])
            chain = prompt | llm
            response = chain.invoke({"context": context, "query": query})
            return {"answer": response.content, "source": "rag-gemini"}
        except Exception as e:
            logger.warning("Gemini RAG failed: %s", e)

    return {"answer": _rule_based(query), "source": "rule-based"}
