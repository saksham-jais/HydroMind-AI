"""
HydroMind AI — Region Contacts Router
Stores local contacts (name + phone) per district/region.
These contacts receive WhatsApp alerts alongside the assigned officer.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/contacts", tags=["contacts"])

# Persist contacts alongside other data files
_CONTACTS_FILE = Path(__file__).parent.parent / "data" / "region_contacts.json"


def _load() -> dict[str, list]:
    if _CONTACTS_FILE.exists():
        return json.loads(_CONTACTS_FILE.read_text(encoding="utf-8"))
    return {}


def _save(data: dict) -> None:
    _CONTACTS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


class Contact(BaseModel):
    name: str
    phone: str
    region: str
    note: Optional[str] = ""


class ContactOut(Contact):
    id: str


@router.get("/")
def list_contacts(region: str | None = None) -> list[ContactOut]:
    """Return all contacts, optionally filtered by region."""
    data = _load()
    results = []
    for reg, contacts in data.items():
        if region and reg.lower() != region.lower():
            continue
        for c in contacts:
            results.append(ContactOut(**c))
    return results


@router.get("/regions")
def list_regions() -> list[str]:
    """Return all regions that have contacts."""
    return sorted(_load().keys())


@router.post("/", status_code=201)
def add_contact(contact: Contact) -> ContactOut:
    """Add a new contact to a region."""
    data = _load()
    region = contact.region.strip().title()
    if region not in data:
        data[region] = []

    entry = {
        "id": str(uuid.uuid4()),
        "name": contact.name.strip(),
        "phone": contact.phone.strip(),
        "region": region,
        "note": contact.note or "",
    }
    data[region].append(entry)
    _save(data)
    return ContactOut(**entry)


@router.put("/{contact_id}")
def update_contact(contact_id: str, contact: Contact) -> ContactOut:
    """Update an existing contact."""
    data = _load()
    for region, contacts in data.items():
        for i, c in enumerate(contacts):
            if c["id"] == contact_id:
                updated = {
                    "id": contact_id,
                    "name": contact.name.strip(),
                    "phone": contact.phone.strip(),
                    "region": contact.region.strip().title(),
                    "note": contact.note or "",
                }
                if region != updated["region"]:
                    data[region].pop(i)
                    if not data[region]:
                        del data[region]
                    new_region = updated["region"]
                    if new_region not in data:
                        data[new_region] = []
                    data[new_region].append(updated)
                else:
                    data[region][i] = updated
                _save(data)
                return ContactOut(**updated)
    raise HTTPException(status_code=404, detail="Contact not found")


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: str):
    """Remove a contact."""
    data = _load()
    for region, contacts in data.items():
        for i, c in enumerate(contacts):
            if c["id"] == contact_id:
                data[region].pop(i)
                if not data[region]:
                    del data[region]
                _save(data)
                return
    raise HTTPException(status_code=404, detail="Contact not found")


def get_contacts_for_region(region: str) -> list[dict]:
    """Internal helper — used by the alert dispatcher to get all contacts for a district."""
    data = _load()
    if not region:
        return []
    
    r_lower = region.lower()
    for reg, contacts in data.items():
        if reg.lower() == r_lower:
            return contacts
            
    # Fuzzy match for Mehsana vs Mahesana
    if r_lower in ["mehsana", "mahesana"]:
        for reg, contacts in data.items():
            if reg.lower() in ["mehsana", "mahesana"]:
                return contacts
                
    return []
