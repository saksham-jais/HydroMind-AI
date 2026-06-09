from fastapi import APIRouter

from app.ml.predictor import predictor

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/forecast/{village_id}")
def forecast(village_id: str):
    return predictor.forecast(village_id)


@router.get("/risk/{village_id}")
def risk(village_id: str):
    return predictor.risk(village_id)


@router.get("/anomalies")
def anomalies(village_id: str | None = None):
    return predictor.anomalies(village_id)


@router.get("/crisis/{village_id}")
def crisis(village_id: str):
    return predictor.crisis_countdown(village_id)


@router.get("/insights")
def insights():
    return {"insights": predictor.insights()}
