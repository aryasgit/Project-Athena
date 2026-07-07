import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to the Athena orchestration API. The browser cannot reach
 * the internal API host, so the question is forwarded here. If no API URL is
 * configured the route degrades gracefully rather than erroring.
 */
export async function POST(req: NextRequest) {
  const base = process.env.ATHENA_API_URL;
  if (!base) {
    return NextResponse.json(
      { unavailable: true, message: "The natural-language service is not configured. Set ATHENA_API_URL to the orchestration API." },
      { status: 200 },
    );
  }
  try {
    const body = await req.json();
    const res = await fetch(`${base}/ask`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`api ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json(
      { unavailable: true, message: "Could not reach the analysis service. Is the API running?", detail: String(err) },
      { status: 200 },
    );
  }
}
