"use client";

import * as React from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    SlidersHorizontal,
    Info,
} from "lucide-react";

export type ModelOptions = {
    temperature: number;
    top_p: number;
    top_k: number;
    repeat_penalty: number;
    num_predict: number;
    system?: string;
    format?: "text" | "json";
};

const DEFAULT_OPTIONS: ModelOptions = {
    temperature: 0.25,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    num_predict: 512,
    system: "",
    format: "text",
};

function SmallHelp({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-1 text-[10px] text-white/35 leading-snug">
            <Info className="h-3 w-3 mt-[2px]" />
            <p>{children}</p>
        </div>
    );
}

export function ModelSettingsPopover({
                                         value,
                                         onChange,
                                         className = "",
                                     }: {
    value?: Partial<ModelOptions>;
    onChange?: (next: ModelOptions) => void;
    className?: string;
}) {
    const merged = React.useMemo<ModelOptions>(
        () => ({ ...DEFAULT_OPTIONS, ...(value ?? {}) }),
        [value]
    );

    function push<K extends keyof ModelOptions>(key: K, v: ModelOptions[K]) {
        const next = { ...merged, [key]: v };
        onChange?.(next);
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={`h-9 w-9 rounded-full border-white/15 bg-black/50 p-0 text-white hover:bg-white/10 ${className}`}
                    aria-label="Paramètres du modèle"
                    title="Paramètres du modèle"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-[380px] border-white/10 bg-[#0b0b0b] text-white rounded-2xl p-3"
            >
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <div className="text-xs uppercase tracking-widest text-white/40">
                            Génération IA
                        </div>
                        <div className="text-sm font-medium text-white/90">
                            Paramètres Ollama
                        </div>
                    </div>
                    <div className="text-[10px] text-white/30">
                        Appliqué aux requêtes /api/ollama/chat
                    </div>
                </div>

                <Separator className="my-2 bg-white/10" />

                {/* Temperature */}
                <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-white/80">Température</Label>
                        <span className="text-[10px] text-white/50">
              {merged.temperature.toFixed(2)}
            </span>
                    </div>
                    <Slider
                        min={0}
                        max={1.5}
                        step={0.01}
                        value={[merged.temperature]}
                        onValueChange={([v]) => push("temperature", v)}
                    />
                    <SmallHelp>
                        Plus c’est haut, plus c’est créatif. 0.2–0.4 pour du code, 0.7+ pour
                        du blabla.
                    </SmallHelp>
                </div>

                {/* Top P / Top K */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-white/80">Top P</Label>
                            <span className="text-[10px] text-white/50">
                {merged.top_p.toFixed(2)}
              </span>
                        </div>
                        <Slider
                            min={0.1}
                            max={1}
                            step={0.01}
                            value={[merged.top_p]}
                            onValueChange={([v]) => push("top_p", v)}
                        />
                        <SmallHelp>Filtrage probabiliste. 0.9 par défaut.</SmallHelp>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-white/80">Top K</Label>
                            <span className="text-[10px] text-white/50">
                {merged.top_k}
              </span>
                        </div>
                        <Slider
                            min={1}
                            max={200}
                            step={1}
                            value={[merged.top_k]}
                            onValueChange={([v]) => push("top_k", v)}
                        />
                        <SmallHelp>
                            Taille du panier de tokens candidats (20–50 ok).
                        </SmallHelp>
                    </div>
                </div>

                {/* Repeat penalty */}
                <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-white/80">Repeat penalty</Label>
                        <span className="text-[10px] text-white/50">
              {merged.repeat_penalty.toFixed(2)}
            </span>
                    </div>
                    <Slider
                        min={1}
                        max={2}
                        step={0.01}
                        value={[merged.repeat_penalty]}
                        onValueChange={([v]) => push("repeat_penalty", v)}
                    />
                    <SmallHelp>
                        1.0 = désactivé. 1.1–1.2 évite les boucles.
                    </SmallHelp>
                </div>

                {/* Max tokens */}
                <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-white/80">Longueur sortie</Label>
                        <span className="text-[10px] text-white/50">
              {merged.num_predict} tok
            </span>
                    </div>
                    <Slider
                        min={64}
                        max={4096}
                        step={32}
                        value={[merged.num_predict]}
                        onValueChange={([v]) => push("num_predict", v)}
                    />
                    <SmallHelp>
                        Dans Ollama c’est <code className="text-[10px]">num_predict</code>,
                        c’est ton “max tokens”.
                    </SmallHelp>
                </div>

                <Separator className="my-2 bg-white/10" />

                {/* System prompt */}
                <div className="space-y-1 mb-3">
                    <Label className="text-xs text-white/80">
                        System prompt (optionnel)
                    </Label>
                    <Textarea
                        value={merged.system ?? ""}
                        onChange={(e) => push("system", e.target.value)}
                        placeholder="Tu es ASTRA, assistant local, réponds en français, donne toujours du code TS..."
                        className="min-h-[70px] bg-black/20 border-white/5 text-white text-xs resize-y"
                    />
                    <SmallHelp>
                        Si tu le mets ici, envoie-le dans les messages côté backend en tant
                        que rôle <code className="text-[10px]">system</code>.
                    </SmallHelp>
                </div>

                {/* Format */}
                <div className="space-y-1">
                    <Label className="text-xs text-white/80">Format</Label>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant={merged.format === "text" ? "default" : "outline"}
                            className={
                                merged.format === "text"
                                    ? "bg-slate-100 text-black h-7 px-3 text-xs"
                                    : "border-white/10 bg-transparent text-white/70 h-7 px-3 text-xs"
                            }
                            onClick={() => push("format", "text")}
                        >
                            Texte
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={merged.format === "json" ? "default" : "outline"}
                            className={
                                merged.format === "json"
                                    ? "bg-slate-100 text-black h-7 px-3 text-xs"
                                    : "border-white/10 bg-transparent text-white/70 h-7 px-3 text-xs"
                            }
                            onClick={() => push("format", "json")}
                        >
                            JSON
                        </Button>
                    </div>
                    <SmallHelp>
                        Si tu mets JSON, ajoute un prompt clair. Ollama ne fait pas de JSON
                        “dur” comme OpenAI.
                    </SmallHelp>
                </div>
            </PopoverContent>
        </Popover>
    );
}