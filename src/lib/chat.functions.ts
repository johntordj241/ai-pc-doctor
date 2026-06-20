import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withFallback } from "@/lib/ai-providers.server";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const ChatInputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  snapshot: z.any().optional(),
  analysis: z.any().optional(),
});

const SYSTEM = `Tu es un assistant technique spécialisé en performances PC (médecin IT).
Tu réponds en français, court, concret, sans jargon.

Règles strictes :
- Tu réponds UNIQUEMENT aux questions liées aux performances PC, processus, matériel, température, réseau, OS.
- Si on te pose une question hors sujet, refuse poliment et propose de revenir au diagnostic.
- Appuie-toi UNIQUEMENT sur les métriques réelles et le diagnostic fournis dans le contexte système.
- N'invente JAMAIS de valeurs (CPU, RAM, température, processus). Si une donnée manque, dis-le.
- N'affirme JAMAIS connaître des sites web précis, des onglets précis ou leur nombre exact si ce n'est pas explicitement présent dans les données.
- Si un navigateur est lourd, propose des étapes vérifiables (ex: Shift+Esc dans Chrome pour trier CPU/RAM, fermer les onglets/processus les plus coûteux).
- Quand tu cites une métrique, indique sa valeur exacte.
- Classification métier :
  • CPU : 0-50 Normal · 50-80 Surveillance · 80-90 Élevé · 90-100 Critique
  • RAM : 0-70 Normal · 70-85 Surveillance · 85-95 Élevé · 95-100 Critique
  • Disque : 0-80 Normal · 80-90 Surveillance · 90-95 Élevé · 95-100 Critique
  • Température CPU : <70 Normal · 70-85 Surveillance · 85-95 Élevé · >95 Critique
- Réponds en 4 lignes max sauf si la question demande une procédure pas-à-pas.`;

export const chatDiagnose = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInputSchema.parse(input))
  .handler(async ({ data }) => {
    const contextBlock = [
      data.snapshot
        ? `### Snapshot système actuel\n\`\`\`json\n${JSON.stringify(data.snapshot, null, 2)}\n\`\`\``
        : "### Snapshot système\nAucun snapshot fourni.",
      data.analysis
        ? `### Dernier diagnostic IA\n\`\`\`json\n${JSON.stringify(data.analysis, null, 2)}\n\`\`\``
        : "### Dernier diagnostic IA\nAucun diagnostic récent — invite l'utilisateur à lancer « Pourquoi ça rame ? ».",
    ].join("\n\n");

    try {
      const { result, usedProvider, usedModel } = await withFallback("chat", async ({ model }) => {
        const { text } = await generateText({
          model,
          system: `${SYSTEM}\n\n${contextBlock}`,
          messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
        });
        return text;
      });
      console.log(`[chat] AI ok via ${usedProvider} (${usedModel})`);
      return { reply: result, provider: usedProvider, model: usedModel };
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err);
      if (msg.includes("429")) throw new Error("Trop de requêtes. Réessayez dans un instant.");
      if (msg.includes("402")) throw new Error("Crédits IA épuisés.");
      throw new Error("Le chat IA est indisponible (OpenAI et Lovable AI ont échoué).");
    }
  });
