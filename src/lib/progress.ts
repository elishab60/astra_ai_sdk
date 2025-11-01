// lib/progress.ts
// Décode une ligne NDJSON renvoyée par /api/pull d'Ollama.
// Exemple d’events: { status, completed, total, digest, key, ... }
export type PullEvent = {
    status?: string;
    completed?: number;
    total?: number;
    digest?: string;
    key?: string;
};

export function parseOllamaPullLine(line: string): PullEvent | null {
    try {
        const evt = JSON.parse(line);
        // On ne garde que les champs utiles
        return {
            status: evt?.status,
            completed: typeof evt?.completed === "number" ? evt.completed : undefined,
            total: typeof evt?.total === "number" ? evt.total : undefined,
            digest: typeof evt?.digest === "string" ? evt.digest : undefined,
            key: typeof evt?.key === "string" ? evt.key : undefined,
        };
    } catch {
        return null;
    }
}
