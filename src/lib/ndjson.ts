export async function* ndjsonStream(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line) continue;
            try { yield JSON.parse(line); } catch { /* ignore */ }
        }
    }
    const tail = buf.trim();
    if (tail) { try { yield JSON.parse(tail); } catch {} }
}

export function estimateTokens(text: string) {
    // Estimation pépère: ~4 chars / token (suffisant pour une jauge UX)
    return Math.max(1, Math.round(text.length / 4));
}
