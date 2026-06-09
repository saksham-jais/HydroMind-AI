export type RiskLevel = "safe" | "warning" | "critical";

export interface Village {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  waterLevel: number; // ft below ground
  riskScore: number; // 0-100
  predictedCrisisDate: string; // ISO date
  trend6mo: number; // % decline
  officer: string;
  officerEmail: string;
  officerPhone: string;
}

export const villages: Village[] = [
  { id: "v1", name: "Mehsana", district: "Mehsana", lat: 23.5880, lng: 72.3693, waterLevel: 98, riskScore: 92, predictedCrisisDate: "2027-02-14", trend6mo: 18, officer: "Rajesh Sharma", officerEmail: "rajesh.sharma@gov.in", officerPhone: "918957488214" },
  { id: "v2", name: "Bhuj", district: "Kutch", lat: 23.2419, lng: 69.6669, waterLevel: 112, riskScore: 88, predictedCrisisDate: "2027-04-02", trend6mo: 16, officer: "Anita Patel", officerEmail: "anita.patel@gov.in", officerPhone: "918957488214" },
  { id: "v3", name: "Patan", district: "Patan", lat: 23.8493, lng: 72.1266, waterLevel: 89, riskScore: 84, predictedCrisisDate: "2027-05-18", trend6mo: 15, officer: "Vikram Desai", officerEmail: "vikram.desai@gov.in", officerPhone: "918957488214" },
  { id: "v4", name: "Palanpur", district: "Banaskantha", lat: 24.1722, lng: 72.4322, waterLevel: 95, riskScore: 81, predictedCrisisDate: "2027-06-12", trend6mo: 14, officer: "Suresh Joshi", officerEmail: "suresh.joshi@gov.in", officerPhone: "918957488214" },
  { id: "v5", name: "Deesa", district: "Banaskantha", lat: 24.2585, lng: 72.1925, waterLevel: 87, riskScore: 78, predictedCrisisDate: "2027-07-08", trend6mo: 13, officer: "Suresh Joshi", officerEmail: "suresh.joshi@gov.in", officerPhone: "918957488214" },
  { id: "v6", name: "Radhanpur", district: "Patan", lat: 23.8312, lng: 71.6047, waterLevel: 83, riskScore: 75, predictedCrisisDate: "2027-08-22", trend6mo: 12, officer: "Vikram Desai", officerEmail: "vikram.desai@gov.in", officerPhone: "918957488214" },
  { id: "v7", name: "Sami", district: "Patan", lat: 23.7220, lng: 71.7716, waterLevel: 76, riskScore: 70, predictedCrisisDate: "2027-09-30", trend6mo: 11, officer: "Vikram Desai", officerEmail: "vikram.desai@gov.in", officerPhone: "918957488214" },
  { id: "v8", name: "Visnagar", district: "Mehsana", lat: 23.6987, lng: 72.5462, waterLevel: 80, riskScore: 68, predictedCrisisDate: "2027-10-15", trend6mo: 10, officer: "Rajesh Sharma", officerEmail: "rajesh.sharma@gov.in", officerPhone: "918957488214" },
  { id: "v9", name: "Kadi", district: "Mehsana", lat: 23.3008, lng: 72.3320, waterLevel: 72, riskScore: 62, predictedCrisisDate: "2027-12-04", trend6mo: 9, officer: "Rajesh Sharma", officerEmail: "rajesh.sharma@gov.in", officerPhone: "918957488214" },
  { id: "v10", name: "Anjar", district: "Kutch", lat: 23.1226, lng: 70.0252, waterLevel: 68, riskScore: 58, predictedCrisisDate: "2028-01-20", trend6mo: 8, officer: "Anita Patel", officerEmail: "anita.patel@gov.in", officerPhone: "918957488214" },
  { id: "v11", name: "Gandhidham", district: "Kutch", lat: 23.0753, lng: 70.1337, waterLevel: 64, riskScore: 52, predictedCrisisDate: "2028-03-10", trend6mo: 7, officer: "Anita Patel", officerEmail: "anita.patel@gov.in", officerPhone: "918957488214" },
  { id: "v12", name: "Sanand", district: "Ahmedabad", lat: 22.9924, lng: 72.3812, waterLevel: 58, riskScore: 45, predictedCrisisDate: "2028-05-22", trend6mo: 6, officer: "Priya Mehta", officerEmail: "priya.mehta@gov.in", officerPhone: "918957488214" },
  { id: "v13", name: "Dholka", district: "Ahmedabad", lat: 22.7251, lng: 72.4424, waterLevel: 54, riskScore: 38, predictedCrisisDate: "2028-08-14", trend6mo: 5, officer: "Priya Mehta", officerEmail: "priya.mehta@gov.in", officerPhone: "918957488214" },
  { id: "v14", name: "Viramgam", district: "Ahmedabad", lat: 23.1230, lng: 72.0353, waterLevel: 49, riskScore: 32, predictedCrisisDate: "2029-01-05", trend6mo: 4, officer: "Priya Mehta", officerEmail: "priya.mehta@gov.in", officerPhone: "918957488214" },
  { id: "v15", name: "Bayad", district: "Aravalli", lat: 23.2275, lng: 73.2335, waterLevel: 42, riskScore: 24, predictedCrisisDate: "2029-06-18", trend6mo: 3, officer: "Mahesh Trivedi", officerEmail: "mahesh.trivedi@gov.in", officerPhone: "918957488214" },
];

export const totals = {
  villages: 120,
  avgWaterLevel: 98,
  highRisk: 14,
  activeAlerts: 6,
};

export function riskLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "warning";
  return "safe";
}

export const trendData = [
  { month: "Jan", level: 76 },
  { month: "Feb", level: 80 },
  { month: "Mar", level: 84 },
  { month: "Apr", level: 87 },
  { month: "May", level: 90 },
  { month: "Jun", level: 92 },
  { month: "Jul", level: 94 },
  { month: "Aug", level: 95 },
  { month: "Sep", level: 96 },
  { month: "Oct", level: 97 },
  { month: "Nov", level: 98 },
  { month: "Dec", level: 98 },
];

export const forecast = {
  current: 98,
  d30: 102,
  d90: 111,
  d180: 125,
  d365: 142,
  criticalLevel: 150,
};

export type RiskCategory = "safe" | "semi-critical" | "critical" | "over-exploited";

export function riskCategory(score: number): RiskCategory {
  if (score >= 85) return "over-exploited";
  if (score >= 75) return "critical";
  if (score >= 50) return "semi-critical";
  return "safe";
}

export interface Anomaly {
  id: string;
  villageId: string;
  village: string;
  district: string;
  score: number;
  type: "sudden_drop" | "abnormal_extraction" | "sensor_spike";
  description: string;
  date: string;
  flagged: boolean;
}

export const anomalies: Anomaly[] = [
  { id: "AN-001", villageId: "v1", village: "Mehsana", district: "Mehsana", score: 0.94, type: "sudden_drop", description: "Water level dropped 4.2 ft in 48 hours — 3× normal rate", date: "2026-06-07", flagged: true },
  { id: "AN-002", villageId: "v2", village: "Bhuj", district: "Kutch", score: 0.87, type: "abnormal_extraction", description: "Night-time extraction pattern detected outside permitted hours", date: "2026-06-06", flagged: true },
  { id: "AN-003", villageId: "v4", village: "Palanpur", district: "Banaskantha", score: 0.72, type: "sensor_spike", description: "HC-SR04 sensor reported erratic readings — possible borewell interference", date: "2026-06-05", flagged: false },
  { id: "AN-004", villageId: "v5", village: "Deesa", district: "Banaskantha", score: 0.68, type: "sudden_drop", description: "Accelerated depletion during non-monsoon period", date: "2026-06-04", flagged: false },
];

export interface Alert {
  id: string;
  villageId: string;
  village: string;
  district: string;
  risk: number;
  status: "sent" | "pending" | "ack";
  date: string;
}

export const alerts: Alert[] = [
  { id: "A-001", villageId: "v1", village: "Mehsana", district: "Mehsana", risk: 92, status: "sent", date: "2026-06-07" },
  { id: "A-002", villageId: "v2", village: "Bhuj", district: "Kutch", risk: 88, status: "sent", date: "2026-06-07" },
  { id: "A-003", villageId: "v3", village: "Patan", district: "Patan", risk: 84, status: "sent", date: "2026-06-06" },
  { id: "A-004", villageId: "v4", village: "Palanpur", district: "Banaskantha", risk: 81, status: "ack", date: "2026-06-05" },
  { id: "A-005", villageId: "v5", village: "Deesa", district: "Banaskantha", risk: 78, status: "pending", date: "2026-06-08" },
  { id: "A-006", villageId: "v6", village: "Radhanpur", district: "Patan", risk: 75, status: "pending", date: "2026-06-08" },
];

export const insights = [
  "Groundwater across Mehsana district declined 18% in the last 6 months — fastest depletion rate in the state.",
  "Banaskantha shows compounding stress: low monsoon recharge (-22%) combined with rising agricultural draw.",
  "Predicted critical depletion in Mehsana within 143 days. Recommend immediate inspection and borewell audit.",
  "Kutch belt (Bhuj, Anjar, Gandhidham) trending toward warning class — preemptive rationing advised.",
  "Ahmedabad rural pockets stable; Sanand at moderate risk due to industrial water demand.",
];

export const officers = [
  { name: "Rajesh Sharma", district: "Mehsana", email: "rajesh.sharma@gov.in", phone: "+91 89574 88214" },
  { name: "Anita Patel", district: "Kutch", email: "anita.patel@gov.in", phone: "+91 89574 88214" },
  { name: "Vikram Desai", district: "Patan", email: "vikram.desai@gov.in", phone: "+91 89574 88214" },
  { name: "Suresh Joshi", district: "Banaskantha", email: "suresh.joshi@gov.in", phone: "+91 89574 88214" },
  { name: "Priya Mehta", district: "Ahmedabad", email: "priya.mehta@gov.in", phone: "+91 89574 88214" },
  { name: "Mahesh Trivedi", district: "Aravalli", email: "mahesh.trivedi@gov.in", phone: "+91 89574 88214" },
];
