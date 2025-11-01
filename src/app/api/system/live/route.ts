import { NextResponse } from "next/server";
import si from "systeminformation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const [load, mem, graphics, fs] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.graphics(),
            si.fsSize(),
        ]);

        const gpu = (graphics?.controllers ?? []).map((g) => ({
            model: g.model,
            utilization: typeof g.utilizationGpu === "number" ? g.utilizationGpu : null, // pas toujours dispo
            vramUsedMB: typeof g.memoryUsed === "number" ? g.memoryUsed : null,
            vramTotalMB: typeof g.memoryTotal === "number" ? g.memoryTotal : g.vram ?? null,
        }));

        // Volume principal
        const root = (fs ?? []).find((v) => v.mount === "/") ?? (fs ?? [])[0] ?? null;

        return NextResponse.json(
            {
                cpu: { percent: load.currentLoad }, // 0..100
                mem: { total: mem.total, used: mem.used, free: mem.free },
                gpu,
                disk: root
                    ? { mount: root.mount, used: root.used, size: root.size }
                    : null,
            },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "live info failed" }, { status: 500 });
    }
}