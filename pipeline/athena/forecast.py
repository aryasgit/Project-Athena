"""Forecasting engine.

Two horizons are projected and stored in forecast_series:

  * monthly placement volume, via Holt exponential smoothing (enough points to
    fit a trend), forecast across the next placement cycle;
  * cycle-level median CTC overall and for the declining IT Services sector,
    via a linear trend projection with a residual-based interval.

History rows are stored with is_forecast = FALSE so the dashboard can draw the
actuals and the projection on one axis.
"""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from .config import MODULE
from .db import connect
from .warehouse import cycle_end_dates, load_facts, ordered_cycles

warnings.simplefilter("ignore")

CYCLE_MONTHS = [(8, 0), (9, 0), (10, 0), (11, 0), (12, 0), (1, 1), (2, 1), (3, 1), (4, 1)]


def _reset(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("TRUNCATE forecast_series")


def _write(conn, series_key, rows: list[dict]) -> None:
    with conn.cursor() as cur:
        cur.executemany(
            """INSERT INTO forecast_series
               (series_key, module, period, dimension, yhat, yhat_lower, yhat_upper, is_forecast)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            [(series_key, MODULE, r["period"], r.get("dimension"),
              float(r["yhat"]),
              None if r.get("lower") is None else float(r["lower"]),
              None if r.get("upper") is None else float(r["upper"]),
              bool(r["is_forecast"]))
             for r in rows],
        )


def _next_cycle_dates(last_date: pd.Timestamp) -> list[pd.Timestamp]:
    start_year = last_date.year  # last actual is Apr of cycle end; next cycle starts that Aug
    return [pd.Timestamp(year=start_year + off, month=m, day=15) for m, off in CYCLE_MONTHS]


def _forecast_monthly_volume(conn, facts: pd.DataFrame) -> None:
    placed = facts[facts.is_placed == 1].copy()
    placed["month"] = placed["full_date"].values.astype("datetime64[M]")
    monthly = placed.groupby("month").size().sort_index()
    series = pd.Series(monthly.values.astype(float),
                       index=pd.PeriodIndex(monthly.index, freq="M"))

    model = ExponentialSmoothing(series, trend="add", seasonal=None,
                                 initialization_method="estimated").fit()
    horizon = _next_cycle_dates(facts["full_date"].max())
    fc = model.forecast(len(horizon))
    resid_std = float(np.std(model.resid)) if len(model.resid) else 0.0

    rows = [{"period": ts.date(), "yhat": max(v, 0.0),
             "lower": None, "upper": None, "is_forecast": False}
            for ts, v in zip(monthly.index, monthly.values)]
    for ts, v in zip(horizon, fc.values):
        v = max(float(v), 0.0)
        rows.append({"period": ts.date(), "yhat": v,
                     "lower": max(v - 1.96 * resid_std, 0.0),
                     "upper": v + 1.96 * resid_std, "is_forecast": True})
    _write(conn, "placements_monthly", rows)


def _linear_projection(x: np.ndarray, y: np.ndarray):
    """OLS line; return (slope, intercept, residual_std)."""
    slope, intercept = np.polyfit(x, y, 1)
    resid = y - (slope * x + intercept)
    resid_std = float(np.std(resid, ddof=1)) if len(y) > 2 else float(np.std(resid))
    return slope, intercept, resid_std


def _forecast_cycle_ctc(conn, facts: pd.DataFrame, cycles: list[str]) -> None:
    ends = cycle_end_dates(facts)
    placed = facts[facts.is_placed == 1]

    def project(series_key: str, subset: pd.DataFrame, dim: str | None):
        med = [float(subset[subset.placement_cycle == c]["ctc_lpa"].median()) for c in cycles]
        x = np.arange(len(cycles), dtype=float)
        slope, intercept, rstd = _linear_projection(x, np.array(med))
        rows = [{"period": ends[c].date(), "dimension": dim, "yhat": med[i],
                 "lower": None, "upper": None, "is_forecast": False}
                for i, c in enumerate(cycles)]
        nx = len(cycles)
        yhat = slope * nx + intercept
        next_date = _next_cycle_dates(facts["full_date"].max())[-1]
        band = 1.96 * max(rstd, 0.4)
        rows.append({"period": next_date.date(), "dimension": dim,
                     "yhat": yhat, "lower": yhat - band, "upper": yhat + band,
                     "is_forecast": True})
        _write(conn, series_key, rows)

    project("median_ctc_cycle", placed, None)
    project("it_services_ctc", placed[placed.sector == "IT Services"], "IT Services")


def run_forecast() -> None:
    with connect() as conn:
        facts = load_facts(conn)
        cycles = ordered_cycles(facts)
        _reset(conn)
        _forecast_monthly_volume(conn, facts)
        _forecast_cycle_ctc(conn, facts, cycles)
