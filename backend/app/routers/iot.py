from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ml.predictor import predictor
from app.services.firebase import get_village, ingest_sensor_reading
from app.services.n8n import check_and_alert

router = APIRouter(prefix="/iot", tags=["iot"])


class SensorReading(BaseModel):
    villageId: str
    waterLevel: float = Field(..., ge=0, le=500, description="Water depth in feet below ground")
    sensorId: str = "HC-SR04"


@router.post("/reading")
async def post_reading(reading: SensorReading):
    """Receive sensor data from ESP32 via Firebase or direct API."""
    stored = ingest_sensor_reading(reading.villageId, reading.waterLevel, reading.sensorId)
    village = get_village(reading.villageId) or {"id": reading.villageId, "name": reading.villageId}
    risk = predictor.risk(reading.villageId)
    anomalies = predictor.anomalies(reading.villageId)
    anomaly_score = anomalies[0]["score"] if anomalies else None
    alert_result = await check_and_alert(
        {**village, "waterLevel": reading.waterLevel},
        risk["score"],
        anomaly_score,
    )
    return {
        "reading": stored,
        "risk": risk,
        "anomalyScore": anomaly_score,
        "alert": alert_result,
    }


@router.get("/readings/{village_id}")
def readings(village_id: str, limit: int = 50):
    from app.services.firebase import get_readings
    return get_readings(village_id, limit)
