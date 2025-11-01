"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useOllamaModels } from "@/hooks/use-ollama-models";
import { useSession } from "@/store/session";
import { ModelManager } from "./model-manager/ModelManager";

export function Sidebar() {
    const defaults = ["llama3.2:3b", "mistral:7b-instruct", "qwen2.5:7b-instruct"];
    const models = useOllamaModels(defaults);
    const { model, setModel } = useSession();

    return (
        <aside className="flex h-full flex-col border-r">
            <div className="p-3">
                <Button className="w-full" variant="default">+ Nouvelle session</Button>
            </div>

            <Separator />

            <div className="p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Modèle actif</div>
                <div className="flex flex-wrap gap-2">
                    {models.map((m) => (
                        <Badge
                            key={m}
                            variant={m === model ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => setModel(m)}
                        >
                            {m}
                        </Badge>
                    ))}
                </div>
            </div>

            <Separator />
            <div className="p-3 text-xs font-medium text-muted-foreground">Gestion des modèles</div>
            <ScrollArea className="flex-1">
                <div className="px-3 pb-6">
                    <ModelManager />
                </div>
            </ScrollArea>
        </aside>
    );
}
