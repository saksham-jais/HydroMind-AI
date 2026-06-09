"""Firebase Realtime Database integration with mock fallback."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from app.config import settings
from app.data.mock_villages import ALERTS, VILLAGES

logger = logging.getLogger(__name__)

_db = None
_firebase_ready = False


def _init_firebase() -> bool:
    global _db, _firebase_ready
    if _firebase_ready:
        return _db is not None
    _firebase_ready = True

    if not settings.firebase_credentials_path or not settings.firebase_database_url:
        logger.info("Firebase not configured — using mock data")
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials, db

        if not firebase_admin._apps:
            cred = credentials.Certificate(settings.firebase_credentials_path)
            firebase_admin.initialize_app(cred, {"databaseURL": settings.firebase_database_url})
        _db = db
        logger.info("Firebase connected")
        return True
    except Exception as e:
        logger.warning("Firebase init failed: %s — using mock data", e)
        return False


def get_villages() -> list[dict]:
    if _init_firebase() and _db:
        ref = _db.reference("/villages")
        data = ref.get() or {}
        if isinstance(data, dict) and data:
            return list(data.values()) if all(isinstance(v, dict) for v in data.values()) else VILLAGES
    return VILLAGES


def get_village(village_id: str) -> dict | None:
    villages = get_villages()
    for v in villages:
        if v.get("id") == village_id:
            return v
    return None


def get_alerts() -> list[dict]:
    if _init_firebase() and _db:
        ref = _db.reference("/alerts")
        data = ref.get() or {}
        if isinstance(data, dict) and data:
            return list(data.values())
    return ALERTS


def get_totals() -> dict:
    villages = get_villages()
    high_risk = sum(1 for v in villages if v.get("riskScore", 0) >= 75)
    avg_level = round(sum(v.get("waterLevel", 0) for v in villages) / max(len(villages), 1))
    alerts = get_alerts()
    active = sum(1 for a in alerts if a.get("status") in ("sent", "pending"))
    return {
        "villages": len(villages),
        "avgWaterLevel": avg_level,
        "highRisk": high_risk,
        "activeAlerts": active,
    }


def ingest_sensor_reading(village_id: str, water_level: float, sensor_id: str = "HC-SR04") -> dict:
    """Store IoT sensor reading from ESP32."""
    reading = {
        "villageId": village_id,
        "waterLevel": water_level,
        "sensorId": sensor_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    if _init_firebase() and _db:
        ref = _db.reference(f"/readings/{village_id}")
        ref.push(reading)
        village_ref = _db.reference(f"/villages/{village_id}")
        village_ref.update({"waterLevel": water_level, "lastReading": reading["timestamp"]})
        logger.info("Stored reading for %s: %.1f ft", village_id, water_level)
    else:
        for v in VILLAGES:
            if v["id"] == village_id:
                v["waterLevel"] = water_level
                break
        logger.info("Mock store reading for %s: %.1f ft", village_id, water_level)

    return reading


def get_readings(village_id: str, limit: int = 50) -> list[dict]:
    if _init_firebase() and _db:
        ref = _db.reference(f"/readings/{village_id}")
        data = ref.order_by_key().limit_to_last(limit).get() or {}
        if isinstance(data, dict):
            return list(data.values())
    return []
