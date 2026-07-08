"""
HydroMind AI — Officers CRUD Router
In-memory store (persists for server lifetime).
Supports full CRUD: list, add, update, delete.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

router = APIRouter(prefix="/officers", tags=["officers"])

import json
from pathlib import Path

# ── Persistent Store Setup ─────────────────────────────────────────────
_OFFICERS_FILE = Path(__file__).parent.parent / "data" / "officers.json"

_DEFAULT_OFFICERS = {
    "off-001": {
        "id": "off-001",
        "name": "Rajesh Sharma",
        "email": "sakshamjais100@gmail.com",
        "phone": "+91-98765-43210",
        "region": "North Gujarat",
        "districts": ["Mehsana", "Banaskantha", "Patan"],
        "role": "Senior District Water Officer",
        "imageUrl": "https://ui-avatars.com/api/?name=Rajesh+Sharma&background=0ea5e9&color=fff&size=128",
        "status": "active",
        "createdAt": "2024-01-15T10:00:00Z",
    },
    "off-002": {
        "id": "off-002",
        "name": "Priya Patel",
        "email": "priya.patel@gujarat.gov.in",
        "phone": "+91-98765-12345",
        "region": "Central Gujarat",
        "districts": ["Gandhinagar", "Ahmedabad", "Anand"],
        "role": "District Water Officer",
        "imageUrl": "https://ui-avatars.com/api/?name=Priya+Patel&background=8b5cf6&color=fff&size=128",
        "status": "active",
        "createdAt": "2024-02-01T10:00:00Z",
    },
    "off-003": {
        "id": "off-003",
        "name": "Amit Desai",
        "email": "amit.desai@gujarat.gov.in",
        "phone": "+91-99887-66554",
        "region": "Saurashtra",
        "districts": ["Rajkot", "Jamnagar", "Junagadh", "Porbandar"],
        "role": "Regional Water Resources Manager",
        "imageUrl": "https://ui-avatars.com/api/?name=Amit+Desai&background=f59e0b&color=fff&size=128",
        "status": "active",
        "createdAt": "2024-03-10T10:00:00Z",
    },
    "off-004": {
        "id": "off-004",
        "name": "Sunita Joshi",
        "email": "sunita.joshi@gujarat.gov.in",
        "phone": "+91-97654-32109",
        "region": "South Gujarat",
        "districts": ["Surat", "Valsad", "Navsari", "Bharuch"],
        "role": "District Water Officer",
        "imageUrl": "https://ui-avatars.com/api/?name=Sunita+Joshi&background=22c55e&color=fff&size=128",
        "status": "active",
        "createdAt": "2024-04-05T10:00:00Z",
    },
}

def _load_officers() -> dict[str, dict]:
    if _OFFICERS_FILE.exists():
        return json.loads(_OFFICERS_FILE.read_text(encoding="utf-8"))
    
    # Initialize with default seed data if no file exists
    _OFFICERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _save_officers(_DEFAULT_OFFICERS)
    return _DEFAULT_OFFICERS

def _save_officers(data: dict) -> None:
    _OFFICERS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")



class OfficerCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    region: Optional[str] = ""
    districts: Optional[list[str]] = []
    role: Optional[str] = "District Water Officer"
    imageUrl: Optional[str] = ""
    status: Optional[str] = "active"


class OfficerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    region: Optional[str] = None
    districts: Optional[list[str]] = None
    role: Optional[str] = None
    imageUrl: Optional[str] = None
    status: Optional[str] = None


@router.get("")
def list_officers():
    return list(_load_officers().values())


def get_officer_for_district(district: str) -> dict | None:
    """Helper: find the officer assigned to a specific district."""
    if not district:
        return None
    d_lower = district.lower()
    officers = _load_officers()
    for off in officers.values():
        if any(d.lower() == d_lower for d in off.get("districts", [])):
            return off
    # Fallback to fuzzy match (e.g., Mehsana vs Mehsana)
    if d_lower in ["mehsana", "Mehsana"]:
        for off in officers.values():
            if any(d.lower() in ["mehsana", "Mehsana"] for d in off.get("districts", [])):
                return off
    return None


@router.get("/{officer_id}")
def get_officer(officer_id: str):
    officers = _load_officers()
    off = officers.get(officer_id)
    if not off:
        raise HTTPException(404, f"Officer '{officer_id}' not found")
    return off


@router.post("", status_code=201)
def create_officer(body: OfficerCreate):
    officers = _load_officers()
    new_id = f"off-{uuid.uuid4().hex[:8]}"

    # Auto-generate avatar if no image provided
    image_url = body.imageUrl
    if not image_url:
        bg_colors = ["0ea5e9", "8b5cf6", "f59e0b", "22c55e", "ef4444", "ec4899"]
        color = bg_colors[len(officers) % len(bg_colors)]
        encoded_name = body.name.replace(" ", "+")
        image_url = f"https://ui-avatars.com/api/?name={encoded_name}&background={color}&color=fff&size=128"

    officer = {
        "id": new_id,
        "name": body.name,
        "email": body.email,
        "phone": body.phone or "",
        "region": body.region or "",
        "districts": body.districts or [],
        "role": body.role or "District Water Officer",
        "imageUrl": image_url,
        "status": body.status or "active",
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }
    officers[new_id] = officer
    _save_officers(officers)
    return officer


@router.put("/{officer_id}")
def update_officer(officer_id: str, body: OfficerUpdate):
    officers = _load_officers()
    off = officers.get(officer_id)
    if not off:
        raise HTTPException(404, f"Officer '{officer_id}' not found")

    updates = body.model_dump(exclude_none=True)
    off.update(updates)
    off["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    
    officers[officer_id] = off
    _save_officers(officers)
    return off


@router.delete("/{officer_id}")
def delete_officer(officer_id: str):
    officers = _load_officers()
    if officer_id not in officers:
        raise HTTPException(404, f"Officer '{officer_id}' not found")
    deleted = officers.pop(officer_id)
    _save_officers(officers)
    return {"deleted": True, "id": officer_id, "name": deleted["name"]}
