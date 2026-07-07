from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.ml.predictor import predictor
from app.routers import alerts, chat, iot, predictions, villages, analysis, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    predictor._ensure_models()
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


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "HydroMind AI", "tagline": "Predict. Alert. Prevent."}
