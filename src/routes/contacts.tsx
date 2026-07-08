import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Phone, MapPin, Plus, Pencil, Trash2, Loader2, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api/client";

const API = API_BASE;

export const Route = createFileRoute("/contacts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Region Contacts · HydroMind AI" },
      { name: "description", content: "Manage local contacts per district who receive WhatsApp alerts." },
    ],
  }),
  component: ContactsPage,
});

// ── Types ──────────────────────────────────────────────────────────────
interface Contact {
  id: string;
  name: string;
  phone: string;
  region: string;
  note: string;
}

const DISTRICTS = [
  "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar",
  "Botad", "Chhotaudepur", "Dahod", "Dang", "Devbhumidwarka", "Gandhinagar", "Gir Somnath",
  "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahesana", "Mahisagar", "Morbi", "Narmada",
  "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat",
  "Surendranagar", "Tapi", "Vadodara", "Valsad",
];

const EMPTY: Omit<Contact, "id"> = { name: "", phone: "", region: DISTRICTS[0], note: "" };

// ── API hooks ──────────────────────────────────────────────────────────
function useContacts(region?: string) {
  return useQuery<Contact[]>({
    queryKey: ["contacts", region],
    queryFn: async () => {
      const url = region
        ? `${API}/contacts?region=${encodeURIComponent(region)}`
        : `${API}/contacts`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
}

// ── Contact Form Modal ─────────────────────────────────────────────────
function ContactModal({
  open, onClose, initial, onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Contact | null;
  onSave: (data: Omit<Contact, "id">) => Promise<void>;
}) {
  const [form, setForm] = useState<Omit<Contact, "id">>(
    initial ? { name: initial.name, phone: initial.phone, region: initial.region, note: initial.note } : EMPTY
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(
      initial
        ? { name: initial.name, phone: initial.phone, region: initial.region, note: initial.note }
        : EMPTY
    );
  }, [initial, open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.phone.trim()) { toast.error("Phone number is required"); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Contact" : "Add Local Contact"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Full Name *</label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Ramesh Patel" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">WhatsApp Phone *</label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91-98765-43210" />
            <p className="mt-1 text-[10px] text-muted-foreground">Include country code, e.g. +919876543210</p>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">District / Region *</label>
            <select
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Note (optional)</label>
            <Input value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g. Village head, Farmer cooperative lead" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initial ? "Save Changes" : "Add Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
function ContactsPage() {
  const qc = useQueryClient();
  const [filterRegion, setFilterRegion] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: contacts = [], isLoading } = useContacts(filterRegion || undefined);

  const refresh = () => qc.invalidateQueries({ queryKey: ["contacts"] });

  const handleSave = async (data: Omit<Contact, "id">) => {
    const url = editing ? `${API}/contacts/${editing.id}` : `${API}/contacts`;
    const method = editing ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (r.ok) {
      toast.success(editing ? "Contact updated!" : "Contact added!");
      refresh();
    } else {
      toast.error("Failed to save contact");
    }
  };

  const handleDelete = async (id: string) => {
    const r = await fetch(`${API}/contacts/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Contact removed"); refresh(); }
    else toast.error("Delete failed");
    setDeleteId(null);
  };

  // Group contacts by region for display
  const grouped = contacts.reduce<Record<string, Contact[]>>((acc, c) => {
    if (!acc[c.region]) acc[c.region] = [];
    acc[c.region].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Region Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Add local contacts per district — they receive WhatsApp alerts alongside the assigned officer when a crisis is detected.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add Contact
        </Button>
      </div>

      {/* How it works banner */}
      <Card className="border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">How WhatsApp broadcasting works</p>
            <p className="mt-0.5 text-muted-foreground">
              When the ESP32 sensor detects a critical groundwater level in a district, HydroMind AI automatically sends
              a WhatsApp alert to <strong>the assigned officer</strong> and to <strong>all local contacts</strong> listed here for that district.
              Add village heads, farmer cooperative leads, or any local stakeholders below.
            </p>
          </div>
        </div>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Districts ({contacts.length} contacts)</option>
          {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Contact Cards */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : contacts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16">
          <Users className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {filterRegion ? `No contacts in ${filterRegion} yet.` : "No contacts added yet."}
          </p>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} variant="outline" size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add First Contact
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([region, regionContacts]) => (
            <div key={region}>
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">{region}</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{regionContacts.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {regionContacts.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-primary/40">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=0ea5e9&color=fff&size=80`}
                      alt={c.name}
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-sm">{c.name}</p>
                      {c.note && <p className="truncate text-[10px] text-muted-foreground">{c.note}</p>}
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Phone className="h-3 w-3 text-primary shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                        onClick={() => { setEditing(c); setModalOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline"
                        className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ContactModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        initial={editing}
        onSave={handleSave}
      />

      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-4 w-4" /> Confirm Delete
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Remove this contact from the WhatsApp broadcast list?</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
