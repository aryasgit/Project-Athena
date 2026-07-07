import { NextRequest, NextResponse } from "next/server";
import { answer } from "@/lib/nl";
import { PersonaKey } from "@/lib/ai/personas";

export const dynamic = "force-dynamic";

/**
 * The natural-language endpoint runs in-app: it retrieves structured evidence
 * (from Postgres or the snapshot) and reasons over it, using the AI provider
 * only if one is configured. No external Python service is required.
 */
export async function POST(req: NextRequest) {
  try {
    const { question, persona } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ unavailable: true, message: "A question is required." });
    }
    const result = await answer(question, (persona as PersonaKey) ?? "executive");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { unavailable: true, message: "Something went wrong answering that.", detail: String(err) },
    );
  }
}
