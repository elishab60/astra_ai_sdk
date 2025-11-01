"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function MetricsBar({
                               model,
                               ramBytes,
                               promptTokens,
                               completionTokens,
                               durationMs,
                               visible = false,
                           }: {
    model?: string;
    ramBytes?: number;
    promptTokens: number;
    completionTokens: number;
    durationMs?: number;
    visible?: boolean;
}) {
    const ram = useMemo(() => {
        if (!ramBytes) return "—";
        const gb = ramBytes / (1024 ** 3);
        return `${gb.toFixed(2)} GB`;
    }, [ramBytes]);

    const dur = typeof durationMs === "number" ? `${(durationMs / 1000).toFixed(1)}s` : "—";

    return (
        <div
            className={cn(
                "fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs text-white/80 backdrop-blur",
                "transition-opacity duration-700 ease-out",
                visible ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
        >
            <div className="flex items-center gap-3">
                <span className="truncate max-w-[200px]">🧠 {model ?? "—"}</span>
                <span className="inline-block h-4 w-px bg-white/10" />
                <span>RAM {ram}</span>
                <span className="inline-block h-4 w-px bg-white/10" />
                <span>In {promptTokens}</span>
                <span className="inline-block h-4 w-px bg-white/10" />
                <span>Out {completionTokens}</span>
                <span className="inline-block h-4 w-px bg-white/10" />
                <span>⏱ {dur}</span>
            </div>
        </div>
    );
}