// app/api/ollama/delete/route.ts
import { NextResponse } from "next/server";
const OLLAMA = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const r = await fetch(`${OLLAMA}/api/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });

    if (!r.ok) return NextResponse.json({ error: "delete failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
}
