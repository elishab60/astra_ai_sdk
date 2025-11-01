"use client";

import * as React from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Settings,
    Cpu,
    Monitor,
    Gauge,
    HardDrive,
    Server,
    MemoryStick,
    Network,
} from "lucide-react";

export type SystemSummary = {
    os?: {
        platform?: string;
        release?: string;
        arch?: string;
        distro?: string;
    };
    cpu?: {
        brand: string;
        physical: number;
        logical: number;
        speedGHz: number;
    };
    mem?: {
        total: number;
        free: number;
        used: number;
    };
    gpu?: {
        vendor: string;
        model: string;
        vramMB: number | null;
        /** <- ce champ vient de ton API basée sur systeminformation + mapping M1 Max */
        coreCount?: number | null;
    } | null;
    disk?: {
        size: number;
        used: number;
        mount: string;
    } | null;
    net?: {
        iface: string;
        ipv4?: string;
        ipv6?: string;
        ip4?: string; // certains systeminformation renvoient ip4
        ip6?: string;
    }[] | null;
    hostname?: string;
};

type OllamaStatus = {
    installed?: string[];
    loaded?: { name: string; size: number }[];
    ramApprox?: number;
} | null;

function fmtBytes(n?: number | null) {
    if (!n || n <= 0) return "—";
    const u = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(n) / Math.log(1024));
    return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
}

function pct(used?: number | null, total?: number | null) {
    if (!used || !total || total <= 0) return 0;
    return Math.min(100, Math.max(0, (used / total) * 100));
}

function Bar({ value }: { value: number }) {
    return (
        <div className="h-1.5 w-full rounded-full bg-white/10">
            <div
                className="h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all"
                style={{ width: `${value}%` }}
            />
        </div>
    );
}

function Row({
                 icon,
                 label,
                 value,
                 sub,
             }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div className="flex items-start gap-2">
            <div className="opacity-80 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="text-white/80 text-sm">{label}</div>
                    <div className="text-white/90 text-sm truncate">{value}</div>
                </div>
                {sub ? <div className="text-[11px] text-white/40 mt-0.5">{sub}</div> : null}
            </div>
        </div>
    );
}

export function SystemPopover({
                                  sys,
                                  ollama,
                              }: {
    sys: SystemSummary | null;
    ollama?: OllamaStatus;
}) {
    const cpu = sys?.cpu;
    const mem = sys?.mem;
    const gpu = sys?.gpu;
    const disk = sys?.disk;
    const os = sys?.os;
    const hostname = sys?.hostname;

    const memPct = pct(mem?.used ?? null, mem?.total ?? null);
    const diskPct = pct(disk?.used ?? null, disk?.size ?? null);

    const installedModels = ollama?.installed ?? [];
    const loadedModels = ollama?.loaded ?? [];

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-9 w-9 rounded-full border-white/15 bg-black/50 p-0 text-white hover:bg-white/10"
                    aria-label="Paramètres système"
                    title="Paramètres / Infos système"
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-96 border-white/10 bg-[#0b0b0b] text-white rounded-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <div className="text-xs uppercase tracking-widest text-white/50">
                            Système local
                        </div>
                        <div className="text-sm font-medium text-white/90">
                            {hostname ?? "Machine locale"}
                        </div>
                    </div>
                    <div className="text-right text-[11px] text-white/40">
                        {os?.platform ?? "darwin"}{" "}
                        {os?.release ? os.release : os?.distro ? os.distro : ""}
                    </div>
                </div>
                <Separator className="mb-3 bg-white/10" />

                {/* Bloc machine */}
                <div className="space-y-3">
                    <Row
                        icon={<Server className="h-4 w-4" />}
                        label="OS"
                        value={
                            os
                                ? `${os.platform ?? "macOS"} ${os.release ?? os.distro ?? ""}`.trim()
                                : "macOS"
                        }
                        sub={os?.arch ? `arch: ${os.arch}` : "arch: arm64"}
                    />

                    {/* CPU */}
                    <div>
                        <Row
                            icon={<Cpu className="h-4 w-4" />}
                            label="CPU"
                            value={cpu ? `${cpu.brand}` : "—"}
                            sub={
                                cpu
                                    ? `${cpu.physical} cœurs physiques • ${cpu.logical} threads${
                                        cpu.speedGHz ? ` • ${cpu.speedGHz} GHz` : ""
                                    }`
                                    : undefined
                            }
                        />
                    </div>

                    {/* GPU */}
                    <Row
                        icon={<Monitor className="h-4 w-4" />}
                        label="GPU"
                        value={gpu ? gpu.model : "—"}
                        sub={
                            gpu
                                ? gpu.coreCount
                                    ? `${gpu.vendor ?? "Apple"} • ${gpu.coreCount} cœurs`
                                    : gpu.vendor
                                : undefined
                        }
                    />

                    {/* RAM */}
                    <div className="space-y-1.5">
                        <Row
                            icon={<Gauge className="h-4 w-4" />}
                            label="Mémoire"
                            value={
                                mem ? `${fmtBytes(mem.used)} / ${fmtBytes(mem.total)}` : "—"
                            }
                            sub={`Utilisation: ${memPct.toFixed(0)}%`}
                        />
                        <Bar value={memPct} />
                    </div>

                    {/* DISK */}
                    <div className="space-y-1.5">
                        <Row
                            icon={<HardDrive className="h-4 w-4" />}
                            label="Disque"
                            value={
                                disk ? `${fmtBytes(disk.used)} / ${fmtBytes(disk.size)}` : "—"
                            }
                            sub={
                                disk?.mount
                                    ? `monté sur ${disk.mount} • ${diskPct.toFixed(0)}%`
                                    : undefined
                            }
                        />
                        {disk ? <Bar value={diskPct} /> : null}
                    </div>
                </div>

                {/* Réseau si dispo */}
                {sys?.net && sys.net.length ? (
                    <>
                        <Separator className="my-3 bg-white/10" />
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-medium text-white/50">
                                <Network className="h-3.5 w-3.5" /> Réseau
                            </div>
                            {sys.net.slice(0, 2).map((n, i) => {
                                // ton API peut renvoyer ipv4/ipv6 OU ip4/ip6 → on normalise
                                const ip4 = n.ipv4 ?? (n as any).ip4;
                                const ip6 = n.ipv6 ?? (n as any).ip6;
                                return (
                                    <div key={i} className="text-[11px] text-white/60">
                                        <span className="text-white/80 mr-1">{n.iface}</span>
                                        {ip4 ? `• ${ip4}` : null}
                                        {ip6 ? ` • ${ip6}` : null}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : null}

                {/* Ollama */}
                {installedModels.length || loadedModels.length ? (
                    <>
                        <Separator className="my-3 bg-white/10" />
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-medium text-white/50">
                                <MemoryStick className="h-3.5 w-3.5" /> Ollama
                            </div>
                            <div className="text-[11px] text-white/55">
                                Modèles installés:{" "}
                                {installedModels.length ? installedModels.join(", ") : "—"}
                            </div>
                            <div className="text-[11px] text-white/55">
                                Modèles chargés:
                                {loadedModels.length
                                    ? loadedModels
                                        .map((m) => ` ${m.name} (${fmtBytes(m.size)})`)
                                        .join(", ")
                                    : " —"}
                            </div>
                        </div>
                    </>
                ) : null}
            </PopoverContent>
        </Popover>
    );
}