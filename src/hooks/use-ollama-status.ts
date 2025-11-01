"use client";
import { useEffect, useState } from "react";

export function useOllamaStatus(intervalMs = 3000) {
    const [status, setStatus] = useState<{
        installed: string[];
        loaded: { name: string; size?: number; digest?: string }[];
        ramApprox?: number;
    } | null>(null);

    useEffect(() => {
        let alive = true;
        async function tick() {
            try {
                const r = await fetch("/api/ollama/status", { cache: "no-store" });
                if (!r.ok) return;
                const d = await r.json();
                if (alive) setStatus(d);
            } catch {}
        }
        tick();
        const id = setInterval(tick, intervalMs);
        return () => { alive = false; clearInterval(id); };
    }, [intervalMs]);

    return status;
}
