import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withFallback } from "@/lib/ai-providers.server";

const SnapshotSchema = z.object({
  takenAt: z.string(),
  source: z.enum(["electron", "mock"]).optional(),
  cpu: z.object({
    usage: z.number(),
    temperature: z.number(),
    frequencyGhz: z.number(),
    cores: z.number(),
  }),
  ram: z.object({ totalGb: z.number(), usedGb: z.number() }),
  gpu: z.object({
    usage: z.number(),
    temperature: z.number(),
    vramUsedGb: z.number(),
    vramTotalGb: z.number(),
  }),
  disk: z.object({
    usagePercent: z.number(),
    readMBs: z.number(),
    writeMBs: z.number(),
    healthPercent: z.number().nullable(),
  }),
  network: z.object({ downMbps: z.number(), upMbps: z.number(), latencyMs: z.number() }),
  processes: z.array(
    z.object({
      pid: z.number(),
      name: z.string(),
      cpu: z.number(),
      ram: z.number(),
      disk: z.number(),
      impact: z.enum(["low", "medium", "high", "critical"]),
    }),
  ),
  os: z.object({ name: z.string(), version: z.string() }),
});

const AnalysisSchema = z.object({
  summary: z
    .string()
    .describe("Résumé exécutif en 1-2 phrases, langage naturel, accessible non-technique"),
  causes: z
    .array(
      z.object({
        label: z.string(),
        weightPercent: z.number(),
        explanation: z.string(),
      }),
    )
    .max(5),
  recommendations: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        estimatedGain: z.string(),
        risk: z.enum(["low", "medium", "high"]),
        timeMinutes: z.number(),
      }),
    )
    .max(6),
  /** Métriques qui ont déclenché le diagnostic (preuves chiffrées). */
  triggers: z
    .array(
      z.object({
        metric: z
          .string()
          .describe(
            "Nom court de la métrique (ex: CPU, RAM, Température CPU, Disque, Latence réseau)",
          ),
        value: z.string().describe("Valeur mesurée avec unité (ex: '94%', '82°C', '7.4/8 Go')"),
        threshold: z.string().describe("Seuil considéré comme anormal (ex: '> 85%', '> 80°C')"),
        severity: z.enum(["info", "warning", "critical"]),
      }),
    )
    .max(8)
    .describe(
      "Preuves chiffrées qui justifient le diagnostic — l'utilisateur doit comprendre POURQUOI l'IA conclut cela",
    ),
  confidence: z.enum(["low", "medium", "high", "very_high"]),
  /** Justification courte du niveau de confiance (1 phrase). */
  confidenceReason: z
    .string()
    .describe("Pourquoi ce niveau de confiance : qualité/quantité des signaux observés"),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

export type Analysis = z.infer<typeof AnalysisSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;

const SYSTEM = `Tu es un médecin spécialisé dans les performances informatiques. Tu reçois un instantané système (CPU, RAM, GPU, disque, réseau, processus) et tu dois :
1. Identifier en français, simple et accessible, POURQUOI l'ordinateur est lent MAINTENANT.
2. Lister les causes principales (avec un pourcentage de contribution qui somme à ~100).
3. Proposer des actions correctives concrètes, classées par gain.

Règles de fiabilité obligatoires :
- Utilise uniquement les métriques réellement présentes dans le snapshot.
- N'affirme jamais connaître des sites web précis, des onglets précis ou un nombre exact d'onglets, car ces informations ne sont pas dans le snapshot OS.
- Quand un navigateur est gourmand, recommande des vérifications utilisateur explicites (ex: Gestionnaire des tâches Chrome via Shift+Esc, tri par mémoire/CPU) au lieu d'inventer des pages.
- Si une donnée manque, dis-le clairement.

Sois direct, sans jargon. Pas de listes à puces dans le résumé.`;

export const runDiagnosis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ snapshot: SnapshotSchema }).parse(input))
  .handler(async ({ data, context }) => {
    // Hard guard: never run AI on simulated data — would produce a misleading diagnosis.
    if (data.snapshot.source !== "electron") {
      throw new Error(
        "Diagnostic IA bloqué : données simulées. Installez l'application Desktop (Electron) pour analyser votre vrai PC.",
      );
    }
    const prompt = `Voici l'instantané système (JSON):\n${JSON.stringify(data.snapshot, null, 2)}\n\nAnalyse et réponds.`;

    let analysis: Analysis;
    let usedProvider: string;
    let usedModel: string;
    try {
      const {
        result,
        usedProvider: p,
        usedModel: m,
      } = await withFallback("diagnose", async ({ model }) => {
        const { object } = await generateObject({
          model,
          system: SYSTEM,
          prompt,
          schema: AnalysisSchema,
        });
        return object as Analysis;
      });
      analysis = result;
      usedProvider = p;
      usedModel = m;
      console.log(`[diagnose] AI ok via ${usedProvider} (${usedModel})`);
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err);
      if (msg.includes("429")) throw new Error("Trop de requêtes. Réessayez dans un instant.");
      if (msg.includes("402"))
        throw new Error(
          "Crédits IA épuisés. Ajoutez des crédits dans les paramètres de l'espace de travail.",
        );
      throw new Error("Le diagnostic IA a échoué (OpenAI et Lovable AI indisponibles). Réessayez.");
    }

    // health score & severity (server-side mirror of client logic)
    const s = data.snapshot;
    const cpuScore = 100 - s.cpu.usage;
    const ramScore = 100 - (s.ram.usedGb / s.ram.totalGb) * 100;
    const diskScore = 100 - s.disk.usagePercent;
    const thermalScore = Math.max(0, 100 - Math.max(0, s.cpu.temperature - 60) * 3);
    const netScore = Math.max(0, 100 - Math.max(0, s.network.latencyMs - 30) * 1.2);
    const healthScore = Math.round(
      cpuScore * 0.3 + ramScore * 0.25 + diskScore * 0.15 + thermalScore * 0.2 + netScore * 0.1,
    );
    const severity = analysis.severity;

    const { data: inserted, error } = await context.supabase
      .from("diagnoses")
      .insert({
        user_id: context.userId,
        snapshot: data.snapshot as unknown as Record<string, unknown>,
        analysis: analysis as unknown as Record<string, unknown>,
        health_score: healthScore,
        severity,
        summary: analysis.summary,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return { id: inserted.id, analysis, healthScore, severity };
  });

export const listDiagnoses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("diagnoses")
      .select("id, created_at, summary, health_score, severity")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
