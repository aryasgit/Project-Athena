"""Shared configuration and paths for the pipeline."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Repository layout ----------------------------------------------------------
PIPELINE_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = PIPELINE_ROOT.parent
DATA_DIR = REPO_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
SEED_DIR = DATA_DIR / "seed"
SQL_DIR = REPO_ROOT / "sql"

for _d in (RAW_DIR, SEED_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# Database -------------------------------------------------------------------
# Point this at a local Postgres or a Supabase connection string. Supabase
# gives you the value under Project Settings -> Database -> Connection string.
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://localhost:5432/athena"
)

# Reproducibility ------------------------------------------------------------
RANDOM_SEED = int(os.environ.get("ATHENA_SEED", "42"))

# The active analytics module. The engine is dataset-agnostic; only the
# generator and the semantics of the loaded tables change per module.
MODULE = os.environ.get("ATHENA_MODULE", "placement")
