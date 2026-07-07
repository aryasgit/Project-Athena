/**
 * Provider-agnostic AI access.
 *
 * Athena's law: AI never computes truth, it only interprets structured
 * analytical output. This module is the single seam every AI call passes
 * through, so the rest of the app never couples to a vendor. Ollama is the
 * primary (local) provider; cloud providers are drop-in alternatives.
 *
 * Every function fails soft: if no provider is configured or a call errors or
 * times out, `generate` returns null and callers fall back to the deterministic
 * path. The platform must stay fully functional with every provider disabled.
 */

export type Provider = "ollama" | "openrouter" | "openai" | "anthropic" | "gemini" | "none";

type GenerateArgs = {
  system: string;
  prompt: string;
  temperature?: number;
  timeoutMs?: number;
};

const DEFAULT_MODELS: Record<Provider, string> = {
  ollama: "llama3.1",
  openrouter: "meta-llama/llama-3.1-70b-instruct",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  gemini: "gemini-1.5-flash",
  none: "",
};

export function activeProvider(): Provider {
  const p = (process.env.AI_PROVIDER ?? "").toLowerCase() as Provider;
  if (["ollama", "openrouter", "openai", "anthropic", "gemini"].includes(p)) return p;
  return "none";
}

/** Whether the active provider has what it needs (a key, or a local endpoint). */
export function isConfigured(): boolean {
  const p = activeProvider();
  switch (p) {
    case "ollama": return true; // reachability is checked at call time
    case "openrouter": return !!process.env.OPENROUTER_API_KEY;
    case "openai": return !!process.env.OPENAI_API_KEY;
    case "anthropic": return !!process.env.ANTHROPIC_API_KEY;
    case "gemini": return !!process.env.GEMINI_API_KEY;
    default: return false;
  }
}

export function providerLabel(): string {
  const p = activeProvider();
  const model = process.env.AI_MODEL || DEFAULT_MODELS[p];
  return p === "none" ? "none" : `${p} · ${model}`;
}

export async function generate(args: GenerateArgs): Promise<string | null> {
  const provider = activeProvider();
  if (provider === "none" || !isConfigured()) return null;
  const model = process.env.AI_MODEL || DEFAULT_MODELS[provider];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs ?? 30_000);
  try {
    switch (provider) {
      case "ollama": return await callOllama(model, args, controller.signal);
      case "openrouter": return await callOpenAICompat(
        "https://openrouter.ai/api/v1/chat/completions", process.env.OPENROUTER_API_KEY!, model, args, controller.signal);
      case "openai": return await callOpenAICompat(
        "https://api.openai.com/v1/chat/completions", process.env.OPENAI_API_KEY!, model, args, controller.signal);
      case "anthropic": return await callAnthropic(model, args, controller.signal);
      case "gemini": return await callGemini(model, args, controller.signal);
      default: return null;
    }
  } catch (err) {
    console.error(`[ai] ${provider} generation failed, falling back:`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callOllama(model: string, a: GenerateArgs, signal: AbortSignal) {
  const base = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const res = await fetch(`${base}/api/chat`, {
    method: "POST", signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model, stream: false,
      options: { temperature: a.temperature ?? 0.3 },
      messages: [
        { role: "system", content: a.system },
        { role: "user", content: a.prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = await res.json();
  return (data?.message?.content ?? "").trim() || null;
}

async function callOpenAICompat(url: string, key: string, model: string, a: GenerateArgs, signal: AbortSignal) {
  const res = await fetch(url, {
    method: "POST", signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, temperature: a.temperature ?? 0.3,
      messages: [
        { role: "system", content: a.system },
        { role: "user", content: a.prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "").trim() || null;
}

async function callAnthropic(model: string, a: GenerateArgs, signal: AbortSignal) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model, max_tokens: 2000, temperature: a.temperature ?? 0.3,
      system: a.system,
      messages: [{ role: "user", content: a.prompt }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = await res.json();
  return (data?.content?.[0]?.text ?? "").trim() || null;
}

async function callGemini(model: string, a: GenerateArgs, signal: AbortSignal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST", signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: a.system }] },
      contents: [{ role: "user", parts: [{ text: a.prompt }] }],
      generationConfig: { temperature: a.temperature ?? 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim() || null;
}
