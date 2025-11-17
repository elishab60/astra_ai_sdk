// app/api/ollama/chat/route.ts
import { chatStream, ensureModel } from "@/lib/ollama";

type IncomingMessage = {
    role: "user" | "assistant" | "system";
    content:
        | string
        | Array<
              | { type: "text"; text: string }
              | { type: "image"; image: string }
          >;
};

function summarizeMessages(messages: IncomingMessage[]) {
    return messages.map((msg, index) => {
        const summary: Record<string, unknown> = { index, role: msg.role };
        if (typeof msg.content === "string") {
            summary.kind = "text";
            summary.length = msg.content.length;
            summary.preview = msg.content.slice(0, 80);
        } else {
            summary.kind = "multipart";
            summary.parts = msg.content.map((part) => {
                if (part.type === "text") {
                    return {
                        type: "text",
                        length: part.text.length,
                        preview: part.text.slice(0, 40),
                    };
                }
                return {
                    type: "image",
                    length: part.image.length,
                    preview: part.image.slice(0, 40),
                };
            });
        }
        return summary;
    });
}

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
    const { model, messages, options, system } = (await req.json()) as {
        model?: string;
        messages?: IncomingMessage[];
        options?: Record<string, unknown>;
        system?: string;
    };

    if (!model || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: "Bad payload" }), {
            status: 400,
        });
    }

    console.log("[/api/ollama/chat] incoming", {
        model,
        messageCount: messages.length,
        options,
        systemLength: system?.length ?? 0,
        summaries: summarizeMessages(messages),
    });

    // si le front a mis un system prompt séparé, on l'injecte en tête
    const finalMessages = system
        ? [{ role: "system", content: system }, ...messages]
        : messages;

    // s'assurer que le modèle est présent / téléchargé
    try {
        await ensureModel(model);
        console.log(`[/api/ollama/chat] ensureModel ok for ${model}`);
    } catch (err) {
        console.error(`[/api/ollama/chat] ensureModel failed for ${model}`, err);
        return new Response(JSON.stringify({ error: "ensureModel_failed", details: `${err}` }), {
            status: 500,
        });
    }

    // merge des options (ce que le front envoie > defaults)
    const mergedOptions = {
        ...DEFAULT_OLLAMA_OPTIONS,
        ...(options ?? {}),
    };

    console.log("[/api/ollama/chat] merged options", mergedOptions);

    // on appelle ton helper qui stream en NDJSON
    let upstream: ReadableStream<Uint8Array>;
    try {
        upstream = await chatStream({
            model,
            messages: finalMessages,
            options: mergedOptions,
        });
        console.log(`[/api/ollama/chat] chatStream started for ${model}`);
    } catch (err) {
        console.error(`[/api/ollama/chat] chatStream failed for ${model}`, err);
        return new Response(JSON.stringify({ error: "chat_failed", details: `${err}` }), {
            status: 502,
        });
    }

    return new Response(upstream, {
        headers: {
            "Content-Type": "application/x-ndjson",
            "Cache-Control": "no-store",
        },
    });
}