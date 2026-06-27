<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:05080d,50:0a1628,100:0ea5e9&height=180&section=header&text=HydroMind+AI&fontSize=64&fontColor=bae6fd&fontAlignY=40&desc=Groundwater+Intelligence+for+a+Thirsty+Gujarat&descSize=18&descAlignY=62&animation=fadeIn" />

<br/>

<a href="https://git.io/typing-svg"><img src="https://readme-typing-svg.demolab.com/?font=JetBrains+Mono&size=20&duration=2800&pause=900&color=38BDF8&center=true&vCenter=true&width=680&lines=Predict+depletion+before+the+borewell+runs+dry.;Alert+district+officers+before+a+crisis+erupts.;Turn+sensor+data+into+government+action.;Groundwater+intelligence%2C+built+for+Gujarat." alt="Typing SVG" /></a>

<br/>

<p>
  <img src="https://img.shields.io/badge/STATUS-LIVE-0ea5e9?style=for-the-badge&labelColor=05080d" />
  <img src="https://img.shields.io/badge/BUILD-PASSING-0ea5e9?style=for-the-badge&labelColor=05080d" />
  <img src="https://img.shields.io/badge/HACKAARAMBH-2026-0ea5e9?style=for-the-badge&labelColor=05080d" />
</p>

<p>
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/LightGBM-0ea5e9?style=flat-square" />
  <img src="https://img.shields.io/badge/CatBoost-yellow?style=flat-square" />
  <img src="https://img.shields.io/badge/Gemini-8B5CF6?style=flat-square&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/ESP32-E7352C?style=flat-square&logo=espressif&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square" />
</p>

<br/>

**[Dashboard Modules](#-dashboard-modules)** &nbsp;·&nbsp;
**[Architecture](#-architecture)** &nbsp;·&nbsp;
**[ML Models](#-ml-models)** &nbsp;·&nbsp;
**[Quick Start](#-quick-start)**

</div>

<br/>

---

## 🎯 Mission Brief

Over **120 villages** in Gujarat are depleting their aquifers faster than monsoon can replenish them. District officers get notified only when the borewell runs dry — too late to act.

**HydroMind AI** is a real-time groundwater intelligence platform that transforms raw IoT sensor data into **predictive, actionable decisions** for government officials. It answers the question that actually matters:

> *"Which villages will hit a water crisis first — and what should we do about it right now?"*

Built for **HackAarambh 2026**, it functions as a command-center decision tool powered by live ESP32 sensors, three production ML models, automated WhatsApp/email alerts, and a RAG AI assistant grounded on real village data.

<table>
<tr>
<td width="25%" align="center"><b>Monitor</b><br/><sub>Real-time IoT sensors in 120+ villages</sub></td>
<td width="25%" align="center"><b>Forecast</b><br/><sub>LightGBM 365-day water level predictions</sub></td>
<td width="25%" align="center"><b>Alert</b><br/><sub>Auto-dispatch via WhatsApp & email</sub></td>
<td width="25%" align="center"><b>Decide</b><br/><sub>RAG AI assistant grounded on live data</sub></td>
</tr>
</table>

---

## 🏗️ Architecture

```mermaid
flowchart TD
    classDef iot fill:#0e1620,stroke:#0ea5e9,stroke-width:2px,color:#bae6fd
    classDef ml fill:#0e1620,stroke:#8b5cf6,stroke-width:2px,color:#ede9fe
    classDef core fill:#06243a,stroke:#3b82f6,stroke-width:2px,color:#eff6ff
    classDef db fill:#0e1620,stroke:#f59e0b,stroke-width:2px,color:#fef3c7
    classDef ui fill:#0ea5e9,stroke:#0284c7,stroke-width:3px,color:#05080d
    classDef alert fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fca5a5

    subgraph IoT ["📡 IoT Layer"]
        A("🔌 ESP32 + HC-SR04\nUltrasonic Sensor"):::iot
        B[("🔥 Firebase\nRealtime DB")]:::db
    end

    subgraph Backend ["⚙️ Backend & ML"]
        C("⚡ FastAPI\nPython Backend"):::core
        D("🧠 LightGBM\nForecasting"):::ml
        E("📊 CatBoost\nRisk Classification"):::ml
        F("🔍 Isolation Forest\nAnomaly Detection"):::ml
        G("💬 RAG Assistant\nGemini + LangChain + ChromaDB"):::ml
    end

    subgraph Outputs ["🚨 Actions & Interface"]
        H("🖥️ React Dashboard\nTanStack + Recharts"):::ui
        I("📲 n8n Automation\nWhatsApp + Email Alerts"):::alert
        J("👮 District Officers\nGovernment Officials"):::alert
    end

    A -->|"sensor reading\nevery 30s"| B
    A -->|"POST /api/iot/reading"| C
    B -->|"sync villages"| C
    C --> D
    C --> E
    C --> F
    C --> G
    D & E & F & G --> H
    C -->|"risk ≥ 75%"| I
    I -->|"WhatsApp + Email"| J

    style IoT fill:transparent,stroke:#334155,stroke-width:2px,stroke-dasharray:5 5
    style Backend fill:transparent,stroke:#334155,stroke-width:2px,stroke-dasharray:5 5
    style Outputs fill:transparent,stroke:#334155,stroke-width:2px,stroke-dasharray:5 5
```

**Data flow:** ESP32 sensors push water-depth readings every 30 seconds to Firebase and the FastAPI backend. Three ML models run inference — LightGBM forecasts future depth, CatBoost classifies risk category, and Isolation Forest flags anomalies. The React dashboard consumes all outputs in real time. When risk crosses threshold, n8n fires WhatsApp + email alerts to named district officers.

---

## 🧠 Core Innovation — Composite Risk Score

Every village receives a **Composite Risk Score (0–100)** computed from live sensor data and ML inference:

```
Risk = f( water_level, depletion_trend_6mo, rainfall, temperature, season )
```

| Risk Category | Score | CatBoost Label | Dashboard State |
|---|---|---|---|
| ✅ Safe | 0–49 | `safe` | 🟢 Green |
| ⚠️ Semi-Critical | 50–74 | `semi-critical` | 🟡 Yellow |
| 🔴 Critical | 75–84 | `critical` | 🔴 Red |
| 💀 Over-Exploited | 85–100 | `over-exploited` | 🔴 Red + Alert dispatched |

*When a village crosses **75%**, n8n auto-triggers a WhatsApp message and email to the responsible district officer within seconds.*

---

## 🖥️ Dashboard Modules

| Module | Route | Function |
|---|---|---|
| 🗺️ **Overview** | `/` | State-wide KPIs, Gujarat heat map, LightGBM forecast panel, AI insights |
| 📍 **Risk Map** | `/map` | Spatial village risk map colour-coded by composite score |
| 📈 **Predictions** | `/predictions` | Per-village forecast + risk meter + crisis countdown |
| 🚨 **Alerts** | `/alerts` | Alert dispatch status, officer directory, n8n integration |
| 💬 **AI Chat** | `/chat` | RAG assistant (Gemini + ChromaDB) grounded on live village data |
| 📄 **Reports** | `/reports` | PDF generation — monthly, district, risk analysis, inspection reports |

---

## 📸 Screenshots

<div align="center">

<table>
<tr>
<td width="50%" align="center" valign="top">
<b>Overview Dashboard</b><br/><br/>
<img src="assets/Overview.png" width="100%"/>
</td>
<td width="50%" align="center" valign="top">
<b>Gujarat Risk Map</b><br/><br/>
<img src="assets/Map.png" width="100%"/>
</td>
</tr>
<tr>
<td width="50%" align="center" valign="top">
<b>AI Predictions & Forecasts</b><br/><br/>
<img src="assets/Prediction.png" width="100%"/>
</td>
<td width="50%" align="center" valign="top">
<b>Alerts & Dispatch</b><br/><br/>
<img src="assets/Alerts.png" width="100%"/>
</td>
</tr>
<tr>
<td width="50%" align="center" valign="top">
<b>RAG AI Assistant Chat</b><br/><br/>
<img src="assets/Chat%20Assistant.png" width="100%"/>
</td>
<td width="50%" align="center" valign="top">
<b>Automated Reports</b><br/><br/>
<img src="assets/Reports.png" width="100%"/>
</td>
</tr>
</table>

</div>

---

## 🤖 ML Models

| Model | Algorithm | Task | Output |
|---|---|---|---|
| **Forecasting** | LightGBM Regressor | Predict water depth at 30/90/180/365 days | Water level in ft |
| **Risk Classification** | CatBoost Classifier | Classify village risk category | `safe` / `semi-critical` / `critical` / `over-exploited` |
| **Anomaly Detection** | Isolation Forest | Flag sudden drops & abnormal extraction | Anomaly score 0–1 |

Train all three: `python -m app.ml.train` (auto-triggers on first backend start if models are missing)

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/villages` | All monitored villages with live data |
| `GET` | `/api/villages/totals` | State-wide KPI aggregates |
| `GET` | `/api/predictions/forecast/{id}` | LightGBM 30/90/180/365-day forecast |
| `GET` | `/api/predictions/risk/{id}` | CatBoost risk classification + confidence |
| `GET` | `/api/predictions/anomalies` | Isolation Forest anomaly scores |
| `GET` | `/api/predictions/crisis/{id}` | Days-to-crisis countdown |
| `GET` | `/api/alerts` | Active alert log |
| `POST` | `/api/alerts/dispatch` | Manually trigger n8n alert |
| `POST` | `/api/iot/reading` | Ingest live ESP32 sensor reading |
| `POST` | `/api/chat` | RAG assistant query → Gemini response |

Interactive docs: **http://localhost:8000/docs**

---

## 🛠️ Tech Stack

<div align="center">

<table>
<tr><th>Layer</th><th>Stack</th></tr>
<tr>
<td><b>Frontend</b></td>
<td>
<img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB"/>
<img src="https://img.shields.io/badge/TanStack_Router-FF4154?style=flat-square"/>
<img src="https://img.shields.io/badge/Recharts-22C55E?style=flat-square"/>
<img src="https://img.shields.io/badge/Leaflet-199900?style=flat-square&logo=leaflet&logoColor=white"/>
<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white"/>
</td>
</tr>
<tr>
<td><b>Backend</b></td>
<td>
<img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white"/>
<img src="https://img.shields.io/badge/Python_3.12-3776AB?style=flat-square&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/Pydantic-E92063?style=flat-square&logo=pydantic&logoColor=white"/>
</td>
</tr>
<tr>
<td><b>ML / AI</b></td>
<td>
<img src="https://img.shields.io/badge/LightGBM-0ea5e9?style=flat-square"/>
<img src="https://img.shields.io/badge/CatBoost-yellow?style=flat-square"/>
<img src="https://img.shields.io/badge/Scikit_Learn-F7931E?style=flat-square&logo=scikitlearn&logoColor=white"/>
<img src="https://img.shields.io/badge/Gemini-8B5CF6?style=flat-square&logo=google&logoColor=white"/>
<img src="https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square"/>
<img src="https://img.shields.io/badge/ChromaDB-FF6B35?style=flat-square"/>
</td>
</tr>
<tr>
<td><b>IoT</b></td>
<td>
<img src="https://img.shields.io/badge/ESP32-E7352C?style=flat-square&logo=espressif&logoColor=white"/>
<img src="https://img.shields.io/badge/HC--SR04-0ea5e9?style=flat-square"/>
<img src="https://img.shields.io/badge/Arduino-00979D?style=flat-square&logo=arduino&logoColor=white"/>
<img src="https://img.shields.io/badge/C++-00599C?style=flat-square&logo=c%2B%2B&logoColor=white"/>
</td>
</tr>
<tr>
<td><b>Infrastructure</b></td>
<td>
<img src="https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black"/>
<img src="https://img.shields.io/badge/n8n-EA4B71?style=flat-square&logo=n8n&logoColor=white"/>
<img src="https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white"/>
<img src="https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black"/>
</td>
</tr>
</table>

</div>

---

## ⚡ Quick Start

### 1. Frontend (React Dashboard)

```bash
npm install
cp .env.example .env        # set VITE_API_URL=http://localhost:8000/api
npm run dev
```

Open **http://localhost:5173** · Falls back to mock data if backend is offline.

### 2. Backend (FastAPI + ML)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
cp .env.example .env            # add GEMINI_API_KEY + Firebase creds
python run.py                   # models auto-train on first start
```

API docs: **http://localhost:8000/docs**

### 3. Enable AI Chat (RAG)

Add to `backend/.env`:

```env
GEMINI_API_KEY=your_key_from_aistudio.google.com
```

Restart backend — ChromaDB initialises automatically and chat switches from rule-based to `rag-gemini`.

### 4. WhatsApp / Email Alerts (n8n)

```bash
# 1. Import the workflow
n8n import:workflow --input=n8n/hydromind-alert-workflow.json

# 2. Set webhook URL in backend/.env
N8N_WEBHOOK_URL=https://your-n8n.app/webhook/hydromind-alerts
```

Alerts fire automatically when `riskScore ≥ 75%` or `anomalyScore ≥ 0.8`.

### 5. IoT (ESP32 + HC-SR04)

```
Firmware: iot/hydromind_esp32/hydromind_esp32.ino
```

1. Wire `HC-SR04` → GPIO 12 (TRIG) / 13 (ECHO)
2. LEDs → GPIO 25 (Red) / 26 (Green) / 27 (Yellow) · Buzzer → GPIO 14
3. Set `WIFI_SSID`, `WIFI_PASS`, `FIREBASE_AUTH`, `API_URL` in the sketch
4. Flash via Arduino IDE — sensor pushes readings every **30 seconds**

| LED State | Meaning |
|---|---|
| 🟢 Green | Safe (water level ≤ 80 ft) |
| 🟡 Yellow | Warning (80–120 ft) |
| 🔴 Red + Buzzer | Critical (> 120 ft) |

---

## 📂 Repository Structure

```
HydroMind-AI/
│
├── src/                          # React dashboard (TanStack Start)
│   ├── components/               # KPI cards, forecast panel, map, chatbot…
│   ├── routes/                   # index, map, predictions, alerts, chat, reports
│   └── lib/
│       ├── api/                  # API client + React Query hooks
│       └── mock-data.ts          # Offline fallback data
│
├── backend/                      # FastAPI + ML + RAG
│   └── app/
│       ├── ml/                   # LightGBM, CatBoost, Isolation Forest
│       ├── routers/              # /villages, /predictions, /alerts, /chat, /iot
│       └── services/             # Firebase, n8n dispatcher, RAG (Gemini)
│
├── iot/
│   └── hydromind_esp32/
│       └── hydromind_esp32.ino   # Arduino firmware
│
├── n8n/
│   └── hydromind-alert-workflow.json
│
├── render.yaml                   # Render deployment config
├── vercel.json                   # Vercel deployment config
└── README.md
```

---

## 🚀 Deployment

| Component | Platform | Config |
|---|---|---|
| Frontend | Vercel | `vercel.json` |
| Backend + ML | Render | `render.yaml` |
| Realtime DB | Firebase Realtime Database | `backend/.env` |

---

## ⚠️ Honest Limitations

- ML models are trained on **synthetic CGWB-style data** — production deployment requires real historical district records
- `gemini-2.0-flash-lite` free tier has daily quota limits; adding a billing account removes this restriction
- ESP32 demo covers **1 physical sensor node** — production would use LoRaWAN or GSM for remote villages
- Firebase sync is best-effort; sensor data older than 30s may lag in high-load conditions

<div align="center">

### Predict. Alert. Prevent. — Before the last borewell runs dry.

<br/>

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0ea5e9,50:0a1628,100:05080d&height=120&section=footer" />

<sub>Built for HackAarambh 2026 · Government of Gujarat Water Resources Dept.</sub>

</div>
