// hooks/use-ollama-models.ts
"use client";
import { useEffect, useState } from "react";

export function useOllamaModels(fallbacks: string[]) {
    const [models, setModels] = useState<string[]>(fallbacks);
    useEffect(() => {
        let alive = true;
        fetch("/api/ollama/models", { cache: "no-store" })
            .then(r => r.json())
            .then(data => {
                if (!alive) return;
                const names = (data?.models ?? []).map((m: any) => m.name).filter(Boolean);
                if (names.length) setModels(names);
            })
            .catch(() => {});
        return () => { alive = false; };
    }, [fallbacks.join("|")]);
    return models;
}
