"""RAG assistant — Gemini + LangChain + ChromaDB with rule-based fallback."""

from __future__ import annotations

import logging
from pathlib import Path

from app.config import settings
from app.services.firebase import get_alerts, get_totals
from app.services.data_service import CGWB_2024_STATS, get_district_analysis, get_historical_summary

logger = logging.getLogger(__name__)

_chroma_ready = False
_retriever = None




def _build_knowledge_docs() -> list[str]:
    docs = []
    # Real dataset: CGWB District groundwater stats
    for district, stats in CGWB_2024_STATS.items():
        analysis = get_district_analysis(district)
        hist = get_historical_summary(district)
        docs.append(
            f"District {district.title()} (Category: {analysis['category']}): "
            f"Groundwater extraction stage is {analysis['stage_pct']}%. "
            f"Historical decadal depletion is {hist.get('depletion', 0)} m. "
            f"Active monitoring: {analysis['sensors']}. "
            f"Deficit: {analysis['deficit']}."
        )
    
    docs.append(
        "Gujarat state context (CGWB 2024): Total GW recharge = 27.58 BCM, extraction = 13.86 BCM (54.21%). "
        "Irrigation accounts for 92% of all GW extraction. "
        "Over-Exploited districts: Banaskantha (119.81%), Patan (112.1%), Mahesana (109.67%), Gandhinagar (102.67%). "
        "Critical action: Enforce borewell moratoriums in over-exploited districts."
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
    
    # Check if a specific district is mentioned in the query
    for district in CGWB_2024_STATS.keys():
        if district in q:
            analysis = get_district_analysis(district)
            category = analysis['category']
            stage = analysis['stage_pct']
            hist = get_historical_summary(district)
            depletion = hist.get('depletion', 0)
            
            if category in ["Over-Exploited", "Critical"]:
                return f"{district.title()} is currently at high risk ({category})! Groundwater extraction is at {stage}%. The historical decadal depletion is {depletion}m. Immediate action is recommended."
            elif category == "Semi-Critical":
                return f"{district.title()} is Semi-Critical. Extraction is at {stage}%. Monitor closely as the decadal trend shows {depletion}m change."
            else:
                return f"{district.title()} is in the Safe category with extraction at {stage}%. The trend is stable ({depletion}m decadal change)."

    if "risk" in q or "critical" in q or "over-exploited" in q:
        top = [d for d, s in CGWB_2024_STATS.items() if s['stage'] >= 100]
        names = ", ".join(d.title() for d in top)
        return f"Based on CGWB 2024 dataset, the Over-Exploited (highest risk) districts are: {names}. They require immediate intervention."

    if "actions" in q or "recommend" in q:
        return "For Over-Exploited districts, CGWB recommends: Enforcing groundwater regulation, promoting micro-irrigation, and building artificial recharge structures like check dams."

    return (
        "HydroMind monitors 33 Gujarat districts using the official CGWB dataset. "
        "Ask about specific districts (e.g., 'Why is Mehsana critical?'), highest risk zones, or recommended actions."
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
