"use client";

import { Sidebar } from "./Sidebar";
import { Inspector } from "./Inspector";
import { ChatPanel } from "./ChatPanel";

export function AIConsole() {
    return (
        <div className="grid h-screen w-screen grid-cols-[280px_1fr_320px] bg-background text-foreground">
            <Sidebar />
            <ChatPanel />
            <Inspector />
        </div>
    );
}
