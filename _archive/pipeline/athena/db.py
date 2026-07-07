"""Thin Postgres access layer built on psycopg 3."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterable, Iterator, Sequence

import psycopg

from .config import DATABASE_URL


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    """Yield a Postgres connection that commits on success, rolls back on error."""
    conn = psycopg.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_script(conn: psycopg.Connection, sql: str) -> None:
    """Run a multi-statement SQL script."""
    with conn.cursor() as cur:
        cur.execute(sql)


def copy_rows(
    conn: psycopg.Connection,
    table: str,
    columns: Sequence[str],
    rows: Iterable[Sequence],
) -> int:
    """Bulk-load rows into ``table`` using COPY. Returns the row count."""
    col_list = ", ".join(columns)
    count = 0
    with conn.cursor() as cur:
        with cur.copy(f"COPY {table} ({col_list}) FROM STDIN") as copy:
            for row in rows:
                copy.write_row(row)
                count += 1
    return count


def fetch_all(conn: psycopg.Connection, sql: str, params: Sequence | None = None):
    with conn.cursor() as cur:
        cur.execute(sql, params)
        cols = [d.name for d in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]
