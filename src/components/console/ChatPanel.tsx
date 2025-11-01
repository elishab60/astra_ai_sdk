"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRef, useState, useEffect } from "react";
import { useSession } from "@/store/session";
import { ndjsonStream } from "@/lib/ndjson";
import { Separator } from "@/components/ui/separator";

export function ChatPanel() {
    const { model, system, params, messages, pushMessage, replaceMessage } = useSession();
    const [input, setInput] = useState("");
    const viewportRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = viewportRef.current; if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length]);

    async function onSend(e?: React.FormEvent) {
        e?.preventDefault();
        const text = input.trim(); if (!text) return;

        pushMessage({ id: crypto.randomUUID(), role: "user", content: text });
        setInput("");

        const aId = crypto.randomUUID();
        pushMessage({ id: aId, role: "assistant", content: "" });

        const history = [
            ...(system ? [{ role: "system", content: system as string }] : []),
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
        ];

        const res = await fetch("/api/ollama/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                messages: history,
                options: { temperature: params.temperature, top_p: params.top_p, num_predict: params.max_tokens },
            }),
        });

        if (!res.ok || !res.body) {
            replaceMessage(aId, "Erreur: impossible de joindre le modèle.");
            return;
        }

        let acc = "";
        for await (const evt of ndjsonStream(res.body)) {
            const delta = evt?.message?.content ?? "";
            if (!delta) continue;
            acc += delta;
            replaceMessage(aId, acc);
        }
    }

    return (
        <section className="flex h-full flex-col overflow-hidden">
            <header className="flex items-center justify-between border-b px-4 py-2">
                <div className="text-sm text-muted-foreground">Modèle: <span className="font-medium text-foreground">{model}</span></div>
                <div className="text-xs text-muted-foreground">Temp {params.temperature} • Top-p {params.top_p} • Max {params.max_tokens}</div>
            </header>

            <ScrollArea className="flex-1">
                <div ref={viewportRef} className="space-y-3 p-4">
                    {messages.map(m => (
                        <div key={m.id} className={`flex ${m.role === "assistant" ? "" : "justify-end"}`}>
                            <div className={`max-w-[75%] rounded-2xl border px-4 py-2 text-sm leading-relaxed
                ${m.role === "assistant" ? "bg-accent/30 border-accent" : "bg-muted/50 border-muted-foreground/20"}`}>
                                <pre className="whitespace-pre-wrap break-words">{m.content}</pre>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <Separator />
            <Card className="m-3">
                <CardContent className="p-3">
                    <form onSubmit={onSend} className="flex items-center gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Écris ici. Shift+Entrée pour nouvelle ligne."
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) onSend(e as any);
                            }}
                        />
                        <Button type="submit">Envoyer</Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-between text-xs text-muted-foreground">
                    <div>Streaming NDJSON actif</div>
                    <div>⌘Enter pour envoyer</div>
                </CardFooter>
            </Card>
        </section>
    );
}
