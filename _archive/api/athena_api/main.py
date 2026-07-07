"""Athena orchestration API.

The stable HTTP contract that n8n workflows and the dashboard call. It runs
deterministic pipeline stages and reads the warehouse; the AI layer sits behind
/brief and /ask and never computes a figure.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from athena.config import MODULE
from athena.db import connect

from . import ai, brief, nl
from .data import analytics_bundle

app = FastAPI(title="Athena Orchestration API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


class BuildRequest(BaseModel):
    module: str = MODULE
    regenerate: bool = False  # re-synthesize the demo dataset before loading


class ModuleRequest(BaseModel):
    module: str = MODULE


class AskRequest(BaseModel):
    question: str
    persona: str = "executive"
    module: str = MODULE


@app.get("/health")
def health():
    provider = ai.active_provider()
    db_ok = True
    try:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
    except Exception:  # noqa: BLE001
        db_ok = False
    return {"ok": db_ok, "database": db_ok, "ai_provider": provider, "ai_configured": ai.is_configured()}


@app.post("/build")
def build(req: BuildRequest):
    """Run the full deterministic build: (optional generate), ingest, analyze, forecast, recommend."""
    from athena.analytics import run_analytics
    from athena.forecast import run_forecast
    from athena.ingest import ingest
    from athena.recommend import run_recommendations

    try:
        if req.regenerate:
            from athena.generate import generate as gen
            gen()
        ingest()
        run_analytics()
        run_forecast()
        run_recommendations()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"build failed: {exc}") from exc
    return {"status": "ok", "module": req.module, "regenerated": req.regenerate}


@app.get("/analytics")
def analytics(module: str = MODULE):
    with connect() as conn:
        return analytics_bundle(conn, module)


@app.post("/brief")
def make_brief(req: ModuleRequest):
    with connect() as conn:
        return brief.build_brief(conn, req.module)


@app.post("/ask")
def ask(req: AskRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="question is required")
    with connect() as conn:
        return nl.answer(conn, req.question, req.persona, req.module)
