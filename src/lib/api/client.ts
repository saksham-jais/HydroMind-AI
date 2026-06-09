const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export interface Village {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  waterLevel: number;
  riskScore: number;
  predictedCrisisDate: string;
  trend6mo: number;
  officer: string;
  officerEmail: string;
  officerPhone: string;
}

export interface Totals {
  villages: number;
  avgWaterLevel: number;
  highRisk: number;
  activeAlerts: number;
}

export interface Forecast {
  current: number;
  d30: number;
  d90: number;
  d180: number;
  d365: number;
  criticalLevel: number;
  villageId: string;
}

export interface RiskResult {
  villageId: string;
  score: number;
  category: string;
  modelCategory: string;
  confidence: number;
}

export interface Anomaly {
  id: string;
  villageId: string;
  village: string;
  district: string;
  score: number;
  type: string;
  description: string;
  date: string;
  flagged: boolean;
}

export interface CrisisCountdown {
  villageId: string;
  village: string;
  criticalLevel: number;
  predictedDate: string;
  remainingDays: number;
}

export interface Alert {
  id: string;
  villageId: string;
  village: string;
  district: string;
  risk: number;
  status: string;
  date: string;
}

export interface ChatResponse {
  answer: string;
  source: string;
}

export const api = {
  health: () => fetchApi<{ status: string }>("/health"),
  villages: () => fetchApi<Village[]>("/villages"),
  totals: () => fetchApi<Totals>("/villages/totals"),
  village: (id: string) => fetchApi<Village>(`/villages/${id}`),
  forecast: (id = "v1") => fetchApi<Forecast>(`/predictions/forecast/${id}`),
  risk: (id = "v1") => fetchApi<RiskResult>(`/predictions/risk/${id}`),
  anomalies: () => fetchApi<Anomaly[]>("/predictions/anomalies"),
  crisis: (id = "v1") => fetchApi<CrisisCountdown>(`/predictions/crisis/${id}`),
  insights: () => fetchApi<{ insights: string[] }>("/predictions/insights"),
  alerts: () => fetchApi<Alert[]>("/alerts"),
  chat: (message: string) =>
    fetchApi<ChatResponse>("/chat", { method: "POST", body: JSON.stringify({ message }) }),
};

export async function isApiAvailable(): Promise<boolean> {
  try {
    await api.health();
    return true;
  } catch {
    return false;
  }
}
