"use client";

import { useSession } from "@/store/session";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export function Inspector() {
    const { params, setParams, system, setSystem } = useSession();

    return (
        <aside className="flex h-full w-80 flex-col border-l">
            <div className="p-4">
                <h3 className="text-sm font-semibold">Paramètres</h3>
                <div className="mt-4 space-y-5">
                    <div>
                        <div className="mb-2 text-xs text-muted-foreground">Temperature {params.temperature.toFixed(2)}</div>
                        <Slider value={[params.temperature]} min={0} max={1.5} step={0.05}
                                onValueChange={([v]) => setParams({ temperature: v })} />
                    </div>
                    <div>
                        <div className="mb-2 text-xs text-muted-foreground">Top-p {params.top_p.toFixed(2)}</div>
                        <Slider value={[params.top_p]} min={0} max={1} step={0.05}
                                onValueChange={([v]) => setParams({ top_p: v })} />
                    </div>
                    <div>
                        <div className="mb-2 text-xs text-muted-foreground">Max tokens {params.max_tokens}</div>
                        <Slider value={[params.max_tokens]} min={128} max={8192} step={64}
                                onValueChange={([v]) => setParams({ max_tokens: v })} />
                    </div>
                </div>
            </div>

            <Separator />
            <div className="flex-1 p-4">
                <h3 className="mb-2 text-sm font-semibold">System prompt</h3>
                <Textarea
                    value={system ?? ""}
                    onChange={(e) => setSystem(e.target.value)}
                    placeholder="Tu peux définir ici le comportement de l'assistant."
                    className="h-[220px]"
                />
            </div>
        </aside>
    );
}
