"""Command-line entry point for the Athena pipeline."""

from __future__ import annotations

import time

import click

from . import __version__


def _timed(label: str, fn) -> None:
    start = time.perf_counter()
    click.echo(f"→ {label} …")
    fn()
    click.echo(f"  done in {time.perf_counter() - start:.1f}s")


@click.group()
@click.version_option(__version__, prog_name="athena")
def cli() -> None:
    """Athena decision-intelligence pipeline."""


@cli.command()
def generate() -> None:
    """Synthesize the placement dataset into data/raw."""
    from .generate import generate as _gen
    _timed("Generating dataset", lambda: _gen())


@cli.command()
def ingest() -> None:
    """Create the schema and load the warehouse (ETL)."""
    from .ingest import ingest as _ingest
    _timed("Loading warehouse", _ingest)


@cli.command()
def analyze() -> None:
    """Compute KPIs, series and rankings."""
    from .analytics import run_analytics
    _timed("Running analytics", run_analytics)


@cli.command()
def forecast() -> None:
    """Project next-cycle volume and salary."""
    from .forecast import run_forecast
    _timed("Forecasting", run_forecast)


@cli.command()
def recommend() -> None:
    """Generate strategic recommendations."""
    from .recommend import run_recommendations
    _timed("Building recommendations", run_recommendations)


@cli.command()
def snapshot() -> None:
    """Export result tables to web/data/snapshot.json for a database-free deploy."""
    from .snapshot import export
    _timed("Exporting snapshot", export)


@cli.command()
def finance() -> None:
    """Build the Finance module result rows (module='finance')."""
    from .finance import build_finance
    _timed("Building finance module", build_finance)


@cli.command()
def build() -> None:
    """Run the full analytical build: ingest → analyze → forecast → recommend."""
    from .ingest import ingest as _ingest
    from .analytics import run_analytics
    from .forecast import run_forecast
    from .recommend import run_recommendations

    _timed("Loading warehouse", _ingest)
    _timed("Running analytics", run_analytics)
    _timed("Forecasting", run_forecast)
    _timed("Building recommendations", run_recommendations)
    click.echo("✔ Build complete.")


@cli.command(name="all")
def run_all() -> None:
    """Generate the dataset, then run the full build."""
    from .generate import generate as _gen
    _timed("Generating dataset", lambda: _gen())
    ctx = click.get_current_context()
    ctx.invoke(build)


if __name__ == "__main__":
    cli()
