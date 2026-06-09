from fastapi import APIRouter
from pydantic import BaseModel

from app.services.firebase import get_alerts, get_village
from app.services.n8n import check_and_alert, dispatch_alert

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertDispatchRequest(BaseModel):
    villageId: str
    riskScore: float | None = None
    anomalyScore: float | None = None


@router.get("")
def list_alerts():
    return get_alerts()


@router.post("/dispatch")
async def trigger_alert(req: AlertDispatchRequest):
    village = get_village(req.villageId)
    if not village:
        return {"error": "Village not found"}
    risk = req.riskScore if req.riskScore is not None else village.get("riskScore", 0)
    result = await check_and_alert(village, risk, req.anomalyScore)
    if result:
        return result
    return await dispatch_alert({
        "village": village.get("name"),
        "villageId": req.villageId,
        "district": village.get("district"),
        "riskScore": risk,
        "anomalyScore": req.anomalyScore,
        "officerEmail": village.get("officerEmail"),
    })
