"""Train ML models on synthetic historical groundwater data."""

from __future__ import annotations

import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from lightgbm import LGBMRegressor
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split

from app.data.mock_villages import VILLAGES


def _generate_history(village: dict, months: int = 24) -> pd.DataFrame:
    rng = np.random.default_rng(hash(village["id"]) % 2**31)
    base = village["waterLevel"] - village["trend6mo"] * 0.5
    rows = []
    for m in range(months):
        seasonal = 3 * np.sin(2 * np.pi * m / 12)
        trend = village["trend6mo"] * 0.02 * m
        noise = rng.normal(0, 1.5)
        level = base + trend + seasonal + noise
        rainfall = max(0, rng.normal(80 - m % 6 * 5, 25))
        temp = 28 + 6 * np.sin(2 * np.pi * (m - 3) / 12) + rng.normal(0, 1)
        rows.append({
            "village_id": village["id"],
            "month": m,
            "water_level": round(level, 2),
            "rainfall": round(rainfall, 1),
            "temperature": round(temp, 1),
            "season": m % 12 // 3,
            "trend_6mo": village["trend6mo"],
            "risk_score": village["riskScore"],
        })
    return pd.DataFrame(rows)


def train_all(models_dir: str = "models_artifacts") -> None:
    Path(models_dir).mkdir(parents=True, exist_ok=True)

    frames = [_generate_history(v) for v in VILLAGES]
    df = pd.concat(frames, ignore_index=True)

    # --- LightGBM forecasting ---
    feat_cols = ["month", "rainfall", "temperature", "season", "trend_6mo"]
    X = df[feat_cols]
    y = df["water_level"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    lgbm = LGBMRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42, verbose=-1)
    lgbm.fit(X_train, y_train)
    joblib.dump({"model": lgbm, "features": feat_cols}, os.path.join(models_dir, "forecast_lgbm.joblib"))

    # --- CatBoost risk classification ---
    def risk_label(score: float) -> int:
        if score >= 85:
            return 3  # over-exploited
        if score >= 75:
            return 2  # critical
        if score >= 50:
            return 1  # semi-critical
        return 0  # safe

    risk_df = df.groupby("village_id").last().reset_index()
    risk_df["label"] = risk_df["risk_score"].apply(risk_label)
    cat_features = ["season"]
    X_risk = risk_df[["water_level", "rainfall", "temperature", "season", "trend_6mo"]]
    y_risk = risk_df["label"]
    cat = CatBoostClassifier(iterations=80, depth=4, learning_rate=0.1, verbose=0, random_state=42)
    cat.fit(X_risk, y_risk, cat_features=cat_features)
    joblib.dump({"model": cat, "cat_features": cat_features}, os.path.join(models_dir, "risk_catboost.joblib"))

    # --- Isolation Forest anomaly detection ---
    anomaly_features = df[["water_level", "rainfall", "temperature", "trend_6mo"]].values
    iso = IsolationForest(contamination=0.08, random_state=42)
    iso.fit(anomaly_features)
    joblib.dump(iso, os.path.join(models_dir, "anomaly_isolation_forest.joblib"))

    print(f"Models saved to {models_dir}/")


if __name__ == "__main__":
    train_all()
