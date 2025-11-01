// components/ModelManager.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBytes } from "@/lib/bytes";
import { parseOllamaPullLine } from "@/lib/progress";
import { Separator } from "@/components/ui/separator";

type Installed = { name: string; size?: number; modified_at?: string };
type Running = { name: string; size?: number; digest?: string };
type Catalog = { name: string; family?: string; task?: string };

export function ModelManager() {
    const [installed, setInstalled] = useState<Installed[]>([]);
    const [running, setRunning] = useState<Running[]>([]);
    const [catalog, setCatalog] = useState<Catalog[]>([]);
    const [query, setQuery] = useState("");
    const [busyName, setBusyName] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [speed, setSpeed] = useState<string>("");

    async function refresh() {
        const [i, p, c] = await Promise.all([
            fetch("/api/ollama/models").then(r => r.json()).catch(() => ({ models: [] })),
            fetch("/api/ollama/ps").then(r => r.json()).catch(() => ({ models: [] })),
            fetch("/api/ollama/available").then(r => r.json()).catch(() => ({ catalog: [] })),
        ]);
        setInstalled(i.models ?? []);
        setRunning(p.models ?? []);
        setCatalog(c.catalog ?? []);
    }

    useEffect(() => { refresh(); }, []);

    const installedNames = useMemo(() => new Set(installed.map(m => m.name)), [installed]);
    const runningNames = useMemo(() => new Set(running.map(m => m.name)), [running]);

    const filteredInstalled = useMemo(
        () => installed.filter(m => m.name.toLowerCase().includes(query.toLowerCase())),
        [installed, query]
    );

    const filteredCatalog = useMemo(() => {
        const base = catalog.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));
        // Ajouter ceux installés mais pas dans le catalogue (quand tu as tiré des exotismes)
        const extras = installed
            .map(m => m.name)
            .filter(n => !base.some(c => c.name === n) && n.toLowerCase().includes(query.toLowerCase()))
            .map(n => ({ name: n, family: "other", task: "chat" as const }));
        return [...base, ...extras].sort((a, b) => a.name.localeCompare(b.name));
    }, [catalog, installed, query]);

    async function pull(name: string) {
        if (busyName) return;
        setBusyName(name);
        setProgress(0);
        setSpeed("");
        const tid = toast.loading(`Installation de ${name}…`);

        const t0 = Date.now();
        let lastCompleted = 0;
        try {
            const res = await fetch("/api/ollama/pull", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!res.body) throw new Error("flux indisponible");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                let idx;
                while ((idx = buf.indexOf("\n")) >= 0) {
                    const line = buf.slice(0, idx).trim();
                    buf = buf.slice(idx + 1);
                    if (!line) continue;
                    const evt = parseOllamaPullLine(line);
                    if (evt?.total && evt?.completed) {
                        const pct = Math.floor((evt.completed / evt.total) * 100);
                        setProgress(pct);

                        // vitesse approx
                        const dt = (Date.now() - t0) / 1000;
                        const bytesPerSec = (evt.completed - lastCompleted) / Math.max(0.1, dt);
                        lastCompleted = evt.completed;
                        setSpeed(`${formatBytes(bytesPerSec)}/s`);
                    }
                }
            }
            toast.success(`Modèle ${name} installé.`);
            await refresh();
        } catch (e: any) {
            toast.error(`Échec installation: ${e?.message ?? "inconnu"}`);
        } finally {
            toast.dismiss(tid);
            setBusyName(null);
            setTimeout(() => setProgress(0), 800);
        }
    }

    async function remove(name: string) {
        if (busyName) return;
        const tid = toast.loading(`Suppression de ${name}…`);
        try {
            const r = await fetch("/api/ollama/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!r.ok) throw new Error("delete failed");
            toast.success(`${name} supprimé.`);
            await refresh();
        } catch (e: any) {
            toast.error(`Échec suppression: ${e?.message ?? "inconnu"}`);
        } finally {
            toast.dismiss(tid);
        }
    }

    return (
        <Card className="w-full border-white/10 bg-black/70 p-4">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-white/80">Gestion des modèles</div>
            </div>

            <Input
                placeholder="Rechercher un modèle…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-4 bg-white/5 text-white placeholder:text-white/40"
            />

            {/* Installés */}
            <div className="mb-2 text-xs uppercase tracking-widest text-white/50">Installés</div>
            <ScrollArea className="max-h-56 rounded-lg border border-white/10">
                <div className="divide-y divide-white/10">
                    {filteredInstalled.length === 0 && (
                        <div className="p-3 text-sm text-white/60">Aucun modèle installé.</div>
                    )}
                    {filteredInstalled.map(m => (
                        <div key={m.name} className="flex items-center gap-3 p-3">
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm text-white">{m.name}</div>
                                <div className="text-xs text-white/50">
                                    Taille {formatBytes(m.size)}{runningNames.has(m.name) ? " • chargé en RAM" : ""}
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => pull(m.name)}
                                disabled={!!busyName}
                            >
                                Mettre à jour
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => remove(m.name)}
                                disabled={!!busyName}
                            >
                                Supprimer
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {busyName && (
                <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="mb-1 text-xs text-white/60">Téléchargement: {busyName}</div>
                    <Progress value={progress} className="h-2" />
                    <div className="mt-1 text-xs text-white/50">
                        {progress}% {speed && `• ${speed}`}
                    </div>
                </div>
            )}

            <Separator className="my-4 bg-white/10" />

            {/* Catalogue */}
            <div className="mb-2 text-xs uppercase tracking-widest text-white/50">Catalogue</div>
            <ScrollArea className="max-h-64 rounded-lg border border-white/10">
                <div className="divide-y divide-white/10">
                    {filteredCatalog.length === 0 && (
                        <div className="p-3 text-sm text-white/60">Rien trouvé. Essaie “llama3.2:3b”.</div>
                    )}
                    {filteredCatalog.map(c => (
                        <div key={c.name} className="flex items-center gap-3 p-3">
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm text-white">{c.name}</div>
                                <div className="text-xs text-white/50">{c.family ?? "autre"} • {c.task ?? "chat"}</div>
                            </div>
                            {installedNames.has(c.name) ? (
                                <Button variant="secondary" size="sm" onClick={() => pull(c.name)} disabled={!!busyName}>
                                    Réinstaller
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => pull(c.name)} disabled={!!busyName}>
                                    Installer
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </Card>
    );
}
