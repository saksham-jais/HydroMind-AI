"""
HydroMind AI Analysis Router
Multi-agent groundwater analysis using real CGWB datasets + Gemini 1.5 Flash
"""
from fastapi import APIRouter
from pydantic import BaseModel
from app.config import settings
from app.services.firebase import get_readings
from app.services.data_service import get_district_analysis, CGWB_2024_STATS, get_historical_summary, DS
from app.routers.districts_coords import DISTRICT_COORDS
import json
import re
import joblib
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta

router = APIRouter(tags=["analysis"])


class AnalysisResponse(BaseModel):
    reason: str
    prediction: str
    data: list
    deficit: str
    sensors: str
    rain_forecast: str
    category: str
    stage_pct: float
    data_sources: list[str]


# ── CGWB 2024 state-level policy knowledge ────────────────────────────
CGWB_POLICY_KNOWLEDGE = """
KEY FINDINGS — CGWB Dynamic Ground Water Resources of Gujarat, 2024:
- State total GW recharge: 27.58 BCM; Extraction: 13.86 BCM; Stage: 54.21% (SAFE overall)
- Over-Exploited districts (stage >100%): Banaskantha 119.81%, Patan 112.1%, Mahesana 109.67%, Gandhinagar 102.67%
- Semi-Critical (70-90%): Ahmedabad 73.63%, Sabarkantha 72.05%
- Irrigation = 92% of all GW extraction; 2,043,726 abstraction structures in Gujarat (2024)
- North Gujarat alluvial zone: phreatic aquifer nearly exhausted in Mahesana/Banaskantha; now extracting from confined aquifers B, C (100-300m depth)
- Mahesana: water table declined >40m since 1961; 42,572 irrigation wells; highest risk for aquifer collapse
- Banaskantha: 155,084 wells, extraction 141,568 HAM vs recharge 131,289 HAM — net DEFICIT of 10,279 HAM/year
- Patan: 21,571 wells, net availability only 465 HAM — critically overstressed
- GEC 2015 Methodology: category validated against 10-year water level trends
- Recommendations: enforce groundwater regulation in OE districts, promote micro-irrigation, artificial recharge via check dams
- River discharge data (2001-2025) shows Mahesana's Bhadar river: seasonal peak ~42.89 m3/s (Jul)
- Salinity intrusion risk in coastal Saurashtra (Jamnagar, Devbhumi Dwarka) due to over-extraction near coast
"""


def build_agentic_prompt(district: str, analysis: dict, live_iot: dict | None) -> str:
    """
    Build a structured multi-agent reasoning prompt for Gemini.
    The model acts as 3 specialized agents working in sequence.
    """
    iot_block = ""
    if live_iot:
        iot_block = f"""
LIVE IoT TELEMETRY (ESP32 Firebase, last reading):
- Water Level: {live_iot.get('waterLevel', 'N/A')} ft
- Tank Level: {live_iot.get('tankLevel', 'N/A')} cm
- Alert Status: {live_iot.get('alert', 'N/A')}
- Timestamp: {live_iot.get('timestamp', 'N/A')}
"""

    return f"""
You are HydroMind AI — a multi-agent groundwater analytics system for Gujarat, India.
You have 3 specialized sub-agents that MUST each contribute before you respond.

=== DISTRICT: {district.upper()} ===

REAL DATA INPUTS:
{analysis['ai_context']}

{iot_block}

CGWB 2024 POLICY KNOWLEDGE BASE:
{CGWB_POLICY_KNOWLEDGE}

AGENT WORKFLOW (execute in sequence):

[AGENT 1 — Root Cause Analyst]
Analyze the primary drivers of groundwater depletion using:
- The district's extraction stage % vs. safe threshold (70%)
- Historical 70-year depth trend (deepening = depletion, recovery = recharge surplus)
- Seasonal bounce (small bounce = poor monsoon recharge)
- Number of abstraction structures and irrigation dominance
- North Gujarat aquifer vulnerability if applicable

[AGENT 2 — Risk Predictor]  
Based on the current stage, decadal trend, and CGWB 2024 findings:
- Classify 30-day risk: LOW / MEDIUM / HIGH / CRITICAL
- Estimate days until shallow aquifer stress if current trend continues
- Factor in seasonal context (monsoon recharge window vs. peak extraction)

[AGENT 3 — Policy Recommender]
Refer to CGWB 2024 recommendations and provide:
- ONE specific, actionable intervention (e.g., borewell moratorium, micro-irrigation mandate, artificial recharge)
- Cite the relevant CGWB finding that supports this

OUTPUT FORMAT — reply ONLY with valid JSON, no markdown:
{{
  "reason": "2-3 sentences from Agent 1 identifying the root cause with real numbers from the data.",
  "prediction": "1-2 sentences from Agent 2 + Agent 3 giving risk level, timeline, and one specific recommendation."
}}
"""


@router.get("/analysis/district/{name}", response_model=AnalysisResponse)
async def analyze_district(name: str):
    # ── 1. Load real multi-source data ───────────────────────────────
    analysis = get_district_analysis(name)
    chart_data = analysis["chart_data"]

    data_sources = ["CGWB 2024 Official District Data"]
    if analysis.get("has_real_data"):
        data_sources.append("70-Year Quarterly GWL (1950-2020)")
    data_sources.append("CGWB GEC 2015 Methodology")
    data_sources.append("Gujarat Rainfall Normals (IMD)")

    # ── 2. Live IoT for Mehsana ───────────────────────────────────────
    live_iot = None
    if name.lower() in ("mehsana", "mahesana"):
        try:
            live_readings = get_readings("v1", limit=5)
            if live_readings:
                live_iot = live_readings[-1]
                data_sources.append("Live ESP32 IoT Telemetry (Firebase)")
                analysis["sensors"] = "142 Active (ESP32 Live)"
        except Exception:
            pass

    # ── 3. Agentic Gemini Analysis ────────────────────────────────────
    fallback_reason = (
        f"{name} district has a groundwater extraction stage of {analysis['stage_pct']:.1f}% "
        f"({analysis['category']} category per CGWB 2024). "
        f"The primary driver is intensive agricultural irrigation which accounts for 92% of Gujarat's "
        f"total GW extraction, with {analysis['sensors']} monitoring points tracking depletion trends."
    )
    fallback_prediction = (
        f"Based on CGWB 2024 data and historical trends, {name} faces "
        f"{'HIGH' if analysis['stage_pct'] > 90 else 'MEDIUM' if analysis['stage_pct'] > 70 else 'LOW'} risk "
        f"over the next 30 days. Recommend enforcing district-level extraction quotas and "
        f"promoting drip irrigation adoption to reduce agricultural GW demand by 20-30%."
    )

    reason = fallback_reason
    prediction = fallback_prediction

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.gemini_api_key,
            temperature=0.3,
        )
        prompt = build_agentic_prompt(name, analysis, live_iot)

        try:
            res = llm.invoke(prompt)
            content = res.content.strip()
            # Strip markdown fences if present
            match = re.search(r'```(?:json)?\s*(.*?)\s*```', content, re.DOTALL)
            if match:
                content = match.group(1)
            # Find JSON object
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                reason = parsed.get("reason", fallback_reason)
                prediction = parsed.get("prediction", fallback_prediction)
        except Exception as e:
            # Rate limit or parse error — use smart fallback
            pass

    except ImportError:
        pass  # langchain not available — use fallback

    return AnalysisResponse(
        reason=reason,
        prediction=prediction,
        data=chart_data,
        deficit=analysis["deficit"],
        sensors=analysis["sensors"],
        rain_forecast=analysis["rain_forecast"],
        category=analysis["category"],
        stage_pct=analysis["stage_pct"],
        data_sources=data_sources,
    )

@router.get("/analysis/districts/map")
async def get_map_data():
    """Return all districts with real CGWB extraction data for the heatmap."""
    map_data = []
    for d in DISTRICT_COORDS:
        name = d["name"]
        analysis = get_district_analysis(name)
        stage = analysis.get("stage_pct", 50)
        
        # Determine risk score based on stage
        # Stage < 70 = Safe (Score < 50)
        # Stage 70-90 = Semi-Critical (Score 50-70)
        # Stage 90-100 = Critical (Score 70-85)
        # Stage > 100 = Over-Exploited (Score 85-100)
        if stage > 100:
            risk = 90
        elif stage > 90:
            risk = 80
        elif stage > 70:
            risk = 60
        else:
            risk = 30
            
        map_data.append({
            "id": d["id"],
            "name": name,
            "district": name,
            "lat": d["lat"],
            "lng": d["lng"],
            "riskScore": risk,
            "stagePct": stage,
            "category": analysis.get("category", "Unknown"),
            "waterLevel": -get_historical_summary(name).get("avg_post2010", 10.0)
        })
    return map_data

@router.get("/analysis/districts/forecast-year")
async def get_all_districts_forecast_year(year: int = 2025):
    """Return ML-predicted depth & risk score for ALL districts at a given future year.
    Used to power the animated timeline map playback."""
    models, slopes, accuracy, reports = _load_forecast_data()
    
    ALIASES_REVERSE = {v: k for k, v in {
        "Mehsana": "Mahesana",
        "Dahod": "Dohad",
        "Chhotaudepur": "Chhota Udaipur",
        "Devbhumidwarka": "Devbhumi Dwarka",
    }.items()}
    
    CRISIS_THRESHOLD = 60.0
    result = []
    
    for d in DISTRICT_COORDS:
        name = d["name"]
        # Try exact match, then alias
        model_key = name
        if model_key not in models:
            # Try title case
            model_key = name.strip().title()
        if model_key not in models:
            # Try alias reverse lookup
            model_key = ALIASES_REVERSE.get(name, name)
        
        model_info = models.get(model_key)
        slope = slopes.get(model_key, 0)
        
        if model_info:
            predicted_depth = abs(_predict_year(model_info, year))
        else:
            # Fallback: use current avg + slope estimate
            current = abs(get_historical_summary(name).get("avg_post2010", 10.0))
            current_year = 2025
            predicted_depth = current + slope * (year - current_year)
        
        predicted_depth = max(0, predicted_depth)
        
        # Convert depth to risk score (0-100)
        # 0-10m = safe (30), 10-20m = semi-critical (55), 20-40m = critical (75), 40m+ = over-exploited (90+)
        if predicted_depth > 40:
            risk_score = min(100, 85 + (predicted_depth - 40) * 0.5)
            category = "Over-Exploited"
        elif predicted_depth > 20:
            risk_score = 70 + (predicted_depth - 20) * 0.75
            category = "Critical"
        elif predicted_depth > 10:
            risk_score = 50 + (predicted_depth - 10) * 2.0
            category = "Semi-Critical"
        else:
            risk_score = max(10, predicted_depth * 3)
            category = "Safe"
        
        result.append({
            "id": d["id"],
            "name": name,
            "lat": d["lat"],
            "lng": d["lng"],
            "predictedDepth_m": round(predicted_depth, 2),
            "riskScore": round(risk_score, 1),
            "category": category,
            "annualDeclineRate_m": round(slope, 3),
            "yearsToCrisis": round((CRISIS_THRESHOLD - predicted_depth) / slope, 1) if slope > 0 else 9999,
        })
    
    return result


@router.get("/analysis/state-trend")
async def get_state_trend(start_year: int = 1991, end_year: int = 2020):
    """Return statewide average GWL per month aggregated over a year range."""
    cache_file = DS / "state_trend_cache.json"
    if not cache_file.exists():
        # Fallback: Realistic synthetic seasonal data when CSV cache is missing (e.g. on Render)
        month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        
        # Base depth ~12m, with a seasonal curve: deepest in May/June, shallowest in Sept/Oct
        seasonal_pattern = {
            1: 0.5, 2: 1.0, 3: 1.8, 4: 2.5, 5: 3.5, 6: 3.8,
            7: 2.5, 8: 0.5, 9: -1.5, 10: -2.0, 11: -1.0, 12: 0.0
        }
        
        # Add a slight depletion trend based on the year range
        avg_year = (start_year + end_year) / 2
        depletion_offset = max(0, (avg_year - 1991) * 0.15)
        
        chart_data = []
        for m in range(1, 13):
            val = 12.0 + depletion_offset + seasonal_pattern[m]
            chart_data.append({
                "month": month_labels[m - 1],
                "level": -round(val, 2)
            })
        return chart_data
    with open(cache_file, "r") as f:
        data = json.load(f)
        
    # Aggregate by month across all years in range
    month_sums = {m: 0.0 for m in range(1, 13)}
    month_counts = {m: 0 for m in range(1, 13)}
    
    for yr_str, months in data.items():
        yr = int(yr_str)
        if start_year <= yr <= end_year:
            for mo_str, val in months.items():
                mo = int(mo_str)
                month_sums[mo] += val
                month_counts[mo] += 1
                
    month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    chart_data = []
    
    # Interpolate missing months (manual quarterly readings usually only happen 4 times a year)
    # We will build a continuous curve.
    known_points = {}
    for m in range(1, 13):
        if month_counts[m] > 0:
            known_points[m] = month_sums[m] / month_counts[m]
            
    if not known_points:
        return []
        
    # Fill missing with simple interpolation
    for m in range(1, 13):
        if m in known_points:
            val = known_points[m]
        else:
            # find closest before and after
            before = max([k for k in known_points.keys() if k < m] + [min(known_points.keys())])
            after = min([k for k in known_points.keys() if k > m] + [max(known_points.keys())])
            if before == after:
                val = known_points[before]
            else:
                # linear interp
                ratio = (m - before) / (after - before)
                val = known_points[before] + ratio * (known_points[after] - known_points[before])
                
        # Return negative values for "depth below ground" so the chart visualizes it correctly
        chart_data.append({
            "month": month_labels[m - 1],
            "level": -round(val, 2)
        })
        
    return chart_data

# Cache loaded models in memory so we only load once per server boot
_MODELS_CACHE = None
_SLOPES_CACHE = None
_ACCURACY_CACHE = None
_REPORTS_CACHE = None

def _load_forecast_data():
    global _MODELS_CACHE, _SLOPES_CACHE, _ACCURACY_CACHE, _REPORTS_CACHE
    if _MODELS_CACHE is None:
        # Artifacts live in backend/app/data/ (portable, git-tracked)
        models_path   = DS / "trained_best_models.joblib"
        slopes_path   = DS / "district_forecast_slopes.json"
        accuracy_path = DS / "district_forecast_accuracy.json"
        reports_path  = DS / "model_comparison_report.json"

        if models_path.exists():
            _MODELS_CACHE = joblib.load(models_path)
        else:
            # No model file yet — trigger an in-process training with fallback data
            import importlib, sys
            try:
                # backend is the cwd on Render, so train_models is importable
                import train_models
                train_models.train()
                if models_path.exists():
                    _MODELS_CACHE = joblib.load(models_path)
                else:
                    _MODELS_CACHE = {}
            except Exception as e:
                print(f"[analysis] Could not auto-train models: {e}")
                _MODELS_CACHE = {}

        _SLOPES_CACHE   = json.load(open(slopes_path))   if slopes_path.exists()   else {}
        _ACCURACY_CACHE = json.load(open(accuracy_path)) if accuracy_path.exists() else {}
        _REPORTS_CACHE  = json.load(open(reports_path))  if reports_path.exists()  else {}
    return _MODELS_CACHE, _SLOPES_CACHE, _ACCURACY_CACHE, _REPORTS_CACHE

def _predict_year(model_info, year: int) -> float:
    """Run prediction handling both year-only LR and full-feature ML models."""
    m = model_info["model"]
    ftype = model_info.get("features", "year_only")
    
    if ftype == "year_only":
        return float(m.predict([[year]])[0])
    else:
        # Full features: [year, month, sin_m, cos_m, season]
        import numpy as np
        # Predict at mid-year (June) for annual average
        mo = 6
        sin_m = np.sin(2 * np.pi * mo / 12)
        cos_m = np.cos(2 * np.pi * mo / 12)
        season = 1.0 # June is monsoon season
        X = np.array([[year, mo, sin_m, cos_m, season]])
        return float(m.predict(X)[0])

@router.get("/analysis/district-forecast/{name}")
async def get_district_forecast(name: str, cgwb_category: str = ""):
    """Use trained ML ensemble model to predict when a district will hit the crisis threshold."""
    models, slopes, accuracy, reports = _load_forecast_data()
    
    # Name alias map: frontend name -> CSV training name
    ALIASES = {
        "Mehsana": "Mahesana",
        "Dahod": "Dohad",
        "Chhotaudepur": "Chhota Udaipur",
        "Devbhumidwarka": "Devbhumi Dwarka",
    }
    
    district_key = name.strip().title()
    # Apply alias if needed
    district_key = ALIASES.get(district_key, district_key)
    
    model_info = models.get(district_key)
    slope = slopes.get(district_key)
    r2 = accuracy.get(district_key, 0.0)
    
    if model_info is None or slope is None:
        return {"error": f"No trained model for district: {district_key}", "available": list(models.keys())}
    
    CRISIS_THRESHOLD = 60.0
    
    current_year = datetime.now().year
    predicted_now = _predict_year(model_info, current_year)
    
    hist = get_historical_summary(district_key)
    real_avg = hist.get("avg_post2010", predicted_now)
    
    hist_years = list(range(1991, 2021))
    hist_levels = [round(_predict_year(model_info, y), 2) for y in hist_years]
    
    # --- Crisis Logic: Use CGWB official category as primary signal ---
    cgwb_cat_lower = cgwb_category.lower()
    is_officially_critical = cgwb_cat_lower in ("over-exploited", "critical")
    
    # Use absolute value for depth calculation (depths are stored as positive meters below ground)
    depth = abs(predicted_now)
    
    if is_officially_critical or slope > 0:
        # Use the higher of the two annual rates (official category vs ML slope)
        effective_slope = max(slope, 1.0) if is_officially_critical and slope <= 0 else slope
        distance = max(0, CRISIS_THRESHOLD - depth)
        if distance > 0:
            years_to_crisis = distance / effective_slope
            days_to_crisis = int(years_to_crisis * 365.25)
            crisis_date = (datetime.now() + timedelta(days=days_to_crisis)).strftime("%d %b %y")
        else:
            days_to_crisis = 0
            crisis_date = "Past Threshold"
    else:
        days_to_crisis = 99999
        crisis_date = "Stable"
    
    return {
        "district": district_key,
        "modelType": model_info.get("type", "LinearRegression"),
        "currentDepth_m": round(depth, 2),
        "realAvgDepth_m": round(real_avg, 2),
        "annualDeclineRate_m": round(slope, 3),
        "r2_accuracy": round(r2, 3),
        "daysToCrisis": days_to_crisis,
        "crisisDate": crisis_date,
        "crisisThreshold_m": CRISIS_THRESHOLD,
        "isInCrisis": is_officially_critical or (slope > 0 and days_to_crisis < 99999),
        "trend": [{"year": y, "level": l} for y, l in zip(hist_years, hist_levels)],
    }

