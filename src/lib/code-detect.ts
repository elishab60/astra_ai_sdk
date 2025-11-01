// lib/code-detect.ts
export type DetectedBlock = { lang: string; code: string };

export function detectCodeBlocks(text: string): DetectedBlock[] {
    const blocks: DetectedBlock[] = [];
    let m: RegExpExecArray | null;

    // ```lang ... ```
    const fenceRe = /```(\w+)?[^\n]*\n([\s\S]*?)```/g;
    while ((m = fenceRe.exec(text)) !== null) {
        const lang = (m[1] || "text").toLowerCase();
        const code = (m[2] || "").trim();
        if (code) blocks.push({ lang, code });
    }

    // '''lang / ... '''
    const tripleQuoteWeird = /'''(\w+)\s*\/\s*([\s\S]*?)'''/g;
    while ((m = tripleQuoteWeird.exec(text)) !== null) {
        const lang = (m[1] || "text").toLowerCase();
        const code = (m[2] || "").trim();
        if (code) blocks.push({ lang, code });
    }

    return blocks;
}

export function stripBlocks(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/'''[\s\S]*?'''/g, "")
        .trim();
}