// app/api/ollama/available/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const catalog = [
        { name: "llama3.2:1b", family: "llama", task: "chat" },
        { name: "llama3.2:3b", family: "llama", task: "chat" },
        { name: "llama3.1:8b", family: "llama", task: "chat" },
        { name: "mistral:7b-instruct", family: "mistral", task: "chat" },
        { name: "qwen2.5:7b-instruct", family: "qwen", task: "chat" },
        { name: "deepseek-coder:6.7b", family: "code", task: "code" },
        { name: "phi3:mini-4k-instruct-q4", family: "phi", task: "chat" },
        { name: "llava:7b", family: "vision", task: "vision" },
    ];
    return NextResponse.json({ catalog }, { headers: { "Cache-Control": "no-store" } });
}
