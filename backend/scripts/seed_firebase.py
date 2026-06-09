"""
Seed Firebase Realtime Database with HydroMind village data.

Requires firebase-credentials.json in backend/ folder.

Usage:
  cd backend
  .venv\\Scripts\\python scripts/seed_firebase.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.data.mock_villages import ALERTS, VILLAGES


def main() -> None:
    if not settings.firebase_credentials_path or not settings.firebase_database_url:
        print("Set FIREBASE_CREDENTIALS_PATH and FIREBASE_DATABASE_URL in backend/.env")
        sys.exit(1)

    cred_path = Path(settings.firebase_credentials_path)
    if not cred_path.exists():
        print(f"Missing {cred_path}")
        print("Download from Firebase Console → Project Settings → Service Accounts → Generate new private key")
        sys.exit(1)

    import firebase_admin
    from firebase_admin import credentials, db

    if not firebase_admin._apps:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred, {"databaseURL": settings.firebase_database_url})

    villages_map = {v["id"]: v for v in VILLAGES}
    alerts_map = {a["id"]: a for a in ALERTS}

    db.reference("/villages").set(villages_map)
    db.reference("/alerts").set(alerts_map)
    db.reference("/meta").set({
        "project": "HydroMind AI",
        "region": "Gujarat",
        "seeded": True,
    })

    print(f"Seeded {len(VILLAGES)} villages and {len(ALERTS)} alerts to:")
    print(settings.firebase_database_url)


if __name__ == "__main__":
    main()
