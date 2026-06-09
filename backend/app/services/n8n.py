"""n8n automation webhook integration."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

ALERT_THRESHOLD = 75


async def dispatch_alert(payload: dict[str, Any]) -> dict:
    """Send alert to n8n webhook for email / ticket automation."""
    payload.setdefault("timestamp", datetime.utcnow().isoformat() + "Z")
    payload.setdefault("source", "hydromind-api")

    if not settings.n8n_webhook_url:
        logger.info("n8n not configured — alert logged locally: %s", payload.get("village"))
        return {"status": "logged", "dispatched": False, "payload": payload}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(settings.n8n_webhook_url, json=payload)
            resp.raise_for_status()
        logger.info("n8n alert dispatched for %s", payload.get("village"))
        return {"status": "dispatched", "dispatched": True, "httpStatus": resp.status_code}
    except Exception as e:
        logger.error("n8n dispatch failed: %s", e)
        return {"status": "failed", "dispatched": False, "error": str(e)}


async def check_and_alert(village: dict, risk_score: float, anomaly_score: float | None = None) -> dict | None:
    """Trigger n8n if risk or anomaly thresholds exceeded."""
    should_alert = risk_score >= ALERT_THRESHOLD or (anomaly_score is not None and anomaly_score >= 0.8)
    if not should_alert:
        return None

    payload = {
        "alertType": "groundwater_risk",
        "village": village.get("name"),
        "villageId": village.get("id"),
        "district": village.get("district"),
        "riskScore": risk_score,
        "anomalyScore": anomaly_score,
        "officer": village.get("officer"),
        "officerEmail": village.get("officerEmail"),
        "officerPhone": village.get("officerPhone"),
        "waterLevel": village.get("waterLevel"),
        "actions": ["send_whatsapp", "create_inspection_ticket", "notify_water_department"],
    }
    return await dispatch_alert(payload)
