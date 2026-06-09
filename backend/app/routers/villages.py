from fastapi import APIRouter, HTTPException

from app.services.firebase import get_totals, get_village, get_villages

router = APIRouter(prefix="/villages", tags=["villages"])


@router.get("")
def list_villages():
    return get_villages()


@router.get("/totals")
def totals():
    return get_totals()


@router.get("/{village_id}")
def village_detail(village_id: str):
    v = get_village(village_id)
    if not v:
        raise HTTPException(404, "Village not found")
    return v
