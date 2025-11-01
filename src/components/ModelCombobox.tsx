"use client";

import * as React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandEmpty,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseOllamaPullLine } from "@/lib/progress";
import { formatBytes, formatEta } from "@/lib/bytes";

type Props = {
    value: string | undefined;
    onChange: (v: string) => void;
    installed: string[];
    placeholder?: string;
    catalog?: string[];
    totalRamBytes?: number;
    installedSizeLookup?: Record<string, number | undefined>;
};

export function ModelCombobox({
                                  value,
                                  onChange,
                                  installed,
                                  placeholder = "Choisir un modèle...",
                                  catalog = [],
                              }: Props) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [busy, setBusy] = React.useState<string | null>(null);

    // progression
    const [pct, setPct] = React.useState<number>(0);
    const [completed, setCompleted] = React.useState<number>(0);
    const [total, setTotal] = React.useState<number>(0);
    const [speed, setSpeed] = React.useState<number>(0);
    const [eta, setEta] = React.useState<number | undefined>(undefined);

    const candidates = React.useMemo(() => {
        const set = new Set<string>([...installed, ...catalog]);
        const list = Array.from(set);
        if (query && !list.some(n => n.toLowerCase().includes(query.toLowerCase()))) list.push(query);
        return list.sort((a, b) => a.localeCompare(b));
    }, [installed, catalog, query]);

    async function ensure(model: string) {
        if (installed.includes(model)) {
            onChange(model);
            setOpen(false);
            return;
        }

        setBusy(model);
        setPct(0);
        setCompleted(0);
        setTotal(0);
        setEta(undefined);
        setSpeed(0);
        const tid = toast.loading(`Installation de ${model}…`);

        try {
            const res = await fetch("/api/ollama/pull", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: model }),
            });
            if (!res.body) throw new Error("flux indisponible");

            // lecture NDJSON + calcul vitesse/ETA
            const start = Date.now();
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = "",
                lastCompleted = 0,
                lastTs = start;

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
                    if (!evt) continue;

                    if (typeof evt.total === "number") setTotal(evt.total);
                    if (typeof evt.completed === "number" && typeof evt.total === "number" && evt.total > 0) {
                        setCompleted(evt.completed);
                        const p = Math.max(0, Math.min(100, Math.floor((evt.completed / evt.total) * 100)));
                        setPct(p);

                        const now = Date.now();
                        const dt = (now - lastTs) / 1000;
                        if (dt >= 0.25) {
                            const dBytes = evt.completed - lastCompleted;
                            const spd = dBytes / dt; // B/s
                            setSpeed(spd);
                            lastCompleted = evt.completed;
                            lastTs = now;

                            const remain = evt.total - evt.completed;
                            setEta(spd > 0 ? remain / spd : undefined);
                        }
                    }
                }
            }

            toast.success(`Modèle ${model} installé.`);
            onChange(model);
            setOpen(false);
        } catch (e: any) {
            toast.error(`Échec installation: ${e?.message ?? "inconnu"}`);
        } finally {
            toast.dismiss(tid);
            setBusy(null);
            // on laisse la barre visible une seconde pour l’ego, puis on reset
            setTimeout(() => {
                setPct(0);
                setCompleted(0);
                setTotal(0);
                setEta(undefined);
                setSpeed(0);
            }, 1000);
        }
    }

    return (
        <div className="space-y-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
                        variant="outline"
                        disabled={!!busy}
                    >
            <span className={cn("truncate", !value && "text-white/50")}>
              {value || placeholder}
            </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-white/10 bg-[#0b0b0b] text-white">
                    <Command filter={(v, q) => (v.toLowerCase().includes(q.toLowerCase()) ? 1 : 0)}>
                        <CommandInput
                            placeholder="Rechercher ou saisir un nom exact…"
                            value={query}
                            onValueChange={setQuery}
                        />
                        <CommandList>
                            <CommandEmpty>Aucun modèle. Tape un nom pour installer.</CommandEmpty>
                            <CommandGroup heading="Modèles">
                                {candidates.map(m => (
                                    <CommandItem key={m} value={m} onSelect={() => (busy ? null : ensure(m))}>
                                        <Check className={cn("mr-2 h-4 w-4", value === m ? "opacity-100" : "opacity-0")} />
                                        <span className="truncate">{m}</span>
                                        {!installed.includes(m) && (
                                            <span className="ml-auto text-xs text-white/60">
                        {busy === m ? "…" : "installer"}
                      </span>
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Barre de progression détaillée */}
            {busy && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/80">
                    <div className="mb-1 flex items-center justify-between">
            <span>
              Téléchargement: <b className="text-white">{busy}</b>
            </span>
                        <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded bg-white/10">
                        <div className="h-full bg-white/70 transition-[width]" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3">
                        <div>
                            Reçu: <b className="text-white">{formatBytes(completed)}</b>
                        </div>
                        <div>
                            Total: <b className="text-white">{formatBytes(total)}</b>
                        </div>
                        <div>
                            Restant:{" "}
                            <b className="text-white">
                                {formatBytes(total && completed ? total - completed : 0)}
                            </b>
                        </div>
                        <div>
                            Vitesse: <b className="text-white">{speed ? `${formatBytes(speed)}/s` : "—"}</b>
                        </div>
                        <div>
                            ETA: <b className="text-white">{formatEta(eta)}</b>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}