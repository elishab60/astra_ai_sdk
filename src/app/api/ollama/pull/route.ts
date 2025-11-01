// app/api/ollama/pull/route.ts
import { NextResponse } from "next/server";
const OLLAMA = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const upstream = await fetch(`${OLLAMA}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });

    if (!upstream.ok || !upstream.body) {
        return NextResponse.json({ error: "pull failed" }, { status: 500 });
    }

    // On stream tel quel (NDJSON) pour garder la progression
    return new Response(upstream.body, {
        headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
    });
}
