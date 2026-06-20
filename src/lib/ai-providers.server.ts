import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { readServerEnv } from "./config.server";

/**
 * AI provider abstraction with automatic fallback.
 *
 * Order (per AI_DIAGNOSTIC_RULES.md §6):
 *   1. OpenAI         — primary (if OPENAI_API_KEY is set)
 *   2. Lovable AI     — fallback (LOVABLE_API_KEY, always present on Lovable Cloud)
 */

export type AiProviderName = "openai" | "lovable";

export interface AiModelChoice {
  provider: AiProviderName;
  /** Vercel AI SDK LanguageModelV1 instance */
  model: ReturnType<ReturnType<typeof createOpenAICompatible>>;
  modelId: string;
}

function openaiProvider() {
  const key = readServerEnv("OPENAI", "API", "KEY");
  if (!key) return null;
  const provider = createOpenAICompatible({
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    headers: { Authorization: `Bearer ${key}` },
    supportsStructuredOutputs: true,
  });
  return provider;
}

function lovableProvider() {
  const key = readServerEnv("LOVABLE", "API", "KEY");
  if (!key) return null;
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

/**
 * Returns the primary model choice (OpenAI if available, else Lovable).
 * Throws if neither provider is configured.
 */
export function getPrimaryModel(kind: "diagnose" | "chat" = "diagnose"): AiModelChoice {
  const oai = openaiProvider();
  if (oai) {
    const modelId = readServerEnv("OPENAI", "MODEL") ?? "gpt-4o-mini";
    return { provider: "openai", model: oai(modelId), modelId };
  }
  const lov = lovableProvider();
  if (lov) {
    const modelId = "google/gemini-3-flash-preview";
    return { provider: "lovable", model: lov(modelId), modelId };
  }
  void kind;
  throw new Error("Aucun fournisseur IA configuré.");
}

/** Returns the fallback model (Lovable) if available and different from the primary. */
export function getFallbackModel(primary: AiProviderName): AiModelChoice | null {
  if (primary === "lovable") return null;
  const lov = lovableProvider();
  if (!lov) return null;
  const modelId = "google/gemini-3-flash-preview";
  return { provider: "lovable", model: lov(modelId), modelId };
}

/**
 * Run an AI call with automatic provider fallback.
 * Logs the failover server-side.
 */
export async function withFallback<T>(
  kind: "diagnose" | "chat",
  run: (choice: AiModelChoice) => Promise<T>,
): Promise<{ result: T; usedProvider: AiProviderName; usedModel: string }> {
  const primary = getPrimaryModel(kind);
  try {
    const result = await run(primary);
    return { result, usedProvider: primary.provider, usedModel: primary.modelId };
  } catch (err: unknown) {
    const fallback = getFallbackModel(primary.provider);
    if (!fallback) throw err;
    console.warn(
      `[ai-providers] Primary provider "${primary.provider}" (${primary.modelId}) failed (${err instanceof Error ? err.message : String(err)}). Falling back to "${fallback.provider}" (${fallback.modelId}).`,
    );
    const result = await run(fallback);
    return { result, usedProvider: fallback.provider, usedModel: fallback.modelId };
  }
}
