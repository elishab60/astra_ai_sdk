"use client";

import * as React from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Paperclip,
    Image as ImageIcon,
    FileText,
    Mic,
    Send,
    X,
} from "lucide-react";
import { ndjsonStream } from "@/lib/ndjson";
import { CodeEditor } from "@/components/ui/shadcn-io/code-editor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

/* -------------------------------------------------------
   Types
------------------------------------------------------- */

type Attachment = {
    id: string;
    kind: "image";
    name: string;
    dataUrl: string;
    base64: string;
};

type Msg = {
    id: string;
    role: "user" | "assistant";
    content: string;
    attachments?: Attachment[];
};

type OllamaContentPart =
    | { type: "text"; text: string }
    | { type: "image"; image: string };

function serializeMessage(msg: Msg) {
    if (!msg.attachments?.length) {
        return { role: msg.role, content: msg.content };
    }

    const parts: OllamaContentPart[] = [];

    if (msg.content.trim()) {
        parts.push({ type: "text", text: msg.content });
    }

    for (const attachment of msg.attachments) {
        parts.push({ type: "image", image: attachment.base64 });
    }

    // Ollama attend un tableau quand il y a des images.
    // S'il n'y a pas de texte, on envoie uniquement les parties image.
    return { role: msg.role, content: parts };
}

function getErrorMessage(error: unknown) {
    if (typeof error === "string") return error;
    if (typeof error === "object" && error && "message" in error) {
        const maybeMessage = (error as { message?: unknown }).message;
        if (typeof maybeMessage === "string") return maybeMessage;
    }
    return "";
}

async function fileToAttachment(file: File): Promise<Attachment> {
    const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const [, base64 = ""] = dataUrl.split(",");
    if (!base64) throw new Error("Impossible de lire le fichier");

    return {
        id: crypto.randomUUID(),
        kind: "image",
        name: file.name,
        dataUrl,
        base64,
    };
}

type GenerationOptions = {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    num_predict?: number;
    system?: string;
    format?: "text" | "json";
};

type ChatCardProps = {
    fontClass?: string;
    model?: string;
    onRunStart?: (input: string) => void;
    onDelta?: (delta: string) => void;
    onRunEnd?: (ms: number) => void;
    onFirstToken?: () => void;
    className?: string;
    /** DOIT être passé par le parent */
    variant?: "dark" | "light";
    /** paramètres envoyés à /api/ollama/chat */
    generationOptions?: GenerationOptions;
};

type Segment =
    | { kind: "text"; content: string }
    | { kind: "code"; lang: string; code: string; open: boolean };

/* -------------------------------------------------------
   Parsing des ``` fences qui streament
------------------------------------------------------- */

function parseStreamingFences(src: string): Segment[] {
    const segs: Segment[] = [];
    let i = 0;
    let mode: "text" | "code" = "text";
    let buf = "";
    let codeBuf = "";
    let lang = "";
    let opener: "```" | "'''" | null = null;

    const flushText = () => {
        if (buf.length) segs.push({ kind: "text", content: buf });
        buf = "";
    };
    const flushCode = (open: boolean) => {
        segs.push({ kind: "code", lang: lang || "text", code: codeBuf, open });
        codeBuf = "";
    };

    while (i < src.length) {
        if (mode === "text") {
            if (src.startsWith("```", i) || src.startsWith("'''", i)) {
                const mark = src.startsWith("```", i) ? "```" : "'''";
                const nl = src.indexOf("\n", i + 3);
                let header = "";
                if (nl === -1) {
                    header = src.slice(i + 3);
                    flushText();
                    opener = mark as "```" | "'''";
                    lang = header.trim().split(/\s+/)[0] || "text";
                    mode = "code";
                    i = src.length;
                    break;
                } else {
                    header = src.slice(i + 3, nl);
                    flushText();
                    opener = mark as "```" | "'''";
                    lang = header.trim().split(/\s+/)[0] || "text";
                    mode = "code";
                    i = nl + 1;
                    continue;
                }
            } else {
                buf += src[i++];
            }
        } else {
            if (opener === "```" && src.startsWith("```", i)) {
                flushCode(false);
                mode = "text";
                opener = null;
                lang = "";
                i += 3;
                if (src[i] === "\n") i++;
                continue;
            }
            if (opener === "'''" && src.startsWith("'''", i)) {
                flushCode(false);
                mode = "text";
                opener = null;
                lang = "";
                i += 3;
                if (src[i] === "\n") i++;
                continue;
            }
            codeBuf += src[i++];
        }
    }

    if (mode === "text") flushText();
    else flushCode(true);

    const merged: Segment[] = [];
    for (const s of segs) {
        const last = merged[merged.length - 1];
        if (s.kind === "text" && last?.kind === "text") last.content += s.content;
        else merged.push(s);
    }
    return merged;
}

/* -------------------------------------------------------
   Bulle texte
------------------------------------------------------- */

function TextBubble({
                        children,
                        variant = "dark",
                    }: {
    children: string;
    variant?: "dark" | "light";
}) {
    if (!children.trim()) return null;
    const isDark = variant === "dark";
    return (
        <div
            className={
                isDark
                    ? "prose prose-invert max-w-none rounded-2xl rounded-tl-md border border-white/10 bg-white/5 px-6 py-5 shadow-inner text-[15px] leading-relaxed"
                    : "prose max-w-none rounded-2xl rounded-tl-md border border-slate-200 bg-white px-6 py-5 shadow-sm text-[15px] leading-relaxed"
            }
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    h1: ({ ...props }) => (
                        <h1
                            className={
                                isDark
                                    ? "mt-6 mb-3 text-3xl font-semibold text-white border-b border-white/10 pb-1"
                                    : "mt-6 mb-3 text-3xl font-semibold text-slate-950 border-b border-slate-200 pb-1"
                            }
                            {...props}
                        />
                    ),
                    h2: ({ ...props }) => (
                        <h2
                            className={
                                isDark
                                    ? "mt-5 mb-2 text-2xl font-semibold text-white/95 border-b border-white/10 pb-0.5"
                                    : "mt-5 mb-2 text-2xl font-semibold text-slate-900 border-b border-slate-200 pb-0.5"
                            }
                            {...props}
                        />
                    ),
                    p: ({ ...props }) => (
                        <p
                            className={
                                isDark
                                    ? "my-3 text-white/90 leading-relaxed"
                                    : "my-3 text-slate-700 leading-relaxed"
                            }
                            {...props}
                        />
                    ),
                    code({ children, className, ...rest }: React.ComponentPropsWithoutRef<"code">) {
                        const match = /language-(\w+)/.exec(className || "");
                        return match ? (
                            <pre
                                className={
                                    isDark
                                        ? "rounded-xl bg-[#0b0b0b] border border-white/10 p-4 text-[13px] overflow-x-auto leading-snug my-4"
                                        : "rounded-xl bg-slate-950/5 border border-slate-200 p-4 text-[13px] overflow-x-auto leading-snug my-4"
                                }
                            >
                <code className={className} {...rest}>
                  {children}
                </code>
              </pre>
                        ) : (
                            <code
                                className={
                                    isDark
                                        ? "bg-white/10 px-1.5 py-0.5 rounded-md text-[0.9em] text-white/90"
                                        : "bg-slate-100 px-1.5 py-0.5 rounded-md text-[0.9em] text-slate-900"
                                }
                                {...rest}
                            >
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
}

/* -------------------------------------------------------
   Paneau de code
------------------------------------------------------- */

function CodePane({
                      lang,
                      code,
                      open,
                      variant = "dark",
                  }: {
    lang: string;
    code: string;
    open: boolean;
    variant?: "dark" | "light";
}) {
    const isDark = variant === "dark";
    return (
        <div className="relative">
            <CodeEditor
                lang={lang || "text"}
                title={lang || "txt"}
                writing={false}
                copyButton
                cursor
                className="w-full max-w-[80vw] md:max-w-[900px] h-[360px]"
                themes={{ light: "vitesse-light", dark: "vitesse-dark" }}
            >
                {code}
            </CodeEditor>
            {open ? (
                <div
                    className={
                        isDark
                            ? "absolute right-3 bottom-3 text-[11px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/70"
                            : "absolute right-3 bottom-3 text-[11px] px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600"
                    }
                >
                    streaming…
                </div>
            ) : null}
        </div>
    );
}

/* -------------------------------------------------------
   Message assistant
------------------------------------------------------- */

function AssistantBubble({
                             content,
                             variant = "dark",
                         }: {
    content: string;
    variant?: "dark" | "light";
}) {
    const segments = React.useMemo(() => parseStreamingFences(content), [content]);
    return (
        <div className="max-w-[90%] flex flex-col gap-y-4">
            {segments.map((s, i) =>
                s.kind === "text" ? (
                    <TextBubble key={i} variant={variant}>
                        {s.content}
                    </TextBubble>
                ) : (
                    <CodePane
                        key={i}
                        lang={s.lang}
                        code={s.code}
                        open={s.open}
                        variant={variant}
                    />
                )
            )}
        </div>
    );
}

/* -------------------------------------------------------
   Composant principal
------------------------------------------------------- */

export function ChatCard({
                             fontClass = "",
                             model,
                             onRunStart,
                             onDelta,
                             onRunEnd,
                             onFirstToken,
                             className = "",
                             variant = "dark",
                             generationOptions,
                         }: ChatCardProps) {
    const [messages, setMessages] = React.useState<Msg[]>([]);
    const [input, setInput] = React.useState("");
    const [expanded, setExpanded] = React.useState(false);
    const [firstTokenSeen, setFirstTokenSeen] = React.useState(false);
    const [streaming, setStreaming] = React.useState(false);
    const [pendingAttachments, setPendingAttachments] = React.useState<Attachment[]>([]);

    const viewerRef = React.useRef<HTMLDivElement | null>(null);
    const stickToBottomRef = React.useRef(true);
    const assistantIndexRef = React.useRef<number | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const fileIntentRef = React.useRef<"image" | "file" | "audio" | null>(null);

    // Ajout : ref pour gérer l'annulation de la requête
    const controllerRef = React.useRef<AbortController | null>(null);

    const handleScroll = React.useCallback(() => {
        const el = viewerRef.current;
        if (!el) return;
        const threshold = 24;
        stickToBottomRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    }, []);

    const scrollToBottomIfNeeded = React.useCallback(() => {
        const el = viewerRef.current;
        if (!el) return;
        if (stickToBottomRef.current) el.scrollTop = el.scrollHeight;
    }, []);

    React.useEffect(() => {
        scrollToBottomIfNeeded();
    }, [messages.length, scrollToBottomIfNeeded]);

    function openFileDialog(accept?: string, kind?: "image" | "file" | "audio") {
        const el = fileInputRef.current;
        if (!el) return;
        fileIntentRef.current = kind ?? null;
        el.value = "";
        if (accept) el.accept = accept;
        else el.removeAttribute("accept");
        el.click();
    }

    function removeAttachment(id: string) {
        console.debug?.("[ChatCard] removeAttachment", id);
        setPendingAttachments((prev) => prev.filter((att) => att.id !== id));
    }

    async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files?.length) return;
        const intent = fileIntentRef.current;
        fileIntentRef.current = null;

        console.debug?.("[ChatCard] files selected", {
            intent,
            count: files.length,
            names: Array.from(files).map((file) => ({
                name: file.name,
                type: file.type,
                size: file.size,
            })),
        });

        if (intent !== "image") {
            const names = Array.from(files)
                .map((f) => f.name)
                .join(", ");
            setMessages((prev) => [
                ...prev,
                { id: crypto.randomUUID(), role: "user", content: `📎 ${names}` },
            ]);
            return;
        }

        const attachments: Attachment[] = [];
        for (const file of Array.from(files)) {
            if (!file.type.startsWith("image/")) continue;
            try {
                const attachment = await fileToAttachment(file);
                attachments.push(attachment);
                console.debug?.("[ChatCard] attachment ready", attachment);
            } catch (err) {
                console.error(err);
            }
        }

        if (!attachments.length) {
            alert("Impossible de lire les images sélectionnées.");
            return;
        }

        setPendingAttachments((prev) => {
            const next = [...prev, ...attachments];
            console.debug?.("[ChatCard] pending attachments", next);
            return next;
        });
    }

    async function send(text: string) {
        console.debug?.("[ChatCard] send() invoked", { text, hasAttachments: pendingAttachments.length > 0 });
        if (!model) {
            alert("Choisis d’abord un modèle.");
            return;
        }
        if (!text.trim() && pendingAttachments.length === 0) {
            return;
        }
        setStreaming(true);
        const startedAt = Date.now();
        const attachments = pendingAttachments;
        setPendingAttachments([]);

        const userMessage: Msg = {
            id: crypto.randomUUID(),
            role: "user",
            content: text,
            attachments: attachments.length ? attachments : undefined,
        };
        const assistantMessage: Msg = { id: crypto.randomUUID(), role: "assistant", content: "" };

        // on rajoute le message user + un message assistant vide
        setMessages((prev) => {
            const next = [...prev, userMessage, assistantMessage];
            assistantIndexRef.current = next.length - 1;
            return next;
        });
        onRunStart?.(text);

        // Création de l'AbortController et stockage
        const ctrl = new AbortController();
        controllerRef.current = ctrl;

        const serializedMessages = [
            ...messages.map((m) => serializeMessage(m)),
            serializeMessage(userMessage),
        ];

        const payload = {
            model,
            messages: serializedMessages,
            options: generationOptions,
            system: generationOptions?.system,
        };

        if (typeof console.groupCollapsed === "function" && typeof console.groupEnd === "function") {
            console.groupCollapsed("[ChatCard] outgoing payload");
            console.debug("[ChatCard] payload", payload);
            console.debug("[ChatCard] model", model);
            console.debug("[ChatCard] pending attachments count", attachments.length);
            console.debug("[ChatCard] serialized messages", serializedMessages);
            console.groupEnd();
        } else {
            console.debug?.("[ChatCard] payload", payload);
        }

        try {
            const res = await fetch("/api/ollama/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: ctrl.signal,
                body: JSON.stringify(payload),
            });

            console.debug?.("[ChatCard] /api/ollama/chat status", res.status, res.statusText);

            if (!res.ok || !res.body) {
                const errText = await res.text().catch(() => "");
                console.error("[ChatCard] upstream error", errText);
                throw new Error(errText || `Chat failed (${res.status})`);
            }

            let first = true;
            let acc = "";
            let scheduled = false;

            for await (const evt of ndjsonStream(res.body)) {
                console.debug?.("[ChatCard] NDJSON event", evt);
                const delta = evt?.message?.content ?? "";
                if (!delta) continue;

                if (first) {
                    first = false;
                    setFirstTokenSeen(true);
                    setExpanded(true);
                    onFirstToken?.();
                }

                acc += delta;
                onDelta?.(delta);

                if (!scheduled) {
                    scheduled = true;
                    requestAnimationFrame(() => {
                        setMessages((prev) => {
                            const idx = assistantIndexRef.current;
                            if (idx == null || idx < 0 || idx >= prev.length) return prev;
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], content: acc };
                            return copy;
                        });
                        scrollToBottomIfNeeded();
                        scheduled = false;
                    });
                }
            }
        } catch (e: unknown) {
            console.error("[ChatCard] send() failed", e);
            // Si l'erreur provient d'un abort on affiche un message dédié
            const aborted = typeof e === "object" && e instanceof DOMException && e.name === "AbortError";
            setMessages((prev) => {
                const idx = assistantIndexRef.current;
                if (idx == null || idx < 0 || idx >= prev.length) return prev;
                const copy = [...prev];
                copy[idx] = {
                    ...copy[idx],
                    content: aborted
                        ? "Génération arrêtée."
                        : `Erreur: impossible de joindre le modèle. ${(() => {
                              const details = getErrorMessage(e);
                              return details ? `Détails: ${details}` : "";
                          })()}`,
                };
                return copy;
            });
        } finally {
            // nettoyage
            controllerRef.current = null;
            setStreaming(false);
            onRunEnd?.(Date.now() - startedAt);
        }
    }

    // Nouvelle fonction pour arrêter la génération en cours
    function stopGeneration() {
        console.debug?.("[ChatCard] stopGeneration()");
        if (controllerRef.current) {
            controllerRef.current.abort();
            // on met streaming à false immédiatement pour update UI (le catch gérera le message)
            setStreaming(false);
        }
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const text = input.trim();
        if (!text && pendingAttachments.length === 0) return;
        // Respecte l'ancien comportement: si streaming et pas expandé on bloque
        if (streaming && !expanded) return;
        setInput("");
        void send(text);
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            // idem : bloque si streaming et pas expandé
            if (streaming && !expanded) return;
            const text = input.trim();
            if (!text && pendingAttachments.length === 0) return;
            setInput("");
            void send(text);
        }
    }

    const isDark = variant === "dark";

    const cardBase = isDark
        ? "w-full mx-auto overflow-hidden rounded-[32px] border border-white/10 bg-black/90 backdrop-blur-xl shadow-[0_10px_50px_rgba(0,0,0,0.6)] transition-all duration-1500"
        : "w-full mx-auto overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_10px_50px_rgba(15,23,42,0.04)] transition-all duration-1500";

    const cardSize = expanded ? "w-[80vw]" : "w-[80vw] max-w-[720px]";
    const viewerMaxH = expanded ? "max-h-[65vh]" : "max-h-0";
    const viewerBase =
        "overflow-y-auto transition-[max-height] duration-500 ease-out px-4 py-4 scrollbar-thin scrollbar-thumb-slate-700/50";

    return (
        <Card
            className={[cardBase, fontClass || "font-sans", cardSize, className].join(
                " "
            )}
        >
            {firstTokenSeen && model ? (
                <div
                    className={
                        isDark
                            ? "pointer-events-none absolute right-4 top-4 z-10 select-none rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/80"
                            : "pointer-events-none absolute right-4 top-4 z-10 select-none rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                    }
                >
                    {model}
                </div>
            ) : null}

            <CardContent className="p-0">
                <div
                    ref={viewerRef}
                    onScroll={handleScroll}
                    className={[viewerBase, viewerMaxH].join(" ")}
                >
                    {messages.map((m) => (
                        <div key={m.id} className="mb-3 flex mt-8">
                            {m.role === "assistant" ? (
                                <AssistantBubble content={m.content} variant={variant} />
                            ) : (
                                <div
                                    className={
                                        isDark
                                            ? "ml-auto max-w-[80%] rounded-2xl rounded-tr-md border border-white/10 bg-white/10 px-4 py-2 text-sm leading-relaxed text-white whitespace-pre-wrap"
                                            : "ml-auto max-w-[80%] rounded-2xl rounded-tr-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm leading-relaxed text-slate-950 whitespace-pre-wrap"
                                    }
                                >
                                    {m.content}
                                    {m.attachments?.length ? (
                                        <div className="mt-3 flex flex-wrap gap-3">
                                            {m.attachments.map((attachment) => (
                                                <div
                                                    key={attachment.id}
                                                    className={
                                                        isDark
                                                            ? "overflow-hidden rounded-xl border border-white/10 bg-black/40"
                                                            : "overflow-hidden rounded-xl border border-slate-200 bg-white"
                                                    }
                                                >
                                                    <Image
                                                        src={attachment.dataUrl}
                                                        alt={attachment.name}
                                                        width={96}
                                                        height={96}
                                                        className="h-24 w-24 object-cover"
                                                        unoptimized
                                                    />
                                                    <p
                                                        className={
                                                            isDark
                                                                ? "px-2 py-1 text-[11px] text-white/70"
                                                                : "px-2 py-1 text-[11px] text-slate-600"
                                                        }
                                                    >
                                                        {attachment.name}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>

            <CardFooter
                className={
                    isDark
                        ? "border-t border-white/10 px-4 py-3"
                        : "border-t border-slate-200 px-4 py-3"
                }
            >
                <form onSubmit={onSubmit} className="flex w-full items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant={isDark ? "outline" : "ghost"}
                                className={
                                    isDark
                                        ? "h-10 w-10 shrink-0 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 p-0"
                                        : "h-10 w-10 shrink-0 rounded-full border-slate-200 bg-white text-slate-800 hover:bg-slate-100 p-0"
                                }
                            >
                                <Paperclip className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="start"
                            className={
                                isDark
                                    ? "border-white/10 bg-[#0b0b0b] text-white rounded-xl"
                                    : "border-slate-200 bg-white text-slate-900 rounded-xl"
                            }
                        >
                            <DropdownMenuItem onClick={() => openFileDialog("image/*", "image")}>
                                <ImageIcon className="mr-2 h-4 w-4" /> Photo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => openFileDialog(".pdf,.txt,.md,.doc,.docx", "file")}
                            >
                                <FileText className="mr-2 h-4 w-4" /> Fichier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openFileDialog("audio/*", "audio")}>
                                <Mic className="mr-2 h-4 w-4" /> Audio
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        onChange={onFilesSelected}
                    />

                    <div className="flex flex-1 flex-col gap-2">
                        {pendingAttachments.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {pendingAttachments.map((attachment) => (
                                    <div
                                        key={attachment.id}
                                        className={
                                            isDark
                                                ? "relative overflow-hidden rounded-2xl border border-white/10 bg-black/40"
                                                : "relative overflow-hidden rounded-2xl border border-slate-200 bg-white"
                                        }
                                    >
                                        <Image
                                            src={attachment.dataUrl}
                                            alt={attachment.name}
                                            width={96}
                                            height={80}
                                            className="h-20 w-24 object-cover"
                                            unoptimized
                                        />
                                        <div
                                            className={
                                                isDark
                                                    ? "flex items-center justify-between px-2 py-1 text-[11px] text-white/70"
                                                    : "flex items-center justify-between px-2 py-1 text-[11px] text-slate-600"
                                            }
                                        >
                                            <span className="max-w-[85px] truncate pr-2">{attachment.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(attachment.id)}
                                                className={
                                                    isDark
                                                        ? "rounded-full border border-white/10 p-1 text-white/70 hover:bg-white/10"
                                                        : "rounded-full border border-slate-200 p-1 text-slate-600 hover:bg-slate-100"
                                                }
                                                aria-label="Retirer l'image"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Écris ton prompt ici…"
                            className={
                                isDark
                                    ? "h-10 flex-1 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-white/20"
                                    : "h-10 flex-1 rounded-full border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-200"
                            }
                        />
                    </div>

                    {streaming ? (
                        // Bouton "Arrêter" pendant une génération en cours
                        <Button
                            type="button"
                            onClick={stopGeneration}
                            className={
                                isDark
                                    ? "h-10 shrink-0 rounded-full border-white/10 bg-red-600/10 text-white hover:bg-red-600/15"
                                    : "h-10 shrink-0 rounded-full border-slate-200 bg-red-50 text-red-700 hover:bg-red-100"
                            }
                            variant={isDark ? "outline" : "ghost"}
                        >
                            {/* Spinner tant que pas de premier token, sinon icône X */}
                            {streaming && !firstTokenSeen ? (
                                <svg
                                    className="animate-spin mr-2 h-4 w-4 text-white/90"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    />
                                </svg>
                            ) : (
                                <X className="mr-2 h-4 w-4" />
                            )}
                            Arrêter
                        </Button>
                    ) : (
                        // Bouton Envoyer habituel
                        <Button
                            type="submit"
                            disabled={streaming && !expanded}
                            className={
                                isDark
                                    ? "h-10 shrink-0 rounded-full border-white/10 bg-white/10 text-white hover:bg-white/15"
                                    : "h-10 shrink-0 rounded-full border-slate-200 bg-slate-900 text-white hover:bg-slate-800"
                            }
                            variant={isDark ? "outline" : "default"}
                        >
                            <Send className="mr-2 h-4 w-4" />
                            Envoyer
                        </Button>
                    )}
                </form>
            </CardFooter>
        </Card>
    );
}