// app/api/exec/route.ts
import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

// Langages autorisés
const ALLOWED = new Set(["bash", "sh", "python", "node", "javascript", "js", "ts", "typescript"]);

// Normalisation simple
function normalize(lang?: string) {
    const l = (lang || "").toLowerCase();
    if (l === "javascript" || l === "js") return "node";
    if (l === "ts" || l === "typescript") return "node";
    if (l === "sh") return "bash";
    return l;
}

export async function POST(req: NextRequest) {
    const { lang, code } = await req.json() as { lang?: string; code: string };
    const L = normalize(lang);

    if (!code || !ALLOWED.has(L)) {
        return new Response("Langage interdit ou code vide.", { status: 400 });
    }

    // Sandbox minimal: répertoire temporaire par exécution
    const cwd = mkdtempSync(join(tmpdir(), "astra-sbx-"));
    const id = randomUUID();

    let cmd = "";
    let args: string[] = [];

    if (L === "bash") {
        const f = join(cwd, `${id}.sh`);
        writeFileSync(f, code, { mode: 0o700 });
        cmd = "bash"; args = [f];
    } else if (L === "python") {
        const f = join(cwd, `${id}.py`);
        writeFileSync(f, code);
        cmd = "python3"; args = [f];
    } else { // node
        const f = join(cwd, `${id}.mjs`);
        writeFileSync(f, code);
        cmd = "node"; args = [f];
    }

    const proc = spawn(cmd, args, { cwd, env: { ...process.env, NODE_NO_WARNINGS: "1" } });

    // Hard timeout 15s
    const killer = setTimeout(() => { proc.kill("SIGKILL"); }, 15_000);

    const stream = new ReadableStream({
        start(controller) {
            const enqueue = (chunk: any) => controller.enqueue(
                typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk
            );

            proc.stdout.on("data", (d) => enqueue(d));
            proc.stderr.on("data", (d) => enqueue(d));
            proc.on("close", (code) => {
                clearTimeout(killer);
                enqueue(`\n[exit ${code}]\n`);
                controller.close();
            });
            proc.on("error", (err) => {
                clearTimeout(killer);
                enqueue(String(err) + "\n");
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
        }
    });
}