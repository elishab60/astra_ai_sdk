"use client";
import { useEffect, useState } from "react";

export type LocalSummary = {
    hostname?: string | null;
    os?: {
        platform?: string;
        distro?: string;
        release?: string;
        arch?: string;
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
        coreCount?: number | null;
    } | null;
    disk?: {
        size: number;
        used: number;
        mount: string;
    } | null;
    net?: {
        iface: string;
        ip4?: string;
        ip6?: string;
        mac?: string;
    }[];
};

export function useLocalSystem() {
    const [data, setData] = useState<LocalSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);

    useEffect(() => {
        let alive = true;
        fetch("/api/system/summary", { cache: "no-store" })
            .then((r) => {
                if (!r.ok) throw new Error("failed to fetch /api/system/summary");
                return r.json();
            })
            .then((json) => {
                if (!alive) return;
                setData(json);
            })
            .catch((err) => {
                if (!alive) return;
                setError(err);
                setData(null);
            })
            .finally(() => {
                if (alive) setLoading(false);
            });

        return () => {
            alive = false;
        };
    }, []);

    return { data, loading, error };
}