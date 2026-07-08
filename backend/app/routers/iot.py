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


import time

_last_reading_time = {}

@router.post("/reading")
async def post_reading(reading: SensorReading):
    """Receive sensor data from ESP32 via Firebase or direct API."""
    import asyncio
    print(f"DEBUG: Received reading from {reading.villageId} via sensor {reading.sensorId}: {reading.waterLevel}ft")
    
    # --- RATE LIMITER: Drop requests faster than 5 seconds to prevent DDOS ---
    now = time.time()
    last = _last_reading_time.get(reading.villageId, 0)
    if now - last < 5:
        # Ignore this reading to protect the server
        return {"status": "ignored", "reason": "rate_limited"}
    _last_reading_time[reading.villageId] = now
    
    loop = asyncio.get_event_loop()
    
    # Run synchronous Firebase operations in a threadpool so they don't block the event loop
    stored = await loop.run_in_executor(
        None, lambda: ingest_sensor_reading(reading.villageId, reading.waterLevel, reading.sensorId)
    )
    village_data = await loop.run_in_executor(
        None, lambda: get_village(reading.villageId)
    )
    village = village_data or {"id": reading.villageId, "name": reading.villageId}
    
    risk = await loop.run_in_executor(
        None, lambda: predictor.risk(reading.villageId)
    )
    anomalies = await loop.run_in_executor(
        None, lambda: predictor.anomalies(reading.villageId)
    )
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
