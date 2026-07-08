from fastapi import APIRouter
from pydantic import BaseModel

from app.services.firebase import get_alerts, get_village
from app.services.n8n import check_and_alert, dispatch_alert

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertDispatchRequest(BaseModel):
    villageId: str
    riskScore: float | None = None
    anomalyScore: float | None = None
    officer: str | None = None
    officerEmail: str | None = None
    officerPhone: str | None = None
    waterLevel: float | str | None = None
    village: str | None = None


@router.get("")
def list_alerts():
    return get_alerts()


@router.post("/dispatch")
async def trigger_alert(req: AlertDispatchRequest):
    village = get_village(req.villageId) or {}
    
    # Merge frontend overrides with database data
    village_name = req.village or village.get("name")
    district = village.get("district", "Unknown")
    risk = req.riskScore if req.riskScore is not None else village.get("riskScore", 0)
    officer = req.officer or village.get("officer")
    email = req.officerEmail or village.get("officerEmail")
    phone = req.officerPhone or village.get("officerPhone")
    water = req.waterLevel if req.waterLevel is not None else village.get("waterLevel", "N/A")

    # If it's a known village, check state machine first
    if village.get("id"):
        result = await check_and_alert({
            **village,
            "waterLevel": water,
            "officer": officer,
            "officerEmail": email,
            "officerPhone": phone
        }, risk, req.anomalyScore)
        if result:
            return result

    # Manual dispatch fallback
    return await dispatch_alert({
        "alertType": "groundwater_risk",
        "village": village_name,
        "villageId": req.villageId,
        "district": district,
        "riskScore": risk,
        "anomalyScore": req.anomalyScore,
        "officer": officer,
        "officerEmail": email,
        "officerPhone": phone,
        "waterLevel": water,
    })
