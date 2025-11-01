"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { GradientBackground } from "@/components/gradient-background";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { GeistSans } from "geist/font/sans";
import { ModelCombobox } from "@/components/ModelCombobox";
import { MetricsBar } from "@/components/MetricsBar";
import { useOllamaStatus } from "@/hooks/use-ollama-status";
import { estimateTokens } from "@/lib/ndjson";
import { ChatCard } from "@/components/chat/chat-card";
import { Instrument_Serif } from "next/font/google";
import { ThemeToggle } from "@/components/theme-toggle";
import { SystemPopover, type SystemSummary } from "@/components/system-popover";

// 👇 ajoute le composant qu’on vient de faire
import {
    ModelSettingsPopover,
    type ModelOptions,
} from "@/components/model-settings-popover";

const instrumentSerif = Instrument_Serif({
    subsets: ["latin"],
    weight: ["400"],
    display: "swap",
});

export default function Page() {
    const title = "ASTRA AI SDK";
    const TYPE_MS = 60;

    const { resolvedTheme } = useTheme();
    const chatVariant = resolvedTheme === "light" ? "light" : "dark";

    const typingDuration = useMemo(
        () => title.length * TYPE_MS + 400,
        [title]
    );
    const [reveal, setReveal] = useState(false);
    useEffect(() => {
        const id = setTimeout(() => setReveal(true), typingDuration);
        return () => clearTimeout(id);
    }, [typingDuration]);

    // ping Ollama au load
    useEffect(() => {
        fetch("/api/ollama/ensure").catch(() => {});
    }, []);

    const status = useOllamaStatus(3000);
    const installed = status?.installed ?? [];
    const loaded = status?.loaded ?? [];
    const installedSizeLookup: Record<string, number | undefined> =
        Object.fromEntries(loaded.map((m: any) => [m.name, m.size]));

    const [model, setModel] = useState<string | undefined>(installed[0]);
    useEffect(() => {
        if (!model && installed.length) setModel(installed[0]);
    }, [installed, model]);

    const [promptTokens, setPromptTokens] = useState(0);
    const [completionTokens, setCompletionTokens] = useState(0);
    const [durationMs, setDurationMs] = useState<number | undefined>(undefined);

    // infos système (popover)
    const [sys, setSys] = useState<SystemSummary | null>(null);
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await fetch("/api/system/summary", { cache: "no-store" });
                if (!alive) return;
                setSys(r.ok ? await r.json() : null);
            } catch {
                setSys(null);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    const [hasFirstToken, setHasFirstToken] = useState(false);

    // 👇 état local pour les paramètres du modèle (liés au popover)
    const [modelOptions, setModelOptions] = useState<ModelOptions>({
        temperature: 0.25,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
        num_predict: 512,
        system: "",
        format: "text",
    });

    const catalogModels = [
        "deepcoder:1.5b",
        "llama3.2:3b",
        "mistral:7b-instruct",
        "qwen2.5:7b-instruct",
        "deepseek-coder:6.7b",
        "phi3:mini-4k-instruct-q4",
    ];

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
            <GradientBackground />
            <div
                className={`absolute inset-0 -z-10 transition-colors duration-300 ${
                    chatVariant === "dark" ? "bg-black/25" : "bg-slate-100"
                }`}
            />

            {/* barre fixe en haut */}
            <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
                {/* bouton paramètres modèle (temp, top_p, system prompt...) */}
                <ModelSettingsPopover
                    value={modelOptions}
                    onChange={setModelOptions}
                />
                <SystemPopover sys={sys} />
                <ThemeToggle />
            </div>

            <section
                className={`relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 transition-transform duration-700 ease-out ${
                    reveal ? "-translate-y-24" : "translate-y-0"
                }`}
            >
                {/* titre */}
                <div
                    className={`w-full text-center transition-all duration-700 ease-in-out ${
                        hasFirstToken
                            ? "opacity-0 -translate-y-16"
                            : "opacity-100 translate-y-0"
                    } ${instrumentSerif.className}`}
                >
                    <h1
                        className={`text-balance text-5xl font-normal tracking-tight ${
                            chatVariant === "dark" ? "text-white" : "text-slate-900"
                        } sm:text-6xl md:text-7xl`}
                    >
                        <TypingAnimation showCursor loop={false} typeSpeed={TYPE_MS}>
                            {title}
                        </TypingAnimation>
                    </h1>
                </div>

                {/* combobox */}
                <div
                    className={[
                        "mt-8 w-177 transition-all duration-500 ease-out",
                        reveal
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-2 pointer-events-none",
                        hasFirstToken
                            ? "opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden"
                            : "",
                    ].join(" ")}
                >
                    <ModelCombobox
                        value={model}
                        onChange={setModel}
                        installed={installed}
                        catalog={catalogModels}
                        placeholder="Sélectionne ou tape un modèle…"
                        totalRamBytes={sys?.mem?.total}
                        installedSizeLookup={installedSizeLookup}
                    />
                </div>

                {/* chat */}
                <div
                    className={`transition-all duration-700 ease-out ${
                        reveal ? "mt-8 opacity-100" : "pointer-events-none mt-0 opacity-0"
                    }`}
                >
                    <ChatCard
                        fontClass={GeistSans.className}
                        model={model}
                        variant={chatVariant}
                        // 👇 on passe les options ici → à consommer dans le composant
                        generationOptions={modelOptions}
                        onRunStart={(input) => {
                            setDurationMs(undefined);
                            setPromptTokens(estimateTokens(input));
                            setCompletionTokens(0);
                        }}
                        onDelta={(delta) => {
                            if (delta && !hasFirstToken) setHasFirstToken(true);
                            if (delta)
                                setCompletionTokens((t) => t + estimateTokens(delta));
                        }}
                        onRunEnd={(ms) => setDurationMs(ms)}
                        onFirstToken={() => setHasFirstToken(true)}
                    />
                </div>
            </section>

            {/* metrics */}
            <div
                className={[
                    "fixed bottom-6 left-1/2 -translate-x-1/2 transition-all duration-400",
                    hasFirstToken
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-3 pointer-events-none",
                ].join(" ")}
            >
                <MetricsBar
                    model={model}
                    ramBytes={status?.ramApprox}
                    promptTokens={promptTokens}
                    completionTokens={completionTokens}
                    durationMs={durationMs}
                    visible={hasFirstToken}
                />
            </div>
        </main>
    );
}