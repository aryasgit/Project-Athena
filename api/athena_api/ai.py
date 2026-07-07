"""Provider-agnostic AI access for the API (mirror of web/lib/ai/provider.ts).

Ollama is primary. Any failure or missing configuration returns None so callers
fall back to the deterministic path. AI never computes a number here; it only
interprets the structured evidence it is handed.
"""

from __future__ import annotations

import os

import httpx

DEFAULT_MODELS = {
    "ollama": "llama3.1",
    "openrouter": "meta-llama/llama-3.1-70b-instruct",
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-haiku-latest",
    "gemini": "gemini-2.5-flash",
}

# Personas: consultants that reason over structured JSON and cite figures.
SHARED_RULES = (
    "You are an analytical consultant inside Athena, an enterprise decision-"
    "intelligence platform.\n"
    "Absolute rules:\n"
    "- The numbers in the provided JSON are the single source of truth. Never "
    "invent, recompute, or contradict them.\n"
    "- Cite the specific figures you rely on.\n"
    "- Plain, board-ready business English. No filler.\n"
    "- Do not use em dashes. Use commas, periods, colons, or the word 'to'.\n"
    "- Monetary values are in Indian Rupees, lakhs per annum. Write them as "
    "'₹X.X LPA'. Never convert currency or rescale (₹21.2 LPA stays ₹21.2 LPA).\n"
    "- Rates, premiums, and shares are percentages. Keep them as percentages.\n"
    "- Be concise."
)

PERSONAS = {
    "executive": SHARED_RULES + "\nYour lens: strategy. Name the decisions that matter and their impact.",
    "data_analyst": SHARED_RULES + "\nYour lens: analysis. Explain anomalies, correlations, and outliers.",
    "forecast_analyst": SHARED_RULES + "\nYour lens: forecasting. Interpret projections and their uncertainty.",
    "risk_analyst": SHARED_RULES + "\nYour lens: risk. Surface and rank operational, financial, strategic risks.",
    "report_writer": SHARED_RULES + "\nYour lens: communication. Produce a clean board-ready narrative.",
}


def active_provider() -> str:
    p = os.environ.get("AI_PROVIDER", "").lower()
    return p if p in DEFAULT_MODELS else "none"


def is_configured() -> bool:
    p = active_provider()
    if p == "ollama":
        return True
    keys = {
        "openrouter": "OPENROUTER_API_KEY", "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY", "gemini": "GEMINI_API_KEY",
    }
    return p in keys and bool(os.environ.get(keys[p]))


def provider_label() -> str:
    p = active_provider()
    if p == "none":
        return "none"
    return f"{p} · {os.environ.get('AI_MODEL') or DEFAULT_MODELS[p]}"


def generate(system: str, prompt: str, temperature: float = 0.3, timeout: float = 30.0) -> str | None:
    provider = active_provider()
    if provider == "none" or not is_configured():
        return None
    model = os.environ.get("AI_MODEL") or DEFAULT_MODELS[provider]
    try:
        with httpx.Client(timeout=timeout) as client:
            if provider == "ollama":
                return _ollama(client, model, system, prompt, temperature)
            if provider in ("openrouter", "openai"):
                return _openai_compat(client, provider, model, system, prompt, temperature)
            if provider == "anthropic":
                return _anthropic(client, model, system, prompt, temperature)
            if provider == "gemini":
                return _gemini(client, model, system, prompt, temperature)
    except Exception as exc:  # noqa: BLE001 - fail soft by design
        print(f"[ai] {provider} failed, falling back: {exc}")
        return None
    return None


def _ollama(client, model, system, prompt, temperature):
    base = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    r = client.post(f"{base}/api/chat", json={
        "model": model, "stream": False,
        "options": {"temperature": temperature},
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
    })
    r.raise_for_status()
    return (r.json().get("message", {}).get("content") or "").strip() or None


def _openai_compat(client, provider, model, system, prompt, temperature):
    url = ("https://openrouter.ai/api/v1/chat/completions" if provider == "openrouter"
           else "https://api.openai.com/v1/chat/completions")
    key = os.environ["OPENROUTER_API_KEY" if provider == "openrouter" else "OPENAI_API_KEY"]
    r = client.post(url, headers={"authorization": f"Bearer {key}"}, json={
        "model": model, "temperature": temperature,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
    })
    r.raise_for_status()
    return (r.json()["choices"][0]["message"]["content"] or "").strip() or None


def _anthropic(client, model, system, prompt, temperature):
    r = client.post("https://api.anthropic.com/v1/messages", headers={
        "x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01",
    }, json={
        "model": model, "max_tokens": 2000, "temperature": temperature,
        "system": system, "messages": [{"role": "user", "content": prompt}],
    })
    r.raise_for_status()
    return (r.json()["content"][0]["text"] or "").strip() or None


def _gemini(client, model, system, prompt, temperature):
    key = os.environ["GEMINI_API_KEY"]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    r = client.post(url, json={
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature, "thinkingConfig": {"thinkingBudget": 0}},
    })
    r.raise_for_status()
    return (r.json()["candidates"][0]["content"]["parts"][0]["text"] or "").strip() or None
