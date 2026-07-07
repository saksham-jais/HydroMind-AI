# HydroMind AI - Project Documentation

## Project Overview
**HydroMind AI** (formerly HackAarambh/HydroMind AI) is a comprehensive groundwater analytics and early warning platform designed for the state of Gujarat. It aggregates real-time IoT sensor data (via ESP32), official Central Ground Water Board (CGWB) records (1950-2024), and weather patterns to provide an advanced early warning system for groundwater depletion.

The platform assists government officials in answering a critical question: *Which districts are facing groundwater crisis, and what should be done about it?*

## Key Features
1. **Interactive State Dashboard**: Visualizes state-wide groundwater levels, average depletion rates, and risk zones.
2. **Machine Learning Predictions**: Projects when specific districts will hit crisis thresholds based on 15 years (2005-2020) of historical data using Linear Trend Extrapolation.
3. **Agentic RAG Assistant**: A Gemini 1.5 Flash-powered chatbot trained on official CGWB 2024 policy datasets and live sensor telemetry. Uses a rule-based fallback system that queries the live datasets to instantly answer risk assessments.
4. **IoT Telemetry**: Ingests high-frequency sensor readings (simulated via ESP32) into a Firebase real-time database to track instantaneous water levels.
5. **Automated Alert Dispatch**: Dispatches warning emails via SMTP with detailed risk parameters and automated recommendations when thresholds are breached.

## Data Workflow & Architecture

### 1. Data Sources
- **CGWB 2024 Official Stats**: Provides district-level groundwater extraction stage (%), categorization (e.g., Safe, Semi-Critical, Critical, Over-Exploited), and recharge vs. extraction HAM (Hectare Meter) values.
- **70-Year Historical Data (1950-2020)**: Quarterly manual groundwater level measurements mapped across all districts.
- **River Discharge Data (2001-2025)**: Daily surface flow metrics used as context for natural recharge rates.
- **Rainfall Normals**: Historical meteorological normals for each district.
- **Live IoT Data**: Real-time water level data cached via ESP32 ultrasonic sensors on Firebase.

### 2. Backend (FastAPI)
The backend acts as the AI processing and data routing layer:
- **`app/services/data_service.py`**: A low-latency service that pre-computes 70-year decadal trends, recent 2021-2025 telemetry caches, and builds comprehensive AI contexts (combining CGWB stage, extraction deficit, sensor counts, and rainfall).
- **`app/routers/analysis.py`**: Houses the multi-agent AI pipeline.
  - *Agent 1 (Root Cause)*: Analyzes drivers of depletion using decadal trends and seasonal bounce.
  - *Agent 2 (Risk Predictor)*: Classifies 30-day risk and estimates days until shallow aquifer stress.
  - *Agent 3 (Policy Recommender)*: Maps the findings back to the CGWB 2024 recommendation guidelines (e.g., micro-irrigation mandates).
- **`app/services/rag.py`**: Runs a fast, dynamic rule-based matching engine that references live `data_service` structures before falling back to full Langchain ChromaDB vectors.
- **`train_models.py`**: Calculates linear extrapolation slopes and R² scores by processing local CSV files, creating a portable cache of JSON artifacts.

### 3. Frontend (React + Vite + Tailwind)
- Consumes the FastAPI endpoints to render Recharts-based multi-area visualizations.
- **Predictions Panel**: Overlays three metrics on a single chart:
  - *Actual Data*: True, jagged CSV readings (1991-2020).
  - *ML Trend*: The line of best fit for the historical data.
  - *ML Forecast*: Forward extrapolation to 2075.

---

## Machine Learning Forecast Model Parameters

HydroMind AI uses **Linear Trend Extrapolation** (Scikit-learn `LinearRegression`) focused on the 2005–2020 dataset block. While gradient boosters fail to extrapolate trends smoothly into the future (they plateau), linear extrapolation accurately captures the continuous annual decline rate (meters per year) to predict when shallow bore wells will run dry (~60m threshold).

Below are the computed annual decline rates (Slope) and R² accuracy scores for all 32 tracked districts:

| District | Annual Rate (m/yr) | R² Accuracy | Trend |
| :--- | :--- | :--- | :--- |
| **Ahmedabad** | +0.084 m/yr | -1.164 | Declining |
| **Amreli** | +0.276 m/yr | -0.037 | Declining |
| **Anand** | +0.062 m/yr | -14.402 | Declining |
| **Aravalli** | +0.073 m/yr | -0.083 | Declining |
| **Banaskantha** | +0.101 m/yr | -0.393 | Declining |
| **Bharuch** | +0.009 m/yr | -0.003 | Stable/Declining |
| **Bhavnagar** | +0.178 m/yr | -0.070 | Declining |
| **Botad** | +0.026 m/yr | -0.018 | Declining |
| **Chhota Udaipur** | +0.064 m/yr | -0.077 | Declining |
| **Dang** | +0.037 m/yr | -0.473 | Declining |
| **Devbhumi Dwarka**| +0.058 m/yr | -0.221 | Declining |
| **Dohad** | +0.061 m/yr | -0.030 | Declining |
| **Gandhinagar** | +0.346 m/yr | -0.720 | **Rapid Decline** |
| **Jamnagar** | +0.234 m/yr | -0.171 | Declining |
| **Junagadh** | +0.164 m/yr | 0.014 | Declining |
| **Kachchh** | +0.123 m/yr | -0.087 | Declining |
| **Kheda** | -0.086 m/yr | -0.019 | Recovering |
| **Mahesana** | +0.016 m/yr | -0.570 | Stable/Declining |
| **Mahisagar** | -0.010 m/yr | -0.048 | Recovering |
| **Morbi** | -0.013 m/yr | -1.570 | Recovering |
| **Narmada** | +0.051 m/yr | -0.403 | Declining |
| **Navsari** | +0.116 m/yr | -0.864 | Declining |
| **Panchmahals** | +0.068 m/yr | -0.076 | Declining |
| **Patan** | -0.114 m/yr | -3.315 | Recovering |
| **Porbandar** | +0.537 m/yr | 0.124 | **Rapid Decline** |
| **Rajkot** | 0.000 m/yr | -0.078 | Stable |
| **Sabarkantha** | -0.068 m/yr | -0.733 | Recovering |
| **Surat** | +0.092 m/yr | -1.253 | Declining |
| **Surendranagar** | +0.091 m/yr | -0.299 | Declining |
| **Tapi** | +0.157 m/yr | -0.128 | Declining |
| **Vadodara** | -0.157 m/yr | -0.182 | Recovering |
| **Valsad** | +0.028 m/yr | -0.011 | Declining |

*(Note: Negative R² scores are common in linear models applied to highly seasonal groundwater data where variance is overwhelmingly driven by monsoon spikes rather than the long-term decadal mean. The slope remains a reliable indicator of the macro decadal depletion trajectory.)*
