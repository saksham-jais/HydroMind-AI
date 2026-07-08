import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import { villages, totals, forecast, anomalies, alerts, insights } from "@/lib/mock-data";

export function useVillages() {
  return useQuery({
    queryKey: ["villages"],
    queryFn: api.villages,
    placeholderData: villages,
    staleTime: 2000,
    retry: 1,
  });
}

export function useTotals() {
  return useQuery({
    queryKey: ["totals"],
    queryFn: api.totals,
    placeholderData: totals,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useForecast(villageId = "v1") {
  return useQuery({
    queryKey: ["forecast", villageId],
    queryFn: () => api.forecast(villageId),
    placeholderData: { ...forecast, villageId },
    staleTime: 60_000,
    retry: 1,
  });
}

export function useRisk(villageId = "v1") {
  return useQuery({
    queryKey: ["risk", villageId],
    queryFn: () => api.risk(villageId),
    placeholderData: { villageId, score: 87, category: "over-exploited", modelCategory: "over-exploited", confidence: 92 },
    staleTime: 60_000,
    retry: 1,
  });
}

export function useAnomalies() {
  return useQuery({
    queryKey: ["anomalies"],
    queryFn: api.anomalies,
    placeholderData: anomalies,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCrisis(villageId = "v1") {
  return useQuery({
    queryKey: ["crisis", villageId],
    queryFn: () => api.crisis(villageId),
    placeholderData: { villageId, village: "Mehsana", criticalLevel: 150, predictedDate: "2027-02-14", remainingDays: 143 },
    staleTime: 60_000,
    retry: 1,
  });
}

export function useInsights() {
  return useQuery({
    queryKey: ["insights"],
    queryFn: async () => (await api.insights()).insights,
    placeholderData: insights,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: api.alerts,
    placeholderData: alerts,
    staleTime: 30_000,
    retry: 1,
  });
}
