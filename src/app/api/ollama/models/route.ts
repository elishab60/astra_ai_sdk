// app/api/ollama/models/route.ts
import { NextResponse } from "next/server";

const OLLAMA = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const r = await fetch(`${OLLAMA}/api/tags`, { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ models: [] }, { status: 200 });
    const data = await r.json(); // { models: [{ name, size, modified_at, ...}] }
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
