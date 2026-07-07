"""
HydroMind AI — Groundwater Forecasting Training Script
Uses Linear models (Ridge/LinearRegression) because Tree-based models (XGBoost/LightGBM) 
cannot extrapolate future trends (they produce flat lines for future years).
"""
import csv
import json
import joblib
import numpy as np
from pathlib import Path
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_squared_error, r2_score

DS = Path(r"D:\Mega\Hackathon\HackAarambh\HydroMind-AI\Datasets")
RECENT_FROM = 2005  # Focus on recent trend

def parse_date(date_s):
    try:
        if not date_s: return None
        parts = date_s.strip().split(" ")[0]
        if "-" in parts:
            segs = parts.split("-")
            if len(segs[0]) == 4: return int(segs[0]), int(segs[1])
            else: return int(segs[2]), int(segs[1])
        if "/" in parts:
            segs = parts.split("/")
            if len(segs[-1]) == 4: return int(segs[-1]), int(segs[1])
    except:
        pass
    return None

def train():
    print("=" * 60)
    print("HydroMind AI — Forecasting Pipeline (Trend Extrapolation)")
    print("=" * 60)

    # ---- Read CSVs ----
    files = [
        DS / "gwl_manual_quarterly_gujarat-sw-gw_gj_1950_1990.csv",
        DS / "gwl_manual_quarterly_gujarat-sw-gw_gj_1991_2020.csv",
    ]
    district_rows = {}

    for file in files:
        if not file.exists(): continue
        with open(file, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                district = row.get("District", "").strip().title()
                date_s   = row.get("Data Acquisition Time", "").strip()
                val_s    = row.get("Groundwater Level Quarterly Manual (meter)", "").strip()
                if not val_s: val_s = row.get("Level (m)", "").strip()
                if not val_s: val_s = row.get("Depth to water level (m bgl)", "").strip()

                parsed = parse_date(date_s)
                if district and parsed and val_s:
                    try:
                        val = float(val_s)
                        if not (-50 < val < 150): continue
                        yr, mo = parsed
                        if yr < RECENT_FROM: continue
                        if district not in district_rows:
                            district_rows[district] = []
                        district_rows[district].append((yr, mo, val))
                    except ValueError:
                        pass

    best_models    = {}
    slopes_out     = {}
    accuracy_out   = {}

    for dist, rows in district_rows.items():
        if len(rows) < 8: continue

        years  = np.array([r[0] for r in rows], dtype=float).reshape(-1, 1)
        levels = np.array([r[2] for r in rows], dtype=float)

        split = max(int(len(years) * 0.8), 6)
        X_tr, X_te = years[:split], years[split:]
        y_tr, y_te = levels[:split], levels[split:]

        # Train a simple Linear Regression to capture the long-term trend
        m = LinearRegression()
        m.fit(X_tr, y_tr)
        
        preds = m.predict(X_te)
        r2 = float(r2_score(y_te, preds)) if len(y_te) > 1 else 0.0

        # Retrain on full data for best slope
        m.fit(years, levels)
        slope = float(m.coef_[0])

        best_models[dist] = {"model": m, "type": "LinearRegression", "features": "year_only"}
        slopes_out[dist]  = round(slope, 3)
        accuracy_out[dist] = round(r2, 3)

    joblib.dump(best_models, DS / "trained_best_models.joblib")
    with open(DS / "district_forecast_slopes.json", "w") as f: json.dump(slopes_out, f)
    with open(DS / "district_forecast_accuracy.json", "w") as f: json.dump(accuracy_out, f)

    print(f"Successfully trained predictive trend models for {len(best_models)} districts.")
    print("Slopes and models saved. Please restart your backend.")

if __name__ == "__main__":
    train()
