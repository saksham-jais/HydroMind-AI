"""
HydroMind AI — Alert Dispatcher
Supports two channels (tried in order):
  1. Direct SMTP email (if SMTP_USER + SMTP_PASSWORD are set in .env)
  2. n8n webhook (if N8N_WEBHOOK_URL is set)
  3. Local log (fallback — always works)
"""

from __future__ import annotations

import logging
import smtplib
import ssl
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

ALERT_THRESHOLD = 75


def _risk_level(score: float) -> str:
    if score >= 85:
        return "CRITICAL — Over-Exploited"
    if score >= 75:
        return "HIGH — Critical Zone"
    if score >= 50:
        return "MEDIUM — Semi-Critical"
    return "LOW — Safe"


def _recommended_actions(risk_score: float, anomaly_score: float | None) -> list[str]:
    actions = []
    if risk_score >= 85:
        actions += [
            "Immediately suspend new borewell permits in this district",
            "Deploy emergency water tankers to affected villages",
            "Escalate to State Water Board for Emergency Order",
            "Schedule urgent field inspection within 48 hours",
            "Activate district-level Drought Management Protocol",
        ]
    elif risk_score >= 75:
        actions += [
            "Schedule field inspection within 72 hours",
            "Audit existing borewell permits in the district",
            "Notify State Water Department and District Collector",
            "Issue advisory to farmers on reducing groundwater extraction",
            "Activate micro-irrigation subsidy applications",
        ]
    else:
        actions += [
            "Continue routine monitoring",
            "Review seasonal extraction patterns",
            "Prepare contingency irrigation plan for dry season",
        ]
    if anomaly_score and anomaly_score >= 0.8:
        actions.insert(0, "ANOMALY DETECTED — Inspect sensor hardware and report unauthorized extraction")
    return actions


def _build_html_email(payload: dict) -> str:
    village    = payload.get("village", "Unknown Village")
    district   = payload.get("district", "Unknown District")
    risk       = float(payload.get("riskScore", 0))
    anomaly    = payload.get("anomalyScore")
    officer    = payload.get("officer", "District Officer")
    water_lvl  = payload.get("waterLevel", "N/A")
    timestamp  = payload.get("timestamp", datetime.utcnow().isoformat())
    actions    = payload.get("actions_detail", _recommended_actions(risk, anomaly))
    risk_label = _risk_level(risk)

    color = "#ef4444" if risk >= 75 else "#f59e0b" if risk >= 50 else "#22c55e"
    actions_html = "".join(f"<li style='margin:4px 0'>{a}</li>" for a in actions)

    water_display = f"{float(water_lvl) * 3.28084:.2f} ft" if water_lvl != "N/A" else "N/A"

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'/></head>
<body style='margin:0;padding:0;background:#0a0f1e;font-family:Arial,sans-serif'>
  <div style='max-width:600px;margin:0 auto;padding:24px'>

    <!-- Header -->
    <div style='background:linear-gradient(135deg,#0ea5e9,#6366f1);border-radius:12px;padding:24px;margin-bottom:20px'>
      <div style='display:flex;align-items:center;gap:12px'>
        <div style='font-size:32px'>💧</div>
        <div>
          <div style='color:#fff;font-size:20px;font-weight:700'>HydroMind AI — Groundwater Alert</div>
          <div style='color:rgba(255,255,255,0.8);font-size:13px'>Jalrakshak AI Platform · Gujarat Groundwater Intelligence</div>
        </div>
      </div>
    </div>

    <!-- Risk Badge -->
    <div style='background:#1e293b;border:1px solid {color};border-radius:10px;padding:20px;margin-bottom:16px'>
      <div style='display:flex;justify-content:space-between;align-items:center'>
        <div>
          <div style='color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px'>Risk Level</div>
          <div style='color:{color};font-size:24px;font-weight:700;margin-top:4px'>{risk_label}</div>
        </div>
        <div style='background:{color};color:#fff;font-size:28px;font-weight:800;padding:10px 18px;border-radius:8px'>{risk:.0f}%</div>
      </div>
    </div>

    <!-- Village / District Info -->
    <div style='background:#1e293b;border-radius:10px;padding:20px;margin-bottom:16px'>
      <div style='color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px'>Location Details</div>
      <table style='width:100%;border-collapse:collapse'>
        <tr>
          <td style='color:#94a3b8;font-size:13px;padding:6px 0'>📍 Village</td>
          <td style='color:#f1f5f9;font-size:13px;font-weight:600;text-align:right'>{village}</td>
        </tr>
        <tr>
          <td style='color:#94a3b8;font-size:13px;padding:6px 0'>🏛️ District</td>
          <td style='color:#f1f5f9;font-size:13px;font-weight:600;text-align:right'>{district}</td>
        </tr>
        <tr>
          <td style='color:#94a3b8;font-size:13px;padding:6px 0'>💧 Water Level</td>
          <td style='color:#f1f5f9;font-size:13px;font-weight:600;text-align:right'>{water_display} bgl</td>
        </tr>
        <tr>
          <td style='color:#94a3b8;font-size:13px;padding:6px 0'>👮 Officer</td>
          <td style='color:#f1f5f9;font-size:13px;font-weight:600;text-align:right'>{officer}</td>
        </tr>
        <tr>
          <td style='color:#94a3b8;font-size:13px;padding:6px 0'>🕒 Timestamp</td>
          <td style='color:#94a3b8;font-size:12px;text-align:right'>{timestamp}</td>
        </tr>
      </table>
    </div>

    <!-- Recommended Actions -->
    <div style='background:#1e293b;border-radius:10px;padding:20px;margin-bottom:16px'>
      <div style='color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px'>⚡ Recommended Actions</div>
      <ul style='color:#f1f5f9;font-size:13px;line-height:1.7;margin:0;padding-left:20px'>
        {actions_html}
      </ul>
    </div>

    <!-- Footer -->
    <div style='text-align:center;color:#475569;font-size:11px;margin-top:20px'>
      <p>This is an automated alert from HydroMind AI — Jalrakshak Platform</p>
      <p>Gujarat Groundwater Intelligence · CGWB Data Integrated · ESP32 IoT Sensors</p>
      <p style='margin-top:8px'>🔗 <a href='https://hydromind-ai.vercel.app' style='color:#0ea5e9'>Open Dashboard</a></p>
    </div>
  </div>
</body>
</html>
"""


def _build_plain_text(payload: dict) -> str:
    village   = payload.get("village", "Unknown")
    district  = payload.get("district", "Unknown")
    risk      = float(payload.get("riskScore", 0))
    anomaly   = payload.get("anomalyScore")
    officer   = payload.get("officer", "District Officer")
    water_lvl = payload.get("waterLevel", "N/A")
    actions   = payload.get("actions_detail", _recommended_actions(risk, anomaly))
    risk_label = _risk_level(risk)

    water_display = f"{float(water_lvl) * 3.28084:.2f} ft" if water_lvl != "N/A" else "N/A"
    actions_text  = "\n".join(f"  • {a}" for a in actions)

    return f"""
HydroMind AI — GROUNDWATER ALERT
==================================
Risk Level  : {risk_label}
Risk Score  : {risk:.0f}%

LOCATION
Village     : {village}
District    : {district}
Water Level : {water_display} bgl
Officer     : {officer}

RECOMMENDED ACTIONS
{actions_text}

---
Automated alert from HydroMind AI (Jalrakshak Platform)
Dashboard: https://hydromind-ai.vercel.app
"""


async def _send_smtp_email(to_email: str, payload: dict) -> dict:
    """Send alert email directly via SMTP (no n8n required)."""
    village = payload.get("village", "Unknown")
    risk    = float(payload.get("riskScore", 0))

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[HydroMind ALERT] {_risk_level(risk)} — {village} ({risk:.0f}% Risk)"
    msg["From"]    = settings.alert_from_email
    msg["To"]      = to_email

    msg.attach(MIMEText(_build_plain_text(payload), "plain"))
    msg.attach(MIMEText(_build_html_email(payload), "html"))

    def _send_sync():
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, to_email, msg.as_string())
            
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send_sync)
        logger.info("SMTP email sent to %s for village %s", to_email, village)
        return {"status": "sent", "dispatched": True, "channel": "smtp", "recipient": to_email}
    except Exception as e:
        logger.error("SMTP email failed: %s", e)
        return {"status": "failed", "dispatched": False, "channel": "smtp", "error": str(e)}


async def dispatch_alert(payload: dict[str, Any]) -> dict:
    """
    Send alert via available channels (SMTP, WhatsApp officer, WhatsApp regional contacts).
    Enriches payload with recommended actions and risk level before sending.
    """
    payload.setdefault("timestamp", datetime.utcnow().isoformat() + "Z")
    payload.setdefault("source", "hydromind-api")

    risk    = float(payload.get("riskScore", 0))
    anomaly = payload.get("anomalyScore")

    # Enrich payload with derived fields
    payload["riskLevel"]      = _risk_level(risk)
    payload["actions_detail"] = _recommended_actions(risk, anomaly)

    results = {}

    # ── Channel 1: Direct SMTP email ──────────────────────────────────
    if settings.smtp_configured:
        recipient = (
            payload.get("officerEmail")
            or settings.alert_to_email
            or settings.smtp_user
        )
        if recipient:
            results["email"] = await _send_smtp_email(recipient, payload)

    # ── Channel 2: WhatsApp to officer via n8n/Baileys webhook ────────
    if settings.n8n_webhook_url:
        officer_phone = payload.get("officerPhone")
        wa_payload = {**payload}
        if officer_phone:
            # Strip non-numeric characters (like + or spaces) for WhatsApp JID
            clean_phone = "".join(filter(str.isdigit, str(officer_phone)))
            wa_payload["phone"] = clean_phone
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(settings.n8n_webhook_url, json=wa_payload)
                resp.raise_for_status()
            logger.info("WhatsApp alert sent to officer for %s", payload.get("village"))
            results["whatsapp_officer"] = {"status": "dispatched", "dispatched": True, "phone": officer_phone}
        except Exception as e:
            logger.error("WhatsApp officer dispatch failed: %s", e)
            results["whatsapp_officer"] = {"status": "failed", "dispatched": False, "error": str(e)}

    # ── Channel 3: WhatsApp broadcast to all regional contacts ────────
    if settings.n8n_webhook_url:
        district = payload.get("district") or payload.get("village", "")
        try:
            from app.routers.contacts import get_contacts_for_region
            regional_contacts = get_contacts_for_region(district)
            contact_results = []
            async with httpx.AsyncClient(timeout=10) as client:
                for contact in regional_contacts:
                    clean_contact_phone = "".join(filter(str.isdigit, str(contact["phone"])))
                    contact_payload = {
                        **payload,
                        "phone": clean_contact_phone,
                        "recipientName": contact["name"],
                        "recipientType": "local_contact",
                    }
                    try:
                        r = await client.post(settings.n8n_webhook_url, json=contact_payload)
                        r.raise_for_status()
                        contact_results.append({"name": contact["name"], "phone": contact["phone"], "status": "sent"})
                        logger.info("WhatsApp sent to local contact %s (%s)", contact["name"], contact["phone"])
                    except Exception as ce:
                        contact_results.append({"name": contact["name"], "phone": contact["phone"], "status": "failed", "error": str(ce)})
            if contact_results:
                results["whatsapp_contacts"] = {"dispatched": True, "recipients": contact_results}
        except Exception as e:
            logger.error("Regional contacts broadcast failed: %s", e)

    # ── Fallback: Local log ───────────────────────────────────────────
    if not results:
        logger.info("No dispatch channels configured — alert logged: %s | Risk: %s%%",
                    payload.get("village"), risk)
        return {
            "status": "logged",
            "dispatched": False,
            "message": "Configure SMTP_USER/SMTP_PASSWORD or N8N_WEBHOOK_URL to enable real alerts.",
            "payload": payload,
        }

    any_dispatched = any(v.get("dispatched") for v in results.values())
    return {
        "status": "dispatched" if any_dispatched else "failed",
        "dispatched": any_dispatched,
        "channels": results,
        "riskLevel": payload["riskLevel"],
        "village": payload.get("village"),
    }



_alert_state = {}

async def check_and_alert(village: dict, risk_score: float, anomaly_score: float | None = None) -> dict | None:
    """Trigger alert dispatch only on state transitions (e.g. Safe→Critical)."""
    village_id = village.get("id")

    # Determine current alert category from risk score
    if risk_score >= 85:
        current_state = "over_exploited"
    elif risk_score >= ALERT_THRESHOLD:
        current_state = "critical"
    elif anomaly_score is not None and anomaly_score >= 0.8:
        current_state = "anomaly"
    else:
        current_state = "safe"

    last_state = _alert_state.get(village_id, "safe")

    # Update state
    _alert_state[village_id] = current_state

    # Only alert on transitions INTO a danger state
    if current_state == "safe":
        return None

    if current_state == last_state:
        # Same danger state — no repeat alert (dedup)
        return None

    # State changed to a danger level → fire alert
    water_level = village.get("waterLevel", "N/A")
    district = village.get("district")
    
    # Try to fetch live officer data from the officers router
    try:
        from app.routers.officers import get_officer_for_district
        live_officer = get_officer_for_district(district) or {}
    except Exception:
        live_officer = {}

    payload = {
        "alertType": "groundwater_risk",
        "village": village.get("name"),
        "villageId": village_id,
        "district": district,
        "riskScore": risk_score,
        "anomalyScore": anomaly_score,
        "officer": live_officer.get("name") or village.get("officer"),
        "officerEmail": live_officer.get("email") or village.get("officerEmail"),
        "officerPhone": live_officer.get("phone") or village.get("officerPhone"),
        "waterLevel": water_level,
    }
    return await dispatch_alert(payload)
