import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, X, Send, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/client";

interface Msg { role: "user" | "assistant"; text: string; source?: string }

const suggestions = [
  "Why is Mehsana critical?",
  "Which villages need inspection?",
  "Show highest risk zones.",
  "What actions should be taken?",
];

const canned: Record<string, string> = {
  "Why is Mehsana critical?": "Mehsana's groundwater has declined 18% in the last 6 months — the steepest in Gujarat. Current depth is 98 ft, projected to cross the 150 ft critical threshold within 143 days based on the LightGBM forecast.",
  "Which villages need inspection?": "Top inspection priority (composite risk ≥80%): Mehsana (92%), Bhuj (88%), Patan (84%), Palanpur (81%). Field officers have been notified via n8n.",
  "Show highest risk zones.": "Critical belt: Mehsana, Banaskantha, and Patan districts. Kutch trending warning. Ahmedabad rural pockets remain stable.",
  "What actions should be taken?": "1) Immediate borewell audit in Mehsana & Bhuj. 2) Rationing notice for Banaskantha. 3) Halt new commercial extraction permits across critical districts. 4) Schedule monsoon recharge structures.",
};

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Namaste. I'm HydroMind Assistant, grounded on Gujarat groundwater data. Ask me anything." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.chat(text);
      setMessages((m) => [...m, { role: "assistant", text: res.answer, source: res.source }]);
    } catch {
      const reply = canned[text] ?? "I'm running on mock data — start the FastAPI backend and set GEMINI_API_KEY for live RAG answers.";
      setMessages((m) => [...m, { role: "assistant", text: reply, source: "offline" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          size="icon"
          aria-label="Open HydroMind Assistant"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <div>
                <p className="text-sm font-semibold">HydroMind Assistant</p>
                <p className="text-[10px] opacity-80">Gemini · LangChain · ChromaDB</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/10" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground",
                )}>
                  {m.text}
                  {m.source && m.role === "assistant" && (
                    <p className="mt-1 text-[9px] uppercase tracking-wider opacity-50">{m.source}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
              </div>
            )}
            <div className="pt-2">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Suggested</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={loading}
                    className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-border bg-card p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a village, district, or risk..."
              disabled={loading}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
            />
            <Button type="submit" size="icon" className="h-9 w-9" disabled={loading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
