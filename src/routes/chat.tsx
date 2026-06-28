import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { MessageSquare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/chat")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Chat Assistant · Jalrakshak AI" },
      { name: "description", content: "RAG chatbot grounded on Gujarat groundwater data." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat Assistant</h1>
        <p className="text-sm text-muted-foreground">RAG over village dataset · Gemini · LangChain · ChromaDB</p>
      </div>
      <Card className="p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Jalrakshak Assistant is in the corner</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap the <MessageSquare className="inline h-4 w-4" /> button bottom-right to start a conversation. Connect Lovable AI Gateway to enable live answers.
        </p>
      </Card>
    </div>
  );
}
