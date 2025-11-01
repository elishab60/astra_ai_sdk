// lib/ollama.ts
const OLLAMA = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

export type OllamaModel = { name: string; size?: number; details?: { parameter_size?: string; } };

export async function listLocalModels() {
    const r = await fetch(`${OLLAMA}/api/tags`, { cache: "no-store" });
    if (!r.ok) throw new Error("/api/tags failed");
    return r.json() as Promise<{ models: OllamaModel[] }>;
}

export async function showModel(name: string) {
    const r = await fetch(`${OLLAMA}/api/show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    if (!r.ok) throw new Error("/api/show failed");
    return r.json();
}

export async function pullModel(name: string) {
    const r = await fetch(`${OLLAMA}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    if (!r.ok || !r.body) throw new Error(`/api/pull failed for ${name}`);
    return r.body; // NDJSON stream
}

export async function ensureModel(name: string) {
    const { models } = await listLocalModels();
    if (models.some(m => m.name === name)) return true;
    await pullModel(name);
    return true;
}

export async function chatStream(payload: {
    model: string;
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    options?: Record<string, any>;
}) {
    const r = await fetch(`${OLLAMA}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, stream: true }),
    });
    if (!r.ok || !r.body) throw new Error("chat failed");
    return r.body; // NDJSON stream
}
