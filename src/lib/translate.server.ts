// Server-only: calls the MyMemory Translation API (api.mymemory.translated.net).
// Registered mode (an email passed as `de`) raises the daily quota from
// ~5,000 words (anonymous) to ~50,000 words. Never import this from a
// "use client" component; keeping the call server-side avoids exposing the
// (rate-limited) endpoint to the browser and keeps translate-on-save the only
// path that reaches it.

const ENDPOINT = "https://api.mymemory.translated.net/get";

// Set in .env.local for registered-mode quota; if unset, requests fall back
// to anonymous mode rather than failing.
const REGISTERED_EMAIL = process.env.MYMEMORY_EMAIL?.trim() || undefined;

// MyMemory's documented anonymous per-request cap is ~500 characters. Every
// bulletin field today has a hard maxLength of 260 or less (see
// bulletinLimits.ts), so this should never actually trigger — it exists so a
// future field with a higher limit degrades by chunking, not by truncating or
// silently dropping text.
const MAX_CHARS_PER_REQUEST = 480;

type MyMemoryResponse = {
  responseStatus?: number | string;
  responseData?: { translatedText?: string };
};

// MyMemory returns HTTP 200 / responseStatus 200 even when the anonymous
// daily quota is exhausted — it just puts a warning string in translatedText
// instead of a real translation. Must be caught explicitly or it saves as if
// it were Spanish.
const isQuotaWarning = (text: string) =>
  /MYMEMORY WARNING/i.test(text);

async function translateOne(text: string): Promise<string> {
  const params: Record<string, string> = { q: text, langpair: "en|es" };
  if (REGISTERED_EMAIL) params.de = REGISTERED_EMAIL;
  const url = `${ENDPOINT}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MyMemory API HTTP ${res.status}`);
  }

  const json = (await res.json()) as MyMemoryResponse;
  const status = Number(json.responseStatus);
  const translated = json.responseData?.translatedText;
  if (status !== 200 || !translated) {
    throw new Error(
      `MyMemory API returned responseStatus=${json.responseStatus ?? "?"}`,
    );
  }
  if (isQuotaWarning(translated)) {
    throw new Error(`MyMemory quota exhausted: ${translated}`);
  }
  return translated;
}

// Split text into chunks at sentence boundaries, each at most `max` chars, so
// a call over MyMemory's per-request cap is translated in pieces and rejoined
// rather than truncated. A single "sentence" longer than `max` is hard-split
// on whitespace as a last resort.
function chunkForTranslation(text: string, max: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) chunks.push(current);
    current = "";
  };

  for (const sentence of sentences) {
    let piece = sentence;
    while (piece.length > max) {
      // A single sentence longer than the cap: hard-split on whitespace.
      let cut = piece.lastIndexOf(" ", max);
      if (cut <= 0) cut = max;
      const head = piece.slice(0, cut).trim();
      if (current) {
        pushCurrent();
      }
      if (head) chunks.push(head);
      piece = piece.slice(cut).trim();
    }
    const candidate = current ? `${current} ${piece}` : piece;
    if (candidate.length > max) {
      pushCurrent();
      current = piece;
    } else {
      current = candidate;
    }
  }
  pushCurrent();
  return chunks;
}

async function translateText(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length <= MAX_CHARS_PER_REQUEST) return translateOne(trimmed);

  const parts = chunkForTranslation(trimmed, MAX_CHARS_PER_REQUEST);
  const translatedParts = await Promise.all(parts.map(translateOne));
  return translatedParts.join(" ");
}

export type TranslateResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/*
  Translates a list of English strings to Spanish via MyMemory (one anonymous
  GET request per string, run concurrently — MyMemory has no batch endpoint).
  Each string's result is isolated (Promise.allSettled, not Promise.all): one
  bad/exhausted-quota/network failure only fails that string's result, it
  never discards translations that already succeeded alongside it. Callers
  (see translateChangedFields) apply the ok results and report the failed
  ones as warnings rather than silently dropping them.
*/
export async function translateTexts(texts: string[]): Promise<TranslateResult[]> {
  if (texts.length === 0) return [];
  const settled = await Promise.allSettled(texts.map(translateText));
  return settled.map((r) =>
    r.status === "fulfilled"
      ? { ok: true, text: r.value }
      : { ok: false, error: r.reason instanceof Error ? r.reason.message : String(r.reason) },
  );
}
