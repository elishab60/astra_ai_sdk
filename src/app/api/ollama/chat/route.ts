// app/api/ollama/chat/route.ts
import { chatStream, ensureModel } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// valeurs par défaut côté serveur (au cas où le front n'envoie rien)
const DEFAULT_OLLAMA_OPTIONS = {
    temperature: 0.25,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    num_predict: 512,
};

export async function POST(req: Request) {
    const { model, messages, options, system } = await req.json();

    if (!model || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: "Bad payload" }), {
            status: 400,
        });
    }

    // si le front a mis un system prompt séparé, on l'injecte en tête
    const finalMessages = system
        ? [{ role: "system", content: system }, ...messages]
        : messages;

    // s'assurer que le modèle est présent / téléchargé
    await ensureModel(model);

    // merge des options (ce que le front envoie > defaults)
    const mergedOptions = {
        ...DEFAULT_OLLAMA_OPTIONS,
        ...(options ?? {}),
    };

    // on appelle ton helper qui stream en NDJSON
    const upstream = await chatStream({
        model,
        messages: finalMessages,
        options: mergedOptions,
    });

    return new Response(upstream, {
        headers: {
            "Content-Type": "application/x-ndjson",
            "Cache-Control": "no-store",
        },
    });
}