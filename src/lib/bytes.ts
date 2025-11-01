export function formatBytes(n?: number) {
    if (!n || n <= 0) return "—";
    const u = ["B","KB","MB","GB","TB"]; const i = Math.floor(Math.log(n)/Math.log(1024));
    return `${(n/Math.pow(1024,i)).toFixed(i?1:0)} ${u[i]}`;
}

export function formatEta(seconds?: number) {
    if (seconds == null || !isFinite(seconds)) return "—";
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60), r = s % 60;
    return m ? `${m}m ${r}s` : `${r}s`;
}