import { NextResponse } from "next/server";
import si from "systeminformation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// mapping fait à la main pour Apple Silicon
function guessAppleGpuCores(model?: string | null): number | null {
    if (!model) return null;
    const m = model.toLowerCase();

    // ton cas
    if (m.includes("m1 max")) {
        // il existe 24c et 32c → tu as dit "M1 Max 32 cœurs"
        return 32;
    }

    // autres cas utiles
    if (m.includes("m1 pro")) return 16; // 14 ou 16
    if (m.includes("m1")) return 8;

    if (m.includes("m2 max")) return 38;
    if (m.includes("m2 pro")) return 19;
    if (m.includes("m2")) return 10;

    if (m.includes("m3 max")) return 40; // valeur indicative
    if (m.includes("m3 pro")) return 20;

    return null;
}

export async function GET() {
    try {
        const [cpu, mem, graphics, fs, osInfo, network] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.graphics(),
            si.fsSize(),
            si.osInfo(),
            si.networkInterfaces(),
        ]);

        // GPU(s)
        const gpuControllers = graphics?.controllers ?? [];
        const gpu0 = gpuControllers[0] ?? null;

        const gpu =
            gpu0
                ? {
                    vendor: gpu0.vendor,
                    model: gpu0.model,
                    vramMB: gpu0.vram ?? (gpu0.memoryTotal ? gpu0.memoryTotal / 1024 / 1024 : null),
                    // 👇 c'est là qu'on injecte le nombre de cœurs
                    coreCount: guessAppleGpuCores(gpu0.model),
                }
                : null;

        // disque: on prend le root si dispo
        const root = (fs ?? []).find((v) => v.mount === "/") ?? (fs ?? [])[0] ?? null;

        // quelques infos réseau utiles
        const net = (network ?? [])
            .filter((n) => !n.internal)
            .map((n) => ({
                iface: n.iface,
                ip4: n.ip4,
                ip6: n.ip6,
                mac: n.mac,
            }));

        return NextResponse.json(
            {
                hostname: osInfo?.hostname ?? null,
                os: {
                    platform: osInfo?.platform,
                    distro: osInfo?.distro,
                    release: osInfo?.release,
                    arch: osInfo?.arch,
                },
                cpu: {
                    brand: cpu.brand,
                    physical: cpu.physicalCores,
                    logical: cpu.cores,
                    speedGHz: cpu.speed, // déjà en GHz avec systeminformation
                },
                mem: {
                    total: mem.total,
                    free: mem.free,
                    used: mem.used,
                },
                gpu,
                disk: root
                    ? {
                        size: root.size, // bytes
                        used: root.used, // bytes
                        mount: root.mount,
                    }
                    : null,
                net,
            },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? "system info failed" },
            { status: 500, headers: { "Cache-Control": "no-store" } }
        );
    }
}