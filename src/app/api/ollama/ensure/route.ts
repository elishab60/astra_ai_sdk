import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

const HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isUp() {
    try {
        const r = await fetch(`${HOST}/api/version`, { cache: "no-store", signal: AbortSignal.timeout(1500) });
        return r.ok;
    } catch { return false; }
}

function startOllamaDetached() {
    // suppose 'ollama' est dans le PATH. Ajuste le chemin si nécessaire.
    const child = spawn(process.platform === "win32" ? "ollama.exe" : "ollama", ["serve"], {
        detached: true,
        stdio: "ignore",
    });
    child.unref();
}

export async function GET() {
    if (await isUp()) {
        return NextResponse.json({ ok: true, started: false });
    }
    startOllamaDetached();

    // Attend un peu que ça monte, jusqu’à 5 tentatives rapides
    for (let i = 0; i < 5; i++) {
        // 300 ms entre essais
        await new Promise((r) => setTimeout(r, 300));
        if (await isUp()) return NextResponse.json({ ok: true, started: true });
    }
    return NextResponse.json({ ok: false, started: true }, { status: 504 });
}