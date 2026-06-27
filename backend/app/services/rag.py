"""RAG assistant — Gemini + LangChain + ChromaDB with rule-based fallback."""

from __future__ import annotations

import logging
from pathlib import Path

from app.config import settings
from app.data.mock_villages import INSIGHTS
from app.services.firebase import get_alerts, get_totals, get_villages

logger = logging.getLogger(__name__)

_chroma_ready = False
_retriever = None




def _build_knowledge_docs() -> list[str]:
    docs = []
    for v in get_villages():
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

    if not settings.gemini_api_key:
        logger.info("Gemini API key not set — RAG uses rule-based fallback")
        _chroma_ready = True
        return False

    key_preview = settings.gemini_api_key[:8] if settings.gemini_api_key else "None"
    logger.info("Initializing ChromaDB RAG with key starting: %s...", key_preview)

    try:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        from langchain_chroma import Chroma
        from langchain_core.documents import Document

        persist_dir = str(Path("chroma_db"))
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=settings.gemini_api_key)
        docs = [Document(page_content=d) for d in _build_knowledge_docs()]
        vectorstore = Chroma.from_documents(docs, embeddings, persist_directory=persist_dir)
        _retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
        _chroma_ready = True
        logger.info("ChromaDB RAG initialized with %d documents", len(docs))
        return True
    except Exception as e:
        logger.warning("RAG init failed: %s — using fallback", e)
        _chroma_ready = True
        return False


def _rule_based(query: str) -> str:
    q = query.lower().strip()
    villages = get_villages()
    
    if "mehsana" in q and ("critical" in q or "risk" in q or "why" in q):
        v = next((v for v in villages if v["name"].lower() == "mehsana"), None)
        if v:
            if v["riskScore"] < 50:
                return f"According to live sensor data, Mehsana is currently SAFE with a low risk score of {v['riskScore']}%. The water level is at {v['waterLevel']} ft."
            return f"Mehsana is currently at risk! Risk score is {v['riskScore']}%. The water level is at {v['waterLevel']} ft."

    if "risk" in q or "critical" in q:
        top = sorted(villages, key=lambda v: v.get("riskScore", 0), reverse=True)[:3]
        names = ", ".join(f"{v['name']} ({v.get('riskScore', 0)}%)" for v in top)
        return f"Based on live sensor data, the highest risk villages currently are: {names}."

    if "inspection" in q or "actions" in q:
        high_risk = [v for v in villages if v.get("riskScore", 0) >= 80]
        if not high_risk:
            return "Based on real-time data, no villages currently require immediate inspection."
        names = ", ".join(v['name'] for v in high_risk)
        return f"Top inspection priority (composite risk ≥80%): {names}. Field officers have been notified."

    if "alert" in q:
        alerts = get_alerts()
        pending = [a for a in alerts if a.get("status") == "pending"]
        return f"There are {len(alerts)} total alerts, {len(pending)} pending dispatch via n8n."

    totals = get_totals()
    return (
        f"HydroMind monitors {totals.get('villages', 0)} Gujarat villages. "
        f"Average water level is {totals.get('avgWaterLevel', 0)} ft with {totals.get('highRisk', 0)} high-risk zones. "
        "Ask about specific villages, risk zones, alerts, or recommended actions."
    )


async def chat(query: str) -> dict:
    if _init_chroma() and _retriever and settings.gemini_api_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            from langchain_core.prompts import ChatPromptTemplate

            docs = _retriever.invoke(query)
            context = "\n".join(d.page_content for d in docs)
            llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", google_api_key=settings.gemini_api_key)
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
