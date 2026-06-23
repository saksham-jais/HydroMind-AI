# HydroMind AI

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

**Predict. Alert. Prevent.**

AI-powered groundwater intelligence platform for Gujarat — combining IoT monitoring, ML forecasting, automated government alerts, and a RAG decision-support assistant.

## Architecture

```
ESP32 + HC-SR04 → Firebase / FastAPI → ML Models → Dashboard → n8n → Officials
                                                      ↓
                                              RAG Assistant (Gemini)
```

## Quick Start

### Frontend (Dashboard)

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

### Backend (FastAPI + ML)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env
python -m app.ml.train        # Train LightGBM, CatBoost, Isolation Forest
python run.py
```

API docs: http://localhost:8000/docs

### Connect Frontend to Backend

Set in `.env`:

```
VITE_API_URL=http://localhost:8000/api
```

The dashboard falls back to mock data if the API is offline.

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/villages` | All monitored villages |
| `GET /api/villages/totals` | State-wide KPIs |
| `GET /api/predictions/forecast/{id}` | LightGBM 30/90/180/365-day forecast |
| `GET /api/predictions/risk/{id}` | CatBoost risk classification |
| `GET /api/predictions/anomalies` | Isolation Forest anomaly scores |
| `GET /api/predictions/crisis/{id}` | Crisis countdown |
| `GET /api/alerts` | Active alerts |
| `POST /api/alerts/dispatch` | Trigger n8n alert |
| `POST /api/iot/reading` | Ingest ESP32 sensor data |
| `POST /api/chat` | RAG assistant query |

## ML Models

| Model | Algorithm | Purpose |
|---|---|---|
| Forecasting | LightGBM Regressor | 30/90/180/365-day water level prediction |
| Risk Classification | CatBoost Classifier | Safe / Semi-Critical / Critical / Over-Exploited |
| Anomaly Detection | Isolation Forest | Sudden drops, abnormal extraction |

Train models: `python -m app.ml.train`

## RAG Assistant

Set `GEMINI_API_KEY` in `backend/.env` to enable live RAG with Gemini + LangChain + ChromaDB. Without it, the assistant uses rule-based answers from the village dataset.

## n8n Automation

1. Import `n8n/hydromind-alert-workflow.json` into your n8n instance
2. Set `N8N_WEBHOOK_URL` in `backend/.env` to the webhook URL
3. Alerts auto-trigger when risk score ≥ 75% or anomaly score ≥ 0.8

## IoT (ESP32 + HC-SR04)

Firmware: `iot/hydromind_esp32/hydromind_esp32.ino`

1. Wire HC-SR04 to GPIO 5 (TRIG) and GPIO 18 (ECHO)
2. Connect traffic light LEDs to GPIO 25/26/27 and buzzer to GPIO 14
3. Update WiFi, Firebase, and API credentials in the sketch
4. Flash to ESP32 — readings post every 30 seconds

Hardware alert logic:
- **Green** — Safe (≤ 80 ft)
- **Yellow** — Warning (80–120 ft)
- **Red + Buzzer** — Critical (> 120 ft)

## Firebase (Optional)

1. Create a Firebase Realtime Database project
2. Download service account JSON → `backend/firebase-credentials.json`
3. Set in `backend/.env`:
   ```
   FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
   FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
   ```

## Deployment

| Component | Platform |
|---|---|
| Frontend | Vercel (`vercel.json`) |
| Backend | Render (`render.yaml`) |
| Database | Firebase Hosting / Realtime DB |

## Project Structure

```
├── src/                  # React dashboard (TanStack Start)
├── backend/              # FastAPI + ML + RAG
│   ├── app/
│   │   ├── ml/           # LightGBM, CatBoost, Isolation Forest
│   │   ├── routers/      # API routes
│   │   └── services/     # Firebase, n8n, RAG
├── iot/                  # ESP32 firmware
├── n8n/                  # Automation workflow
└── README.md
```

## Tech Stack

- **Frontend:** React, Tailwind CSS, Recharts, Leaflet
- **Backend:** FastAPI, LightGBM, CatBoost, Scikit-Learn
- **RAG:** LangChain, ChromaDB, Gemini
- **IoT:** ESP32, HC-SR04
- **Automation:** n8n
- **Database:** Firebase Realtime Database

## License

Hackathon project — Government of Gujarat Water Resources Dept.
