import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle, Bell, CheckCircle2, Mail, Phone, MapPin,
  Plus, Pencil, Trash2, Send, User, Shield, Activity, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { API_BASE } from "@/lib/api/client";
const API = API_BASE;

export const Route = createFileRoute("/alerts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Alerts · HydroMind AI" },
      { name: "description", content: "Alert dispatch and officer directory management." },
    ],
  }),
  component: AlertsPage,
});

// ── Types ──────────────────────────────────────────────────────────────
interface Officer {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  districts: string[];
  role: string;
  imageUrl: string;
  status: string;
}

interface AlertLog {
  id?: string;
  village: string;
  district: string;
  riskScore: number;
  timestamp: string;
  status: string;
  channel?: string;
}

// ── Hooks ──────────────────────────────────────────────────────────────
function useOfficers() {
  return useQuery<Officer[]>({
    queryKey: ["officers"],
    queryFn: async () => {
      const r = await fetch(`${API}/officers`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
}

function useVillages() {
  return useQuery<any[]>({
    queryKey: ["villages"],
    queryFn: async () => {
      const r = await fetch(`${API}/villages`);
      if (!r.ok) return [];
      return r.json();
    },
  });
}

function useAlerts() {
  return useQuery<AlertLog[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const r = await fetch(`${API}/alerts`);
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
    refetchInterval: 30000,
  });
}

// ── Risk helpers ───────────────────────────────────────────────────────
function riskLabel(score: number) {
  if (score >= 85) return { label: "Over-Exploited", cls: "bg-red-500/20 text-red-400 border-red-500/30" };
  if (score >= 75) return { label: "Critical", cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
  if (score >= 50) return { label: "Semi-Critical", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
  return { label: "Safe", cls: "bg-green-500/20 text-green-400 border-green-500/30" };
}

function recommendedActions(score: number): string[] {
  if (score >= 85) return [
    "Immediately suspend new borewell permits",
    "Deploy emergency water tankers to affected villages",
    "Escalate to State Water Board for Emergency Order",
    "Schedule urgent field inspection within 48 hours",
    "Activate district-level Drought Management Protocol",
  ];
  if (score >= 75) return [
    "Schedule field inspection within 72 hours",
    "Audit existing borewell permits in the district",
    "Notify State Water Department and District Collector",
    "Issue advisory to farmers on reducing GW extraction",
    "Activate micro-irrigation subsidy applications",
  ];
  return [
    "Continue routine monitoring",
    "Review seasonal extraction patterns",
    "Prepare contingency irrigation plan",
  ];
}

// ── Manual Dispatch Panel ──────────────────────────────────────────────
function DispatchPanel({ officers }: { officers: Officer[] }) {
  const { data: villages = [] } = useVillages();
  const [villageSearch, setVillageSearch] = useState("");
  const [riskScore, setRiskScore] = useState(85);
  const [waterLevel, setWaterLevel] = useState(0.095866);
  const [officerId, setOfficerId] = useState(officers[0]?.id ?? "");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const selectedOfficer = officers.find((o) => o.id === officerId);
  const actions = recommendedActions(riskScore);
  const rl = riskLabel(riskScore);

  const dispatch = async () => {
    if (!villageSearch.trim()) {
      toast.error("Please select or enter a village name");
      return;
    }
    
    // Attempt to find village ID if they picked from the list, otherwise use a placeholder
    const matchedVillage = villages.find(v => v.name.toLowerCase() === villageSearch.toLowerCase());
    const finalVillageId = matchedVillage ? matchedVillage.id : "manual-entry";
    
    setLoading(true);
    try {
      const r = await fetch(`${API}/alerts/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId: finalVillageId,
          riskScore,
          anomalyScore: riskScore >= 80 ? 0.85 : null,
          officerEmail: selectedOfficer?.email,
          officer: selectedOfficer?.name,
          waterLevel,
          village: villageSearch,
        }),
      });
      const data = await r.json();
      setResult(data);
      if (data.dispatched) toast.success("Alert dispatched successfully!");
      else toast.info(data.message || "Alert logged (no channels configured)");
    } catch (e) {
      toast.error("Dispatch failed — check backend connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Send className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Manual Alert Dispatch</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Controls */}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Village Name</label>
            <Input 
              value={villageSearch} 
              onChange={(e) => setVillageSearch(e.target.value)} 
              placeholder="e.g. Mehsana" 
              list="village-list"
              autoComplete="off"
            />
            <datalist id="village-list">
              {villages.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Risk Score: <span className={`font-bold ${riskScore >= 75 ? "text-red-400" : "text-yellow-400"}`}>{riskScore}%</span>
            </label>
            <input
              type="range" min={0} max={100} value={riskScore}
              onChange={(e) => setRiskScore(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="mt-1">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${rl.cls}`}>{rl.label}</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Water Level (m bgl)</label>
            <Input
              type="number" step="0.001" value={waterLevel}
              onChange={(e) => setWaterLevel(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Notify Officer</label>
            <select
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {officers.map((o) => (
                <option key={o.id} value={o.id}>{o.name} — {o.region}</option>
              ))}
            </select>
            {selectedOfficer && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                <Mail className="inline h-3 w-3 mr-1" />{selectedOfficer.email}
              </p>
            )}
          </div>
          <Button onClick={dispatch} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Dispatching..." : "Dispatch Alert"}
          </Button>
        </div>

        {/* Alert Preview */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Alert Preview</p>
          <div className="space-y-2 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚨</span>
              <span className="font-bold text-foreground">HydroMind AI — Groundwater Alert</span>
            </div>
            <div className="mt-2 rounded-md bg-background/60 p-3 space-y-1.5">
              <p><span className="text-muted-foreground">📍 Village:</span> <strong>{villageSearch || "Unknown"}</strong></p>
              <p><span className="text-muted-foreground">⚠️ Risk Score:</span> <strong className={riskScore >= 75 ? "text-red-400" : "text-yellow-400"}>{riskScore}%</strong></p>
              <p><span className="text-muted-foreground">💧 Water Level:</span> <strong>{(waterLevel * 3.28084).toFixed(3)} ft bgl</strong></p>
              <p><span className="text-muted-foreground">👮 Officer:</span> <strong>{selectedOfficer?.name ?? "—"}</strong></p>
              <p><span className="text-muted-foreground">📧 Email:</span> <span className="text-primary">{selectedOfficer?.email ?? "—"}</span></p>
            </div>
            <div className="mt-2">
              <p className="font-semibold text-foreground mb-1">Recommended Actions:</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {actions.map((a, i) => <li key={i}>• {a}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Result */}
      {result && (
        <div className={`mt-4 rounded-lg border p-3 text-sm ${result.dispatched ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"}`}>
          {result.dispatched ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Alert dispatched! Channels: {Object.keys(result.channels || {}).join(", ")}</span>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{result.message || "Alert logged locally"}</p>
                <p className="mt-1 text-[11px] opacity-80">
                  To enable email: add <code className="bg-black/30 px-1 rounded">SMTP_USER</code> and <code className="bg-black/30 px-1 rounded">SMTP_PASSWORD</code> to <code className="bg-black/30 px-1 rounded">backend/.env</code>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Officer Form Modal ─────────────────────────────────────────────────
const EMPTY_FORM = { name: "", email: "", phone: "", region: "", districts: "", role: "District Water Officer", imageUrl: "", status: "active" };

function OfficerModal({
  open, onClose, initial, onSave,
}: { open: boolean; onClose: () => void; initial?: Officer | null; onSave: (data: any) => void }) {
  const [form, setForm] = useState(
    initial
      ? { ...initial, districts: initial.districts.join(", ") }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  // Re-populate form whenever the officer being edited changes
  useEffect(() => {
    if (initial) {
      setForm({ ...initial, districts: initial.districts.join(", ") });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [initial]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error("Name and Email are required"); return; }
    setSaving(true);
    await onSave({
      ...form,
      districts: form.districts.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Officer" : "Add New Officer"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {/* Avatar Preview */}
          {(form.imageUrl || form.name) && (
            <div className="flex items-center gap-3">
              <img
                src={form.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=0ea5e9&color=fff&size=80`}
                alt="avatar"
                className="h-14 w-14 rounded-full object-cover border border-border"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "?")}&background=0ea5e9&color=fff&size=80`; }}
              />
              <div>
                <p className="text-sm font-medium">{form.name || "Officer Name"}</p>
                <p className="text-[11px] text-muted-foreground">{form.role}</p>
              </div>
            </div>
          )}
          <Field label="Full Name *" value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. Rajesh Sharma" />
          <Field label="Email *" value={form.email} onChange={(v) => set("email", v)} placeholder="officer@gujarat.gov.in" type="email" />
          <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+91-98765-43210" />
          <Field label="Region" value={form.region} onChange={(v) => set("region", v)} placeholder="e.g. North Gujarat" />
          <Field label="Role" value={form.role} onChange={(v) => set("role", v)} placeholder="District Water Officer" />
          <Field label="Districts (comma-separated)" value={form.districts as string} onChange={(v) => set("districts", v)} placeholder="Mahesana, Banaskantha, Patan" />
          <Field label="Profile Image URL" value={form.imageUrl} onChange={(v) => set("imageUrl", v)} placeholder="Leave blank for auto-avatar" />
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initial ? "Save Changes" : "Add Officer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// ── Officer Directory ──────────────────────────────────────────────────
function OfficerDirectory() {
  const qc = useQueryClient();
  const { data: officers = [], isLoading } = useOfficers();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Officer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["officers"] });

  const handleSave = async (data: any) => {
    const url = editing ? `${API}/officers/${editing.id}` : `${API}/officers`;
    const method = editing ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (r.ok) {
      toast.success(editing ? "Officer updated!" : "Officer added!");
      refresh();
    } else {
      toast.error("Failed to save officer");
    }
  };

  const handleDelete = async (id: string) => {
    const r = await fetch(`${API}/officers/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Officer removed"); refresh(); }
    else toast.error("Delete failed");
    setDeleteId(null);
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Officer Directory</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{officers.length} officers</span>
        </div>
        <Button size="sm" className="gap-1" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add Officer
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {officers.map((o) => (
            <div key={o.id} className="relative rounded-lg border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-md">
              {/* Status dot */}
              <span className={`absolute right-3 top-3 h-2 w-2 rounded-full ${o.status === "active" ? "bg-green-400" : "bg-muted-foreground"}`} />

              <div className="flex items-start gap-3">
                <img
                  src={o.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(o.name)}&background=0ea5e9&color=fff&size=80`}
                  alt={o.name}
                  className="h-12 w-12 rounded-full object-cover border border-border shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(o.name)}&background=0ea5e9&color=fff&size=80`; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sm">{o.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{o.role}</p>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3 w-3 shrink-0 text-primary" />
                  <a href={`mailto:${o.email}`} className="truncate hover:text-primary">{o.email}</a>
                </div>
                {o.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0 text-primary" />
                    <span>{o.phone}</span>
                  </div>
                )}
                {o.region && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0 text-primary" />
                    <span>{o.region}</span>
                  </div>
                )}
              </div>

              {o.districts?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {o.districts.slice(0, 3).map((d) => (
                    <span key={d} className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">{d}</span>
                  ))}
                  {o.districts.length > 3 && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">+{o.districts.length - 3}</span>
                  )}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 text-[11px]"
                  onClick={() => { setEditing(o); setModalOpen(true); }}>
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 text-[11px] text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => setDeleteId(o.id)}>
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <OfficerModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        initial={editing}
        onSave={handleSave}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-4 w-4" /> Confirm Delete
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this officer from the directory? This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              Delete Officer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Recent Alerts Log ──────────────────────────────────────────────────
function AlertsLog() {
  const { data: alerts = [], isLoading } = useAlerts();

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Recent Alert Log</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">Auto-refreshes every 30s</span>
      </div>
      {isLoading ? (
        <div className="h-32 animate-pulse rounded bg-muted" />
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 opacity-20" />
          <p className="text-sm">No alerts yet — all districts nominal.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.map((a, i) => {
            const rl = riskLabel(a.riskScore);
            return (
              <div key={i} className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2 text-sm">
                <AlertTriangle className={`h-4 w-4 shrink-0 ${a.riskScore >= 75 ? "text-red-400" : "text-yellow-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{a.village} — {a.district}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${rl.cls}`}>{a.riskScore}%</span>
                <span className={`text-[10px] ${a.status === "dispatched" ? "text-green-400" : "text-muted-foreground"}`}>
                  {a.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}



// ── Main Page ──────────────────────────────────────────────────────────
function AlertsPage() {
  const { data: officers = [] } = useOfficers();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alerts & Dispatch</h1>
        <p className="text-sm text-muted-foreground">
          Manual alert dispatch · Officer directory management · Email + n8n integration
        </p>
      </div>

      <DispatchPanel officers={officers} />
      <AlertsLog />
      <OfficerDirectory />
    </div>
  );
}
