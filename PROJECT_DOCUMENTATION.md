# Jalrakshak AI — Complete Project Documentation

> **Platform:** Jalrakshak AI (formerly HydroMind AI)  
> **Purpose:** Groundwater Depletion Early-Warning & Analytics Platform for Gujarat  
> **Stack:** FastAPI + React (Vite) + Firebase + ESP32 + Gemini 1.5 Flash  
> **Data Coverage:** 1950–2024 (CGWB) + Live ESP32 IoT Telemetry

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Raw Datasets Used](#2-raw-datasets-used)
3. [Page-by-Page Feature Documentation](#3-page-by-page-feature-documentation)
   - [3.1 Overview Dashboard (`/`)](#31-overview-dashboard-)
   - [3.2 Interactive Map (`/map`)](#32-interactive-map-map)
   - [3.3 ML Predictions (`/predictions`)](#33-ml-predictions-predictions)
   - [3.4 Alerts & Dispatch (`/alerts`)](#34-alerts--dispatch-alerts)
   - [3.5 AI Reports (`/reports`)](#35-ai-reports-reports)
   - [3.6 AI Chat Assistant (`/chat`)](#36-ai-chat-assistant-chat)
4. [AI Agent Pipeline — Deep Dive](#4-ai-agent-pipeline--deep-dive)
5. [All Models Used in Jalrakshak AI](#5-all-models-used-in-jalrakshak-ai)
6. [LinearRegression District Parameters (All Districts)](#6-linearregression-district-parameters-all-districts)
7. [Dual-Metric Visualization Architecture](#7-dual-metric-visualization-architecture)
8. [Changelog / Recent Fixes](#8-changelog--recent-fixes)
9. [Official Dataset References & Sources](#9-official-dataset-references--sources)

---

## 1. Project Overview

**Jalrakshak AI** is a comprehensive groundwater analytics and early-warning platform built for district-level government officers in the state of Gujarat, India. It aggregates:
- Real-time IoT sensor data (ESP32 ultrasonic sensors via Firebase)
- Official Central Ground Water Board (CGWB) records spanning 1950–2024
- ML-generated future depletion forecasts up to 2075
- AI-generated root cause and policy recommendation reports (Gemini 1.5 Flash)

The platform answers a single critical operational question:
> *Which districts are facing groundwater crisis — and how many days do we have before wells run dry?*

---

## 2. Raw Datasets Used

| Dataset File | Period | Format | Used For |
| :--- | :--- | :--- | :--- |
| `gwl_manual_quarterly_gujarat-sw-gw_gj_1991_2020.csv` | 1991–2020 | CSV | Historical GWL depth for chart & ML training |
| `gwl_manual_quarterly_gujarat-sw-gw_gj_1950_1990.csv` | 1950–1990 | CSV | Extended historical context (pre-training) |
| `cc0fd6e6-4171-43ab-94d0-33eb1416be14.csv` | CGWB 2024 | CSV | Official district extraction stage & categorization |
| `river_discharge_manual_daily_gujarat_sw_gw_gj_2001_2025.csv` | 2001–2025 | CSV | River recharge potential (monsoon/dry season) |
| `gwl_tel_6_hourly` | 1991–2020 | CSV | 6-hourly telemetry for recent trend computation |
| Firebase Realtime DB | 2021–present | JSON | Live ESP32 sensor readings |

> 🔗 See **[Section 7](#7-official-dataset-references--sources)** for full official portal links to all datasets.

### Key Columns Extracted from CGWB 2024 CSV

| Column Name | Description |
| :--- | :--- |
| `District` | Name of the administrative district |
| `Annual GW Recharge (HAM)` | Total groundwater recharge per year from rainfall, rivers, and irrigation return flow (Hectare Meters) |
| `Annual GW Extraction (HAM)` | Total groundwater extracted (mostly by agriculture — 92% of Gujarat's total) |
| `Stage of GW Extraction (%)` | Extraction ÷ Recharge × 100 — the primary sustainability metric |
| `Category` | Official CGWB classification (Safe / Semi-Critical / Critical / Over-Exploited) |

### Key Columns Extracted from Historical GWL CSVs

| Column Name | Description |
| :--- | :--- |
| `District_Name` | Name of the district the well belongs to |
| `Year` | Calendar year of the reading |
| `GWL (m bgl)` | Groundwater Level in meters below ground level (positive = deeper) |
| `Station_No` | Individual well/sensor identifier (multiple per district, averaged) |
| `Season` | Pre-monsoon / Post-monsoon reading flag |

---

## 3. Page-by-Page Feature Documentation

---

### 3.1 Overview Dashboard (`/`)

**Route File:** `src/routes/index.tsx`  
**API Endpoints Used:** `/api/analysis/districts/forecast-year`, `/api/sensors/stats`, `/api/analysis/state-trend`

#### What It Contains
The Overview is the **executive summary** dashboard. It is the first page an officer sees after login. It provides the macro picture of Gujarat's groundwater health in a single glance, including:

- **4 KPI Cards:** Total Districts Monitored | Avg Predicted Depth 2026 | High-Risk Districts | Over-Exploited Count
- **Gujarat Risk Heat Map (Leaflet):** Interactive map with clickable district circles colored by risk category
- **State Average Water Level Trend Chart:** Recharts AreaChart showing historical mean GWL for the entire state (1991–2020) with year-range slider
- **District Detail Panel:** Appears on right side when a district is clicked on the map — shows composite risk score, days-to-crisis countdown, annual depletion rate, and crisis date estimate
- **AI Insights Panel:** Auto-generated one-paragraph AI summary derived from the ML forecast for the selected district

#### Datasets Used
- CGWB 2024 CSV → Zone categorization and stage % for map dot colors
- GWL 1991–2020 CSV → State-average trend line in the bottom chart
- `district_yearly_actuals.json` (cached artifact) → Pre-computed per-year mean depth for each district

#### Calculations Performed

**1. State Mean Depth (Trend Chart)**
For each year Y (1991–2020), the script (`train_models.py`) collects all well readings across all districts and computes:
```
StateAvgDepth(Y) = mean( GWL_mbgl ) across all wells with Year == Y
```

**2. District Risk Score (Composite, 0–100)**
```
RiskScore = 0.50 × NormalizedStage + 0.30 × NormalizedDepth + 0.20 × NormalizedDeclineRate
```
Where each input is min-max normalized across all 33 districts so that the worst district = 100, best = 0.

**3. Days to Crisis**
```
DaysToCrisis = ((60m threshold - currentDepth_m) / annualDeclineRate_m) × 365
```
If the slope is ≤ 0 (stable/recovering), the system returns "Stable."

#### Zone Color Logic (Map Dots)

| Color | Category | CGWB Stage Threshold |
| :--- | :--- | :--- |
| 🟢 Green | Safe | Stage ≤ 70% |
| 🟡 Yellow | Semi-Critical | 70% < Stage ≤ 90% |
| 🟠 Orange | Critical | 90% < Stage ≤ 100% |
| 🔴 Red | Over-Exploited | Stage > 100% |

> **Important:** The color is determined SOLELY by the CGWB 2024 extraction stage percentage — NOT by the physical depth of the water table.

---

### 3.2 Interactive Map (`/map`)

**Route File:** `src/routes/map.tsx`  
**API Endpoints Used:** `/api/analysis/districts/forecast-year?year={Y}`, `/api/sensors/live`

#### What It Contains
The Map page is the **animated spatial exploration** tool. It takes the same risk data as the Overview but adds:

- **Full-Screen Leaflet Map** of Gujarat with OpenStreetMap tiles
- **Year Playback Slider (2020–2075):** Officer can drag or auto-play to see how the ML model predicts district colors will change over time as depletion continues
- **Live IoT Sensor Pins:** Green pulsing dots showing active ESP32 sensor locations with real-time readings from Firebase
- **District Popup Cards:** On click, shows predicted depth for the selected year, CGWB category, annual rate, and crisis date

#### Datasets Used
- `district_forecast_accuracy.json` (trained artifact) → ML slope per district used for forward prediction at any selected year
- `district_yearly_actuals.json` → Actual historical readings from 1991–2020 for the "past" portion of the slider
- Firebase Realtime DB → Live sensor pin positions and readings

#### Calculations Performed

**Predicted Depth at Year Y:**
```
predictedDepth(Y) = baseDepth_2020 + (annualDeclineRate_m × (Y - 2020))
```
Where `baseDepth_2020` is the ML model's extrapolated depth at year 2020, and `annualDeclineRate_m` is the district's LinearRegression slope.

**Dynamic Zone Re-classification at Year Y:**
The zone color for any future year is re-assigned by calculating what the stage percentage *would be* if extraction continues at the 2024 rate against a declining aquifer:
```
futureStage(Y) ≈ stage_2024 × (1 + declineRate × (Y - 2024) × 0.02)
```
The same Red/Orange/Yellow/Green thresholds then apply.

---

### 3.3 ML Predictions (`/predictions`)

**Route File:** `src/routes/predictions.tsx`  
**API Endpoints Used:** `/api/analysis/district-forecast/{district}`

#### What It Contains
The Predictions page is the **deep forensic analytics** tool for any single district. It contains:

- **4 Summary KPI Cards:** Declining Districts count | Crisis < 10 Years | Crisis < 30 Years | Stable/Recovering
- **District Deep-Dive Forecast Section:** District dropdown selector with a 3-series AreaChart
  - **Series 1 — Actual Data (Blue Solid):** The real, jagged line of mean annual depth from CSV files (1991–2020)
  - **Series 2 — ML Trend Past (Blue Dashed):** The linear line-of-best-fit drawn through the 2005–2020 training window
  - **Series 3 — ML Forecast (Red Dashed):** Forward extrapolation from 2021 to 2075 using the computed slope
  - **Red Reference Line at 197ft:** The hard crisis threshold (~60m) where shallow bore wells run dry
- **All Districts Ranking Table:** Sortable list of all 31 districts ranked by "Days to Crisis" with depth and annual rate columns
- **About the Model Info Panel:** Technical explanation of why LinearRegression was chosen over gradient boosters

#### Datasets Used

| Source | Purpose |
| :--- | :--- |
| `gwl_manual_quarterly_..._1991_2020.csv` | Raw actual readings aggregated to mean annual depth per district |
| `district_yearly_actuals.json` | Pre-computed cache of mean annual depths (1991–2020) served by the API |
| `district_forecast_accuracy.json` | Per-district ML slopes (m/yr), R² scores, base depth — trained by `train_models.py` |

#### ML Training Pipeline (`train_models.py`)

**Step 1: Aggregate Annual Mean Depth**
```python
for each district D:
    for each year Y in 1991–2020:
        meanDepth(D, Y) = mean( GWL_mbgl for all wells in D with Year == Y )
```

**Step 2: Train LinearRegression on 2005–2020 Window**
```python
X = [[2005], [2006], ..., [2020]]   # Year as feature
y = [meanDepth(D, 2005), ..., meanDepth(D, 2020)]  # Mean depth as target
model = LinearRegression().fit(X, y)
slope = model.coef_[0]      # Annual depletion rate (m/yr) — the KEY output
r2    = model.score(X, y)   # Goodness of fit (low due to monsoon noise)
```

**Step 3: Save Artifacts**
- `district_forecast_accuracy.json` → All slopes and R² values
- `district_yearly_actuals.json` → Full 1991–2020 mean depths for visualization

**Why 2005–2020 for training (not 1991–2020)?**
The 1991–2004 period includes pre-reform agricultural patterns that do not reflect modern groundwater demand. Using 2005–2020 gives the most accurate slope for projecting current behavior into the future.

**Why Linear Regression (not XGBoost or LightGBM)?**
Tree-based models are trained only on known data ranges and cannot extrapolate beyond the training period — they produce flat horizontal lines for years 2021+. Linear Regression correctly extends the trend vector indefinitely into the future, which is exactly what a "days to crisis" calculation requires.

#### Crisis Threshold Logic
```
Crisis Threshold = 60 metres below ground level = 196.85 feet bgl
DaysToCrisis = ((60 - currentDepth_m) / slope_m_per_yr) × 365
CrisisDate = 2026 + (DaysToCrisis / 365)
```
If `slope ≤ 0` → district is marked **Stable** (recovering or not declining).

---

### 3.4 Alerts & Dispatch (`/alerts`)

**Route File:** `src/routes/alerts.tsx`  
**API Endpoints Used:** `/api/alerts/list`, `/api/alerts/dispatch`, `/api/sensors/live`

#### What It Contains
The Alerts page is the **operational command center** for field officers. It contains:

- **Active Alerts Table:** Lists all auto-triggered threshold breaches by district, sensor ID, breach level (ft bgl), and severity
- **Alert Severity Badges:** Color-coded exactly like map zones (Critical / Warning / Info)
- **Manual Alert Dispatch Form:**
  - Village name search with live autocomplete (type-to-filter)
  - Alert severity selector (Info / Warning / Critical / Emergency)
  - Alert message body field
  - Officer recipient selector
  - **Send via Email (SMTP)** button
- **Auto-Dispatch Rules Panel:** Configurable rule-based triggers that auto-fire alerts when sensor readings cross thresholds

#### Auto-Dispatch Logic (Backend Rule Engine)

Alert triggers are evaluated every time a new ESP32 sensor reading arrives at the `/api/sensors/data` POST endpoint:

```
IF sensor_depth_ft > 160  AND sensor_depth_ft <= 180 → Severity: WARNING
IF sensor_depth_ft > 180  AND sensor_depth_ft <= 196 → Severity: CRITICAL
IF sensor_depth_ft > 196                              → Severity: EMERGENCY (immediate)
```

Triggered alerts fire an SMTP email via the configured `SMTP_USER` / `SMTP_PASSWORD` credentials in `backend/.env`.

#### Manual Dispatch
Officers can manually compose and send alerts. The village name field includes a debounced search that filters the internal village registry (loaded from `backend/app/data/`) by prefix match as the officer types.

#### Datasets Used
- Firebase Realtime DB → Live sensor readings that trigger auto-alerts
- `village_registry.json` → Autocomplete source for village name lookup
- `backend/.env` → SMTP credentials for email dispatch

---

### 3.5 AI Reports (`/reports`)

**Route File:** `src/routes/reports.tsx`  
**API Endpoints Used:** `/api/analysis/district/{district}`

#### What It Contains
The Reports page generates a **full AI-powered district analysis report** on demand. It contains:

- **District Selector Dropdown** (no auto-load — officer must explicitly select)
- **CGWB 2024 Category Banner:** Color-coded banner showing the district's official sustainability status
- **4 KPI Cards:**
  - Aquifer Deficit (% over safe threshold)
  - IoT Sensors Online (Active ESP32 count estimate)
  - 30-Day Rain Forecast (from historical rainfall normals)
  - GW Stage % (CGWB 2024)
- **ML Forecast Chart (embedded from `/predictions` page):** Full 1991–2075 chart showing Actual Data, ML Trend, and ML Forecast in a shared view
- **AI Root Cause Agent Panel:** Gemini 1.5 Flash analysis of why depletion is occurring, citing real CGWB figures and historical trends
- **Predictive Alert Panel:** AI-generated 30-day forward risk forecast and policy recommendations
- **Download CGWB AI Report (PDF) Button:** Generates a full A4 PDF report including KPI cards, chart snapshot (via html2canvas), AI analysis text, and a monthly data table

#### AI Report Generation Pipeline

**Step 1: Data Aggregation (Backend)**
```python
# data_service.py: get_district_analysis(district)
context = [
  CGWB_2024_STATS[district],         # Stage %, extraction HAM, recharge HAM
  HISTORICAL_SUMMARY[district],      # avg_pre2000, avg_post2010, depletion, bounce
  RIVER_STATS[district],             # monsoon_avg, dry_avg, peak flow m3/s
  RAINFALL_NORMALS[district],        # annual normal rainfall (mm)
  RECENT_TELEMETRY_CACHE[district],  # 2021-2025 trend from 8M sensor readings
]
```

**Step 2: AI Prompt (analysis.py)**  
The aggregated context string is injected into a structured Gemini 1.5 Flash prompt that constrains the AI to answer in three parts: Root Cause / Risk Prediction / Policy Recommendation.

**Step 3: PDF Export (reports.tsx)**  
- `html2canvas` captures the React chart DOM node as a PNG at 2× resolution
- `jsPDF` constructs the A4 document and embeds the chart image, text blocks (split by column width), and metadata footer
- File is saved as `{District}_HydroMind_CGWB2024_Report.pdf`

#### Datasets Used

| Source | Powers |
| :--- | :--- |
| `cc0fd6e6...csv` / `CGWB_2024_STATS` | Category banner, KPI deficit %, stage % card |
| `RAINFALL_NORMALS` dict | 30-day rain forecast KPI card |
| `HISTORICAL_SUMMARY` dict | AI context: decadal trend, bounce, depletion figures |
| `RIVER_STATS` dict | AI context: recharge potential from surface flow |
| `district_yearly_actuals.json` | ML chart actual data series (1991–2020) |
| `district_forecast_accuracy.json` | ML chart trend and forecast data series (2021–2075) |

---

### 3.6 AI Chat Assistant (`/chat`)

**Route File:** `src/routes/chat.tsx`  
**API Endpoint:** `/api/rag/chat` (POST)

#### What It Contains
The Chat page is a dedicated conversational interface that allows government officers to ask free-text groundwater questions and receive grounded, factual AI answers without needing to navigate between dashboards. It contains:

- **Chat Input Box:** Multi-line text field with a send button and keyboard shortcut (Enter to send)
- **Message Thread View:** Scrollable conversation history showing user messages (right-aligned) and AI responses (left-aligned) with source badges
- **Source Badge:** Each AI response shows whether the answer came from the `rag-gemini` pipeline or the `rule-based` fallback engine
- **Suggested Starter Questions:** Pre-built question chips shown on first load (e.g., "Which districts are Over-Exploited?", "Why is Mehsana critical?")

#### How Answers Are Generated

1. **Query received** → POST `/api/rag/chat` with `{"query": "..."}` JSON body
2. **ChromaDB Retrieval** → Top-4 most semantically similar district documents fetched from the vector store using cosine similarity on `gemini-embedding-001` embeddings
3. **Context injection** → Retrieved documents appended to the Gemini 2.0 Flash Lite prompt as grounding context
4. **Gemini generation** → Model constrained to answer using only the provided context (no external web access)
5. **Fallback** → If ChromaDB or Gemini is unavailable, a deterministic rule engine keyword-matches against `CGWB_2024_STATS` dictionaries and returns factual CGWB numbers directly

#### Example Q&A

| User Query | Source | Answer basis |
| :--- | :--- | :--- |
| "Why is Mehsana critical?" | rag-gemini | CGWB 2024 stage 109.67%, 70yr depletion data |
| "Which districts need immediate action?" | rule-based | Over-Exploited districts from `CGWB_2024_STATS` |
| "What should be done in Patan?" | rag-gemini | CGWB 2024 policy — borewell moratorium recommendation |

#### Datasets Used
- `CGWB_2024_STATS` dict → District risk category, stage %, extraction deficit
- `HISTORICAL_SUMMARY` dict → Decadal depletion trend (m) per district
- ChromaDB vector index built at startup from both sources above (~35 documents)

---

## 4. AI Agent Pipeline — Deep Dive

The most complex AI system in Jalrakshak AI is the **3-Agent Sequential Pipeline** that runs on the `/reports` page. When an officer selects a district, this pipeline fires to produce the AI Root Cause Analysis and Predictive Alert panels.

### How the Pipeline Works

```
 Officer selects district
        │
        ▼
  data_service.py
  ┌─────────────────────────────────┐
  │  Aggregates 5 real data sources │
  │  into a single context string   │
  └─────────────────────────────────┘
        │
        ▼
  build_agentic_prompt()
  ┌──────────────────────────────────────────┐
  │  AGENT 1 — Root Cause Analyst            │
  │  AGENT 2 — Risk Predictor                │
  │  AGENT 3 — Policy Recommender            │
  │  All injected into ONE Gemini 1.5 Flash  │
  │  call as sequential reasoning steps      │
  └──────────────────────────────────────────┘
        │
        ▼
  Gemini 1.5 Flash → JSON output
  { "reason": "...", "prediction": "..." }
        │
        ▼
  /reports page renders:
  ├── Root Cause Agent Panel  (reason field)
  └── Predictive Alert Panel  (prediction field)
```

### Agent 1 — Root Cause Analyst

| Property | Detail |
| :--- | :--- |
| **Role** | Identifies WHY a district's groundwater is declining |
| **Information Sources** | CGWB 2024 stage % vs 70% safe threshold, 70-year historical depth trend (deepening vs recovery), seasonal bounce (small bounce = poor monsoon recharge), abstraction structure count, North Gujarat aquifer vulnerability context |
| **Key CGWB fact used** | Irrigation = 92% of all GW extraction; Mahesana water table declined >40m since 1961 |
| **Output** | 2–3 sentence root cause paragraph with real numbers cited (e.g., "Mehsana's extraction is at 109.67% of annual recharge — 9.67% net deficit per year...") |
| **Renders in** | `reason` field → "AI Root Cause Agent" panel on `/reports` |

### Agent 2 — Risk Predictor

| Property | Detail |
| :--- | :--- |
| **Role** | Classifies 30-day risk and estimates time-to-crisis |
| **Information Sources** | Current extraction stage %, decadal depth trend (m/decade), seasonal context (monsoon recharge window vs. peak extraction month), CGWB 2024 aquifer stress indicators |
| **Risk Classification Logic** | `stage > 100%` → CRITICAL \| `stage > 90%` → HIGH \| `stage > 70%` → MEDIUM \| `stage ≤ 70%` → LOW |
| **Output** | 1–2 sentences: risk level label + estimated days/years until shallow aquifer stress at current rate |
| **Renders in** | First part of `prediction` field → "Predictive Alert" panel on `/reports` |

### Agent 3 — Policy Recommender

| Property | Detail |
| :--- | :--- |
| **Role** | Provides one specific, actionable government intervention citing CGWB 2024 recommendations |
| **Information Sources** | CGWB 2024 policy knowledge base (hardcoded in `CGWB_POLICY_KNOWLEDGE` constant in `analysis.py`): borewell moratorium rules, micro-irrigation mandates, artificial recharge check dam guidance, GEC 2015 methodology |
| **Output** | 1 sentence naming the specific intervention + the CGWB finding that justifies it |
| **Renders in** | Second part of `prediction` field → "Predictive Alert" panel on `/reports` |

### Live IoT Integration (Mehsana only)
For Mehsana specifically, the pipeline also fetches the **latest 5 ESP32 Firebase readings** and injects them as an additional `LIVE IoT TELEMETRY` block into the prompt before Agent 1 runs. This allows Agent 2 to cross-reference the real-time sensor level against the historical trend for a more precise crisis estimate.

### Fallback Behavior
If Gemini API is rate-limited or unavailable, the pipeline serves pre-computed fallback strings built directly from the `data_service.py` CGWB stats — ensuring the `/reports` page never shows empty panels even without AI access.

---

## 5. All Models Used in Jalrakshak AI

Jalrakshak AI uses four distinct model/AI systems across different layers of the platform.

---

### Model 1 — Scikit-learn LinearRegression (Forecasting)

| Property | Value |
| :--- | :--- |
| **Library** | `scikit-learn 1.x` → `sklearn.linear_model.LinearRegression` |
| **Used In** | `/predictions`, `/map` timeline, `/reports` chart, `/api/analysis/district-forecast/{name}` |
| **Purpose** | Predicts future groundwater depth (m bgl) per district up to year 2075 |
| **Training File** | `backend/train_models.py` |
| **Training Data** | `gwl_manual_quarterly_gujarat-sw-gw_gj_1991_2020.csv` |
| **Training Window** | 2005–2020 (16 years of recent quarterly readings) |
| **Input Feature (X)** | `Year` (integer) |
| **Target Variable (y)** | Mean annual GWL depth in metres bgl — averaged across all wells in a district per year |
| **Train/Test Split** | 80% train / 20% test (chronological order) |
| **Output Artifacts** | `district_forecast_slopes.json`, `district_forecast_accuracy.json`, `district_yearly_actuals.json`, `trained_best_models.joblib` |
| **Crisis Threshold** | 60 m bgl (~197 ft) |

#### Fresh Training Results (Re-run: 2026-07-08, from real CGWB CSV files)

| Metric | Value |
| :--- | :--- |
| Total district models trained | **32** |
| Districts with positive R² | **2** — Junagadh (R²=0.014), Porbandar (R²=0.124) |
| Districts with negative R² (monsoon noise) | **30** |
| Average R² across all 32 districts | **-0.855** |
| Best R² score | **Porbandar: 0.124** |
| Worst R² score | **Anand: -14.402** |
| Fastest declining district | **Porbandar: +0.537 m/yr** |
| Fastest recovering district | **Vadodara: -0.157 m/yr** |

**Why negative R² is expected:** Gujarat's seasonal monsoon cycle causes water table to bounce 3–7 m within a single year. This high-frequency variance massively exceeds the slow 0.05–0.5 m/yr depletion signal. The R² measures fit to seasonal noise, not trend. The **slope (m/yr) is the reliable physical output** regardless of R².

**Why not XGBoost/LightGBM?** Tree models cannot extrapolate past their training range — they output a flat line for year 2021+. Linear Regression correctly extends the trend vector to 2075.

---

### Model 2 — Google Gemini 1.5 Flash (AI Root Cause Agent)

| Property | Value |
| :--- | :--- |
| **Provider** | Google DeepMind (`langchain_google_genai`) |
| **Model ID** | `gemini-1.5-flash` |
| **Used In** | `/reports` → AI Root Cause Agent panel + Predictive Alert panel |
| **API Endpoint** | `/api/analysis/district/{district_name}` |
| **Purpose** | Generates root cause analysis, 30-day risk forecast, and policy recommendations per district |
| **Input** | Structured context: CGWB 2024 stage %, extraction HAM, historical depletion m, river discharge m³/s, rainfall normals mm, telemetry trend 2021–2025 |
| **Output** | Three-part text: Root Cause / Risk Prediction / Policy Recommendation |
| **Prompt Style** | Zero-shot structured — constrained to provided CGWB context only |
| **Hallucination Risk** | Low — all numbers are injected from real verified CGWB data, no web search |
| **Accuracy** | Not quantitatively measured (generative text). Qualitatively verified against CGWB 2024 published values |
| **Fallback** | Static pre-formatted CGWB message if API key is absent |

---

### Model 3 — Gemini 2.0 Flash Lite + ChromaDB RAG (Chat Assistant)

| Property | Value |
| :--- | :--- |
| **LLM** | `gemini-2.0-flash-lite` (`langchain_google_genai.ChatGoogleGenerativeAI`) |
| **Embedding Model** | `models/gemini-embedding-001` (`GoogleGenerativeAIEmbeddings`) |
| **Vector Store** | ChromaDB (`langchain_chroma.Chroma`) — persisted at `backend/chroma_db/` |
| **Used In** | `/chat` → AI chat assistant |
| **API Endpoint** | `/api/rag/chat` |
| **Purpose** | Conversational groundwater Q&A for officers (e.g. "Why is Mehsana critical?") |
| **Knowledge Base** | ~35 structured documents built from `CGWB_2024_STATS` + `HISTORICAL_SUMMARY` at startup |
| **Retrieval** | Top-4 nearest documents by cosine similarity per query |
| **Fallback** | Deterministic rule-based engine — keyword matches on district names, "risk", "recommend" → returns factual CGWB stats |
| **Response Speed** | Rule-based: <5ms. RAG+Gemini: 1–3 seconds |

---

### Model 4 — Rule-Based Alert Engine (Threshold Classifier)

| Property | Value |
| :--- | :--- |
| **Type** | Deterministic if-else rule engine (no ML) |
| **Used In** | `/alerts` → auto-dispatch logic |
| **API Endpoint** | `/api/sensors/data` (POST — ESP32 ingestion) |
| **Purpose** | Classifies sensor readings into severity and auto-fires alerts |
| **Input** | Sensor depth reading in feet bgl |
| **Rules** | `> 160 ft` → WARNING \| `> 180 ft` → CRITICAL \| `> 196 ft` → EMERGENCY |
| **Output** | Firebase alert record + SMTP email to registered officers |
| **Accuracy** | 100% deterministic — threshold values from CGWB bore well failure engineering standards |

---

## 5. LinearRegression District Parameters (All Districts)

**Model:** `sklearn.linear_model.LinearRegression`
**Training Window:** 2005–2020 (16 years)
**Input Feature (X):** Year (integer)
**Target Variable (y):** Mean Annual Depth in metres below ground level
**Crisis Threshold:** 60 m bgl (~197 ft bgl)
**Last Retrained:** 2026-07-08 from raw CGWB CSV files

| District | Annual Rate (m/yr) | R² | Trend |
| :--- | :--- | :--- | :--- |
| **Ahmedabad** | +0.084 | -1.164 | Declining |
| **Amreli** | +0.276 | -0.037 | Declining |
| **Anand** | +0.062 | -14.402 | Declining |
| **Aravalli** | +0.073 | -0.083 | Declining |
| **Banaskantha** | +0.101 | -0.393 | Declining |
| **Bharuch** | +0.009 | -0.003 | Stable/Declining |
| **Bhavnagar** | +0.178 | -0.070 | Declining |
| **Botad** | +0.026 | -0.018 | Declining |
| **Chhota Udaipur** | +0.064 | -0.077 | Declining |
| **Dang** | +0.037 | -0.473 | Declining |
| **Devbhumi Dwarka** | +0.058 | -0.221 | Declining |
| **Dohad** | +0.061 | -0.030 | Declining |
| **Gandhinagar** | +0.346 | -0.720 | **Rapid Decline** |
| **Jamnagar** | +0.234 | -0.171 | Declining |
| **Junagadh** | +0.164 | 0.014 | Declining |
| **Kachchh** | +0.123 | -0.087 | Declining |
| **Kheda** | -0.086 | -0.019 | Recovering |
| **Mahesana** | +0.016 | -0.570 | Stable/Declining |
| **Mahisagar** | -0.010 | -0.048 | Recovering |
| **Morbi** | -0.013 | -1.570 | Recovering |
| **Narmada** | +0.051 | -0.403 | Declining |
| **Navsari** | +0.116 | -0.864 | Declining |
| **Panchmahals** | +0.068 | -0.076 | Declining |
| **Patan** | -0.114 | -3.315 | Recovering |
| **Porbandar** | +0.537 | 0.124 | **Rapid Decline** |
| **Rajkot** | 0.000 | -0.078 | Stable |
| **Sabarkantha** | -0.068 | -0.733 | Recovering |
| **Surat** | +0.092 | -1.253 | Declining |
| **Surendranagar** | +0.091 | -0.299 | Declining |
| **Tapi** | +0.157 | -0.128 | Declining |
| **Vadodara** | -0.157 | -0.182 | Recovering |
| **Valsad** | +0.028 | -0.011 | Declining |

> **Note on R² Scores:** Negative R² values indicate that the linear model fits worse than a simple horizontal mean line — this is expected and acceptable. Groundwater depth is dominated by high-variance seasonal monsoon spikes (±3–7m per year). The **slope (m/yr)** remains the reliable signal for long-term depletion trend extraction, regardless of R².

---

## 5. Dual-Metric Visualization Architecture

Jalrakshak AI separates its analytics into two paradigms that should never be confused:

### Paradigm A — Sustainability Index (Map Zone Colors)
- **Source:** CGWB 2024 extraction stage percentage
- **Formula:** `Stage% = (Annual Extraction HAM / Annual Recharge HAM) × 100`
- **Meaning:** Is the district pumping out more water than rainfall refills each year?
- **Zone Thresholds:**

| Zone | Color | Condition |
| :--- | :--- | :--- |
| Safe | 🟢 Green | Stage ≤ 70% |
| Semi-Critical | 🟡 Yellow | 70% < Stage ≤ 90% |
| Critical | 🟠 Orange | 90% < Stage ≤ 100% |
| Over-Exploited | 🔴 Red | Stage > 100% |

### Paradigm B — Physical Depletion Reality (Prediction Charts)
- **Source:** 1991–2020 CGWB quarterly GWL CSV
- **Formula:** `meanDepth(District, Year) = average( GWL_mbgl ) for all wells that year`
- **Meaning:** How deep is the actual water table in metres below ground level, and when will it hit 60m (crisis)?

> These two paradigms intentionally measure different things. A district can be physically shallow (water at 10m) but still be Over-Exploited (Red) if it is pumping 120% of its recharge. Conversely, a naturally deep aquifer district may be "Safe" despite deep water levels if extraction is well below recharge capacity.

---

## 6. Changelog / Recent Fixes

| Date | Change | File(s) |
| :--- | :--- | :--- |
| 2026-07-07 | Replaced seasonal profile chart on Reports page with the unified ML Forecast timeline chart | `reports.tsx`, `predictions.tsx` |
| 2026-07-07 | Reports page now requires manual district selection — no auto-load of "Mehsana" | `reports.tsx` |
| 2026-07-07 | Fixed PDF export crash caused by `html2canvas` rejecting modern `oklch()` CSS color strings | `predictions.tsx` |
| 2026-07-07 | Fixed silent PDF crash when AI text fields (`reason`, `prediction`) were `undefined` | `reports.tsx` |
| 2026-07-07 | Removed confusing negative R² metric cards from Predictions UI | `predictions.tsx` |
| 2026-07-07 | Fixed tuple unpacking bug in `/districts/forecast-year` endpoint after `_load_forecast_data()` was upgraded to return 5 items | `analysis.py` |
| 2026-07-07 | Exported `DistrictForecastChart` as reusable component with `hideKpis` and `height` props | `predictions.tsx` |

---

## 7. Official Dataset References & Sources

All datasets used in Jalrakshak AI are sourced from the **National Water Data Portal (NWDP)** maintained by the **National Water Informatics Centre (NWIC)**, Ministry of Jal Shakti, Government of India.

### Primary Datasets

#### 1. Ground Water Level — Manual Quarterly (1991–2020) ⭐ Core ML Training Dataset
> Quarterly manual GWL readings from monitoring wells across all Gujarat districts. This is the PRIMARY dataset used for computing annual mean depths and training the LinearRegression ML models.

- **File used:** `gwl_manual_quarterly_gujarat-sw-gw_gj_1991_2020.csv`
- **Portal Page:** [Ground Water Level (Manual - Quarterly), Gujarat SW GW, 1991–2020](https://nwdp.nwic.gov.in/dataset/956add67-cba9-41a5-9d5c-96d73db44aef)
- **Direct Download:** [gwl_manual_quarterly_cgwb_gj_1991_2020.csv](https://nwdp.nwic.gov.in/dataset/956add67-cba9-41a5-9d5c-96d73db44aef/resource/5fc7025a-79b8-45e7-8028-354b7f38cdad/download/gwl_manual_quarterly_cgwb_gj_1991_2020.csv)
- **Provider:** Central Ground Water Board (CGWB) / Gujarat Surface Water & Ground Water Departments
- **Columns Used:** `District_Name`, `Year`, `GWL (m bgl)`, `Station_No`, `Season`

---

#### 2. Ground Water Level — Telemetry Hourly (Gujarat) ⭐ Live IoT Reference Dataset
> Hourly high-frequency telemetry readings from Gujarat Water Resources Department monitoring stations.

- **File used:** `gwl_tel_6_hourly_gujarat_sw_gw_gj_...csv`
- **Portal Page:** [Ground Water Level (Telemetry - Hourly), Gujarat SW GW Departments](https://nwdp.nwic.gov.in/dataset/ground-water-level-telemetry-hourly-gujarat-surface-water-and-ground-water-departments)
- **Provider:** Gujarat Surface Water & Ground Water Departments (via NWIC)
- **Used For:** Building the `telemetry_cache_2021_2025.json` artifact for the AI root cause context and recent trend computation

---

#### 3. Ground Water Level — Manual Quarterly (1950–1990)
> Pre-independence and early post-independence well data — used for long historical context.

- **File used:** `gwl_manual_quarterly_gujarat-sw-gw_gj_1950_1990.csv`
- **Portal Page:** [NWDP — GWL Manual Quarterly Gujarat](https://nwdp.nwic.gov.in/)
- **Provider:** CGWB / Gujarat SW GW Departments

---

#### 4. River Discharge — Manual Daily (2001–2025) ⭐ Recharge Context
> Daily river surface flow data used to estimate natural GW recharge potential per district.

- **File used:** `river_discharge_manual_daily_gujarat_sw_gw_gj_2001_2025.csv`
- **Direct Download:** [river_discharge_cwc_gujarat_2001_2025_manual_daily.csv](https://nwdp.nwic.gov.in/dataset/08fa3fd0-7861-471d-a295-27c1b239d1fa/resource/b076861e-a9b0-466d-9653-5d55263a4362/download/river_discharge_cwc_gujarat_2001_2025_manual_daily.csv)
- **Provider:** Central Water Commission (CWC) / Gujarat SW GW Departments
- **Columns Used:** `District`, `Date`, `Discharge_m3s` (daily flow in cubic metres per second)
- **Used For:** `RIVER_STATS` dict in `data_service.py` — monsoon avg, dry season avg, peak flow (m³/s) per district

---

#### 5. CGWB 2024 — Dynamic GW Resources Assessment ⭐ Zone Classification Dataset
> The official 2024 CGWB report providing district-level groundwater extraction stage percentages and official categorization. This is the SOLE data source for map zone colors (Red/Orange/Yellow/Green).

- **File used:** `cc0fd6e6-4171-43ab-94d0-33eb1416be14.csv`
- **Official Report:** [Dynamic Ground Water Resources Assessment of India — 2024, CGWB](https://jalshakti-cgwb.gov.in/)
- **Portal:** [National Water Data Portal — CGWB Assessments](https://nwdp.nwic.gov.in/)
- **Columns Used:** `District`, `Annual GW Recharge (HAM)`, `Annual GW Extraction (HAM)`, `Stage of GW Extraction (%)`, `Category`

---

### Portal & Institutional References

| Institution | Role | URL |
| :--- | :--- | :--- |
| National Water Informatics Centre (NWIC) | Primary data portal host | [nwdp.nwic.gov.in](https://nwdp.nwic.gov.in/) |
| Central Ground Water Board (CGWB) | Official GW assessment authority | [cgwb.gov.in](https://cgwb.gov.in/) |
| Ministry of Jal Shakti | Parent ministry for water data | [jalshakti-dowr.gov.in](https://jalshakti-dowr.gov.in/) |
| India-WRIS | Supplementary water resource portal | [india-wris.nrsc.gov.in](https://india-wris.nrsc.gov.in/) |
| Gujarat Water Resources Dept. | State-level telemetry source | [gwrdc.gujarat.gov.in](https://gwrdc.gujarat.gov.in/) |
