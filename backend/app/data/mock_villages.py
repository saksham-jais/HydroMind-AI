"""Seed data mirroring the frontend mock dataset."""

VILLAGES = [
    {"id": "v1", "name": "Mehsana", "district": "Mehsana", "lat": 23.5880, "lng": 72.3693, "waterLevel": 98, "riskScore": 92, "predictedCrisisDate": "2027-02-14", "trend6mo": 18, "officer": "Rajesh Sharma", "officerEmail": "rajesh.sharma@gov.in", "officerPhone": "918957488214"},
    {"id": "v2", "name": "Bhuj", "district": "Kutch", "lat": 23.2419, "lng": 69.6669, "waterLevel": 112, "riskScore": 88, "predictedCrisisDate": "2027-04-02", "trend6mo": 16, "officer": "Anita Patel", "officerEmail": "anita.patel@gov.in", "officerPhone": "918957488214"},
    {"id": "v3", "name": "Patan", "district": "Patan", "lat": 23.8493, "lng": 72.1266, "waterLevel": 89, "riskScore": 84, "predictedCrisisDate": "2027-05-18", "trend6mo": 15, "officer": "Vikram Desai", "officerEmail": "vikram.desai@gov.in", "officerPhone": "918957488214"},
    {"id": "v4", "name": "Palanpur", "district": "Banaskantha", "lat": 24.1722, "lng": 72.4322, "waterLevel": 95, "riskScore": 81, "predictedCrisisDate": "2027-06-12", "trend6mo": 14, "officer": "Suresh Joshi", "officerEmail": "suresh.joshi@gov.in", "officerPhone": "918957488214"},
    {"id": "v5", "name": "Deesa", "district": "Banaskantha", "lat": 24.2585, "lng": 72.1925, "waterLevel": 87, "riskScore": 78, "predictedCrisisDate": "2027-07-08", "trend6mo": 13, "officer": "Suresh Joshi", "officerEmail": "suresh.joshi@gov.in", "officerPhone": "918957488214"},
    {"id": "v6", "name": "Radhanpur", "district": "Patan", "lat": 23.8312, "lng": 71.6047, "waterLevel": 83, "riskScore": 75, "predictedCrisisDate": "2027-08-22", "trend6mo": 12, "officer": "Vikram Desai", "officerEmail": "vikram.desai@gov.in", "officerPhone": "918957488214"},
    {"id": "v7", "name": "Sami", "district": "Patan", "lat": 23.7220, "lng": 71.7716, "waterLevel": 76, "riskScore": 70, "predictedCrisisDate": "2027-09-30", "trend6mo": 11, "officer": "Vikram Desai", "officerEmail": "vikram.desai@gov.in", "officerPhone": "918957488214"},
    {"id": "v8", "name": "Visnagar", "district": "Mehsana", "lat": 23.6987, "lng": 72.5462, "waterLevel": 80, "riskScore": 68, "predictedCrisisDate": "2027-10-15", "trend6mo": 10, "officer": "Rajesh Sharma", "officerEmail": "rajesh.sharma@gov.in", "officerPhone": "918957488214"},
    {"id": "v9", "name": "Kadi", "district": "Mehsana", "lat": 23.3008, "lng": 72.3320, "waterLevel": 72, "riskScore": 62, "predictedCrisisDate": "2027-12-04", "trend6mo": 9, "officer": "Rajesh Sharma", "officerEmail": "rajesh.sharma@gov.in", "officerPhone": "918957488214"},
    {"id": "v10", "name": "Anjar", "district": "Kutch", "lat": 23.1226, "lng": 70.0252, "waterLevel": 68, "riskScore": 58, "predictedCrisisDate": "2028-01-20", "trend6mo": 8, "officer": "Anita Patel", "officerEmail": "anita.patel@gov.in", "officerPhone": "918957488214"},
    {"id": "v11", "name": "Gandhidham", "district": "Kutch", "lat": 23.0753, "lng": 70.1337, "waterLevel": 64, "riskScore": 52, "predictedCrisisDate": "2028-03-10", "trend6mo": 7, "officer": "Anita Patel", "officerEmail": "anita.patel@gov.in", "officerPhone": "918957488214"},
    {"id": "v12", "name": "Sanand", "district": "Ahmedabad", "lat": 22.9924, "lng": 72.3812, "waterLevel": 58, "riskScore": 45, "predictedCrisisDate": "2028-05-22", "trend6mo": 6, "officer": "Priya Mehta", "officerEmail": "priya.mehta@gov.in", "officerPhone": "918957488214"},
    {"id": "v13", "name": "Dholka", "district": "Ahmedabad", "lat": 22.7251, "lng": 72.4424, "waterLevel": 54, "riskScore": 38, "predictedCrisisDate": "2028-08-14", "trend6mo": 5, "officer": "Priya Mehta", "officerEmail": "priya.mehta@gov.in", "officerPhone": "918957488214"},
    {"id": "v14", "name": "Viramgam", "district": "Ahmedabad", "lat": 23.1230, "lng": 72.0353, "waterLevel": 49, "riskScore": 32, "predictedCrisisDate": "2029-01-05", "trend6mo": 4, "officer": "Priya Mehta", "officerEmail": "priya.mehta@gov.in", "officerPhone": "918957488214"},
    {"id": "v15", "name": "Bayad", "district": "Aravalli", "lat": 23.2275, "lng": 73.2335, "waterLevel": 42, "riskScore": 24, "predictedCrisisDate": "2029-06-18", "trend6mo": 3, "officer": "Mahesh Trivedi", "officerEmail": "mahesh.trivedi@gov.in", "officerPhone": "918957488214"},
]

ALERTS = [
    {"id": "A-001", "villageId": "v1", "village": "Mehsana", "district": "Mehsana", "risk": 92, "status": "sent", "date": "2026-06-07"},
    {"id": "A-002", "villageId": "v2", "village": "Bhuj", "district": "Kutch", "risk": 88, "status": "sent", "date": "2026-06-07"},
    {"id": "A-003", "villageId": "v3", "village": "Patan", "district": "Patan", "risk": 84, "status": "sent", "date": "2026-06-06"},
    {"id": "A-004", "villageId": "v4", "village": "Palanpur", "district": "Banaskantha", "risk": 81, "status": "ack", "date": "2026-06-05"},
    {"id": "A-005", "villageId": "v5", "village": "Deesa", "district": "Banaskantha", "risk": 78, "status": "pending", "date": "2026-06-08"},
    {"id": "A-006", "villageId": "v6", "village": "Radhanpur", "district": "Patan", "risk": 75, "status": "pending", "date": "2026-06-08"},
]

INSIGHTS = [
    "Groundwater across Mehsana district declined 18% in the last 6 months — fastest depletion rate in the state.",
    "Banaskantha shows compounding stress: low monsoon recharge (-22%) combined with rising agricultural draw.",
    "Predicted critical depletion in Mehsana within 143 days. Recommend immediate inspection and borewell audit.",
    "Kutch belt (Bhuj, Anjar, Gandhidham) trending toward warning class — preemptive rationing advised.",
    "Ahmedabad rural pockets stable; Sanand at moderate risk due to industrial water demand.",
]
