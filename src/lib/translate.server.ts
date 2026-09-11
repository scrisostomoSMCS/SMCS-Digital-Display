// Server-only: calls the MyMemory Translation API (api.mymemory.translated.net)
// in anonymous mode — no API key, no email, no billing. Never import this from
// a "use client" component; keeping the call server-side avoids exposing the
// (rate-limited) endpoint to the browser and keeps translate-on-save the only
// path that reaches it.

const ENDPOINT = "https://api.mymemory.translated.net/get";

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
  const url = `${ENDPOINT}?${new URLSearchParams({ q: text, langpair: "en|es" })}`;
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
    throw new Error(`MyMemory anonymous quota exhausted: ${translated}`);
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

/*
  Translates a list of English strings to Spanish via MyMemory (one anonymous
  GET request per string, run concurrently — MyMemory has no batch endpoint).
  Throws on any failure (network, bad status, or an exhausted anonymous quota
  disguised as a 200); callers decide how to degrade (see
  translateChangedFields, which saves English-only rather than blocking on a
  translate error).
*/
export async function translateTexts(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];
  return Promise.all(texts.map(translateText));
}
