"""Load trained models and run inference."""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.config import settings
from app.data.mock_villages import VILLAGES

LABEL_MAP = {0: "safe", 1: "semi-critical", 2: "critical", 3: "over-exploited"}


class Predictor:
    def __init__(self) -> None:
        self.models_dir = settings.models_dir
        self._lgbm = None
        self._lgbm_features: list[str] = []
        self._catboost = None
        self._cat_features: list[str] = []
        self._iso = None
        self._loaded = False

    def _ensure_models(self) -> None:
        if self._loaded:
            return
        models_path = Path(self.models_dir)
        forecast_path = models_path / "forecast_lgbm.joblib"
        if not forecast_path.exists():
            from app.ml.train import train_all
            train_all(self.models_dir)

        lgbm_data = joblib.load(models_path / "forecast_lgbm.joblib")
        self._lgbm = lgbm_data["model"]
        self._lgbm_features = lgbm_data["features"]

        cat_data = joblib.load(models_path / "risk_catboost.joblib")
        self._catboost = cat_data["model"]
        self._cat_features = cat_data["cat_features"]

        self._iso = joblib.load(models_path / "anomaly_isolation_forest.joblib")
        self._loaded = True

    def _village(self, village_id: str) -> dict:
        from app.services.firebase import get_villages
        villages = get_villages()
        for v in villages:
            if v["id"] == village_id:
                return v
        return villages[0]

    def forecast(self, village_id: str = "v1") -> dict:
        self._ensure_models()
        v = self._village(village_id)
        current = v["waterLevel"]
        base_month = 23
        horizons = {"d30": 1, "d90": 3, "d180": 6, "d365": 12}
        result: dict = {"current": current, "criticalLevel": 150, "villageId": village_id}

        for key, month_offset in horizons.items():
            month = base_month + month_offset
            seasonal = 3 * np.sin(2 * np.pi * month / 12)
            row = {
                "month": month,
                "rainfall": 65.0,
                "temperature": 32.0,
                "season": month % 12 // 3,
                "trend_6mo": v["trend6mo"],
            }
            X = pd.DataFrame([{f: row[f] for f in self._lgbm_features}])
            pred = float(self._lgbm.predict(X)[0])
            result[key] = round(max(current, pred + seasonal * 0.3), 1)

        return result

    def risk(self, village_id: str = "v1") -> dict:
        self._ensure_models()
        v = self._village(village_id)
        row = {
            "water_level": v["waterLevel"],
            "rainfall": 65.0,
            "temperature": 32.0,
            "season": datetime.now().month % 12 // 3,
            "trend_6mo": v["trend6mo"],
        }
        cols = ["water_level", "rainfall", "temperature", "season", "trend_6mo"]
        X = pd.DataFrame([{k: row[k] for k in cols}])
        pred = int(np.asarray(self._catboost.predict(X)).flat[0])
        proba = np.asarray(self._catboost.predict_proba(X)[0])
        confidence = round(float(max(proba)) * 100, 1)
        score = v["riskScore"]
        return {
            "villageId": village_id,
            "score": score,
            "category": LABEL_MAP.get(pred, "safe"),
            "modelCategory": LABEL_MAP.get(pred, "safe"),
            "confidence": confidence,
        }

    def anomalies(self, village_id: str | None = None) -> list[dict]:
        self._ensure_models()
        results = []
        from app.services.firebase import get_villages
        villages = [self._village(village_id)] if village_id else get_villages()[:6]

        types = ["sudden_drop", "abnormal_extraction", "sensor_spike"]
        descriptions = [
            "Water level dropped faster than seasonal norm",
            "Night-time extraction pattern detected",
            "HC-SR04 sensor reported erratic readings",
        ]

        for i, v in enumerate(villages):
            X = np.array([[v["waterLevel"], 65.0, 32.0, v["trend6mo"]]])
            score_raw = self._iso.decision_function(X)[0]
            anomaly_score = round(max(0, min(1, 0.5 - score_raw)), 2)
            flagged = anomaly_score >= 0.7 or v["riskScore"] >= 80
            results.append({
                "id": f"AN-{i+1:03d}",
                "villageId": v["id"],
                "village": v["name"],
                "district": v["district"],
                "score": anomaly_score,
                "type": types[i % 3],
                "description": descriptions[i % 3],
                "date": datetime.now().strftime("%Y-%m-%d"),
                "flagged": flagged,
            })
        return sorted(results, key=lambda x: x["score"], reverse=True)

    def crisis_countdown(self, village_id: str = "v1") -> dict:
        v = self._village(village_id)
        target = datetime.fromisoformat(v["predictedCrisisDate"])
        days = max(0, (target - datetime.now()).days)
        return {
            "villageId": village_id,
            "village": v["name"],
            "criticalLevel": 150,
            "predictedDate": v["predictedCrisisDate"],
            "remainingDays": days,
        }

    def insights(self) -> list[str]:
        from app.data.mock_villages import INSIGHTS
        return INSIGHTS


predictor = Predictor()
