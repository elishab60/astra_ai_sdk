// app/api/ollama/status/route.ts
import { NextResponse } from "next/server";

const OLLAMA = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const [tagsRes, psRes] = await Promise.allSettled([
        fetch(`${OLLAMA}/api/tags`, { cache: "no-store" }),
        fetch(`${OLLAMA}/api/ps`,   { cache: "no-store" }),
    ]);

    const tags = tagsRes.status === "fulfilled" && tagsRes.value.ok ? await tagsRes.value.json() : { models: [] };
    const ps   = psRes.status   === "fulfilled" && psRes.value.ok   ? await psRes.value.json()   : { models: [] };

    // Petit résumé: installed, loaded, RAM approx
    const installed = (tags.models ?? []).map((m: any) => m.name);
    const loaded = (ps.models ?? []).map((m: any) => ({ name: m.name, size: m.size, digest: m.digest }));

    const ramApprox = loaded.reduce((a: number, m: any) => a + (m.size || 0), 0); // bytes si dispo

    return NextResponse.json({
        installed, loaded, ramApprox,
    }, { headers: { "Cache-Control": "no-store" } });
}
