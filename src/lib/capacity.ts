// Heuristique simple pour RAM nécessaire. Suffisant pour éviter les bêtises.
const GB = 1024 ** 3;

function parseBillionParams(name: string): number | null {
    // cherche 1b, 3b, 7b, 8b, 13b, 70b, 72b, etc.
    const m = name.toLowerCase().match(/(\d+(?:\.\d+)?)\s*b/);
    if (!m) return null;
    return parseFloat(m[1]);
}

function quantFromName(name: string): "q4" | "q5" | "q8" | "other" {
    const s = name.toLowerCase();
    if (s.includes("q8")) return "q8";
    if (s.includes("q5")) return "q5";
    if (s.includes("q4")) return "q4";
    return "other";
}

/**
 * Estime la RAM nécessaire pour charger le modèle (CPU/unified mem).
 * - Si on connaît la taille installée (bytes), on prend ~1.2x par sécurité.
 * - Sinon on approx par nb de paramètres & quantization.
 */
export function estimateRamNeedBytes(modelName: string, installedSizeBytes?: number): number {
    if (installedSizeBytes && installedSizeBytes > 0) {
        return Math.ceil(installedSizeBytes * 1.2);
    }
    const b = parseBillionParams(modelName) ?? 7; // défaut 7B
    const q = quantFromName(modelName);
    // Coûts approximatifs (GGUF) d’après terrain:
    // Q4 ≈ 0.65 GB / B, Q5 ≈ 0.8 GB / B, Q8 ≈ 1.3 GB / B, other ≈ 1.0 GB / B
    const perB =
        q === "q4" ? 0.65 :
            q === "q5" ? 0.8  :
                q === "q8" ? 1.3  : 1.0;

    return Math.ceil(b * perB * GB);
}

/** Budget RAM disponible pour un modèle: ~70% de la RAM totale ou tot-2GB, le plus petit. */
export function modelRamBudgetBytes(totalRamBytes: number): number {
    return Math.max(0, Math.min(totalRamBytes * 0.7, totalRamBytes - 2 * GB));
}

/** True si on pense que ça passe sans swap/agonie. */
export function canRunModel(totalRamBytes: number, modelName: string, installedSizeBytes?: number): boolean {
    const need = estimateRamNeedBytes(modelName, installedSizeBytes);
    const budget = modelRamBudgetBytes(totalRamBytes);
    return need <= budget;
}