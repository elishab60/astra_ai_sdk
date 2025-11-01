// components/chat/CodeBubble.tsx
"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/shadcn-io/code-editor";
import { Play } from "lucide-react";

const RUNNABLE = new Set(["bash", "sh", "python", "javascript", "js", "node", "ts", "typescript"]);

export function CodeBubble({
                               lang,
                               code,
                               title,
                           }: {
    lang: string;
    code: string;
    title?: string;
}) {
    const [stream, setStream] = React.useState<ReadableStream<Uint8Array> | null>(null);
    const [running, setRunning] = React.useState(false);

    async function run() {
        if (!RUNNABLE.has(lang)) return;
        setRunning(true);
        try {
            const normalized = lang === "ts" || lang === "typescript" ? "node" : lang;
            const res = await fetch("/api/exec", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lang: normalized, code }),
            });
            if (res.body) setStream(res.body);
        } finally {
            setRunning(false);
        }
    }

    return (
        <div className="space-y-2">
            <div className="relative">
                {/* Header et copy sont déjà gérés par CodeEditor */}
                <CodeEditor
                    lang={lang || "text"}
                    title={title || `${lang || "txt"}`}
                    cursor
                    copyButton
                    writing={false}   // pas d’animation dans le chat pour éviter le vomi visuel
                    className="w-full max-w-[80vw] md:max-w-[900px] h-[360px]"
                    themes={{ light: "vitesse-light", dark: "vitesse-dark" }}
                >
                    {code}
                </CodeEditor>

                {RUNNABLE.has(lang) && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={run}
                        disabled={running}
                        className="absolute right-3 top-2 rounded-full border-white/10 bg-white/10 text-white hover:bg-white/15"
                        title="Run"
                    >
                        <Play className="mr-1 h-3.5 w-3.5" />
                        {running ? "…" : "Run"}
                    </Button>
                )}
            </div>

        </div>
    );
}