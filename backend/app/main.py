from contextlib import asynccontextmanager
import asyncio
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.ml.predictor import predictor
from app.routers import alerts, chat, iot, predictions, villages, analysis, auth, officers, contacts


async def _prewarm_iot_background():
    """Fire-and-forget: populate IoT cache without blocking server startup."""
    try:
        import time as _time
        loop = asyncio.get_event_loop()
        from app.services.firebase import get_readings
        live_readings = await loop.run_in_executor(None, lambda: get_readings("v1", limit=1))
        analysis._IOT_CACHE["data"] = live_readings[-1] if live_readings else None
        analysis._IOT_CACHE["ts"] = _time.time()
        print(f"[startup] IoT cache primed — got {len(live_readings)} reading(s)")
    except Exception as e:
        print(f"[startup] IoT pre-warm failed (Firebase may be offline): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    predictor._ensure_models()

    # 1. ML models — fast after retraining (~2s), load synchronously
    print("[startup] Loading ML forecast models...")
    try:
        analysis._load_forecast_data()
        print(f"[startup] ML models loaded OK ({len(analysis._MODELS_CACHE or {})} districts)")
    except Exception as e:
        print(f"[startup] ML model load failed: {e}")

    # 2. State-trend JSON — tiny file, instant
    from app.services.data_service import DS
    cache_file = DS / "state_trend_cache.json"
    if cache_file.exists():
        analysis._STATE_TREND_CACHE = json.load(open(cache_file))
        print(f"[startup] state_trend_cache loaded ({len(analysis._STATE_TREND_CACHE)} years)")
    else:
        analysis._STATE_TREND_CACHE = {}
        print("[startup] state_trend_cache.json missing — using synthetic fallback")

    # 3. IoT Firebase — slow (4s), run in background so server is ready instantly
    asyncio.create_task(_prewarm_iot_background())
    print("[startup] IoT Firebase cache warming in background...")

    yield


app = FastAPI(
    title="HydroMind AI API",
    description="AI-powered groundwater intelligence platform for Gujarat",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(villages.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(iot.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(officers.router, prefix="/api")
app.include_router(contacts.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "HydroMind AI", "tagline": "Predict. Alert. Prevent."}
