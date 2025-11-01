// store/session.ts
"use client";
import { create } from "zustand";

export type ChatMessage = { id: string; role: "system" | "user" | "assistant"; content: string; };
export type SessionParams = { temperature: number; top_p: number; max_tokens: number; };

type SessionState = {
    sessionId: string;
    title: string;
    model: string;
    system?: string;
    params: SessionParams;
    messages: ChatMessage[];
    setModel: (m: string) => void;
    setParams: (p: Partial<SessionParams>) => void;
    setSystem: (s: string) => void;
    pushMessage: (m: ChatMessage) => void;
    replaceMessage: (id: string, content: string) => void;
};

export const useSession = create<SessionState>((set, get) => ({
    sessionId: crypto.randomUUID(),
    title: "New session",
    model: "llama3.2:3b",
    system: "You are a helpful assistant.",
    params: { temperature: 0.7, top_p: 0.9, max_tokens: 2048 },
    messages: [
        { id: crypto.randomUUID(), role: "assistant", content: "Bienvenue. Pose ta question." },
    ],
    setModel: (model) => set({ model }),
    setParams: (p) => set({ params: { ...get().params, ...p } }),
    setSystem: (s) => set({ system: s }),
    pushMessage: (m) => set({ messages: [...get().messages, m] }),
    replaceMessage: (id, content) =>
        set({ messages: get().messages.map(m => m.id === id ? { ...m, content } : m) }),
}));
