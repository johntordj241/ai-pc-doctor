import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatDiagnose } from "@/lib/chat.functions";
import type { SystemSnapshot } from "@/lib/metrics";
import type { Analysis } from "@/lib/diagnose.functions";
import { MessageCircle, Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  snapshot: SystemSnapshot;
  analysis: Analysis | null;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Pourquoi mon CPU est-il élevé ?",
  "Que puis-je fermer en sécurité ?",
  "Est-ce dangereux pour mon matériel ?",
  "Comment améliorer les performances ?",
];

function getChatErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;

  if (typeof err === "string" && err.trim()) return err;

  if (typeof err === "object" && err !== null) {
    const candidate = err as {
      message?: unknown;
      data?: { message?: unknown };
      cause?: { message?: unknown };
    };
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message;
    }
    if (typeof candidate.data?.message === "string" && candidate.data.message.trim()) {
      return candidate.data.message;
    }
    if (typeof candidate.cause?.message === "string" && candidate.cause.message.trim()) {
      return candidate.cause.message;
    }
  }

  return "Erreur du chat IA";
}

export function ChatPanel({ snapshot, analysis }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chat = useServerFn(chatDiagnose);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chat({
        data: {
          messages: next,
          snapshot,
          analysis: analysis ?? undefined,
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (err: unknown) {
      const message = getChatErrorMessage(err);
      toast.error(message);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Erreur chat: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-card flex h-[520px] flex-col rounded-xl border border-border/60">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Chat diagnostic</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {analysis ? "Contexte : diagnostic actif" : "Contexte : snapshot temps réel"}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Posez une question sur les performances de votre PC. Je m'appuie sur vos métriques
                réelles.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-secondary/60 text-foreground",
            )}
          >
            {m.content}
          </div>
        ))}

        {loading && (
          <div className="inline-flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> L'IA réfléchit…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-border/60 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez votre question…"
          disabled={loading}
          className="flex-1 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" /> Envoyer
        </button>
      </form>
    </div>
  );
}
