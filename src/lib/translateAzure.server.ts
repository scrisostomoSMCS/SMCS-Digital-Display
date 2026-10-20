// Server-only: calls Microsoft Azure Translator (Text API v3). Never import
// this from a "use client" component — the subscription key must never reach
// the browser. Use translateTexts in translate.server.ts, not this directly.

import type { TranslateResult } from "./translate.server";

const DEFAULT_ENDPOINT = "https://api.cognitive.microsofttranslator.com";
const TIMEOUT_MS = 8000;

// Azure's documented per-request caps. Bulletin fields are 260 characters or
// less (see bulletinLimits.ts), so one save fits in a single request; these
// only split an unusually large batch instead of letting Azure reject it.
const MAX_ITEMS_PER_REQUEST = 1000;
const MAX_CHARS_PER_REQUEST = 50000;

type AzureResponse = { translations?: { text?: unknown }[] }[];

// Error text shows up in staff-facing save warnings and server logs, so it
// carries the status and Azure's error code only — never the key or request.
async function describeFailure(res: Response): Promise<string> {
  const json = (await res.json().catch(() => null)) as
    | { error?: { code?: unknown } }
    | null;
  const code = json?.error?.code;
  return `Azure Translator HTTP ${res.status}${code !== undefined ? ` (${String(code)})` : ""}`;
}

// Split into batches under Azure's item and character caps.
function batch(texts: string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of texts) {
    if (
      current.length > 0 &&
      (current.length >= MAX_ITEMS_PER_REQUEST || chars + text.length > MAX_CHARS_PER_REQUEST)
    ) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/*
  One POST per batch (normally one per save). A whole-request failure
  (missing key, network, timeout, non-200, malformed body) fails every string
  in that batch; an empty translation fails only its own string. Failures
  come back as { ok: false } so callers keep the submitted Spanish and show a
  warning — nothing empty or error-like is ever returned as a translation.
*/
async function translateBatch(texts: string[]): Promise<TranslateResult[]> {
  const fail = (error: string): TranslateResult[] =>
    texts.map(() => ({ ok: false, error }));

  const key = process.env.AZURE_TRANSLATOR_KEY?.trim();
  if (!key) return fail("Azure Translator is not configured");
  const region = process.env.AZURE_TRANSLATOR_REGION?.trim();
  const endpoint = (process.env.AZURE_TRANSLATOR_ENDPOINT?.trim() || DEFAULT_ENDPOINT).replace(/\/+$/, "");

  const headers: Record<string, string> = {
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": "application/json",
  };
  // Required for regional/multi-service resources, not for global ones.
  if (region) headers["Ocp-Apim-Subscription-Region"] = region;

  // TODO: remove once Azure batching is confirmed (count only, never text).
  console.log(`[translate] Azure batch: ${texts.length} string(s)`);

  let res: Response;
  try {
    res = await fetch(`${endpoint}/translate?api-version=3.0&from=en&to=es`, {
      method: "POST",
      headers,
      body: JSON.stringify(texts.map((Text) => ({ Text }))),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return fail(timedOut ? "Azure Translator timed out" : "Azure Translator could not be reached");
  }
  if (!res.ok) return fail(await describeFailure(res));

  const json = (await res.json().catch(() => null)) as AzureResponse | null;
  if (!Array.isArray(json) || json.length !== texts.length) {
    return fail("Azure Translator returned an unexpected response");
  }

  return json.map((item): TranslateResult => {
    const text = item?.translations?.[0]?.text;
    if (typeof text !== "string" || !text.trim()) {
      return { ok: false, error: "Azure Translator returned an empty translation" };
    }
    return { ok: true, text: text.trim() };
  });
}

export async function translateTextsAzure(texts: string[]): Promise<TranslateResult[]> {
  const results: TranslateResult[] = texts.map(() => ({ ok: true, text: "" }));
  // Blank strings are never sent (same "" result as the MyMemory path).
  const pending = texts
    .map((text, i) => ({ text: text.trim(), i }))
    .filter((p) => p.text);
  if (pending.length === 0) return results;

  let offset = 0;
  for (const chunk of batch(pending.map((p) => p.text))) {
    const chunkResults = await translateBatch(chunk);
    chunkResults.forEach((r, j) => (results[pending[offset + j].i] = r));
    offset += chunk.length;
  }
  return results;
}
