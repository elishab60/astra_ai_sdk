"use client"

import { useEffect, useRef, useState } from "react"
import { GrainGradient } from "@paper-design/shaders-react"

export function GradientBackground() {
    // État local au composant (n’affecte PAS la page → n’affecte PAS le TypingAnimation)
    const [isDark, setIsDark] = useState<boolean | null>(null)
    const observerRef = useRef<MutationObserver | null>(null)

    useEffect(() => {
        const root = document.documentElement
        const sync = () => setIsDark(root.classList.contains("dark"))
        sync()
        observerRef.current = new MutationObserver(sync)
        observerRef.current.observe(root, { attributes: true, attributeFilter: ["class"] })
        return () => observerRef.current?.disconnect()
    }, [])

    // Tant qu’on ne sait pas, on ne rend pas le shader pour éviter tout flash
    if (isDark === null) {
        return <div className="absolute inset-0 -z-10" />
    }

    return (
        <div className="absolute inset-0 -z-10 transition-all duration-700">
            <GrainGradient
                style={{ height: "100%", width: "100%", transition: "all 600ms linear" }}
                colorBack={isDark ? "hsl(0, 0%, 0%)" : "hsl(0, 0%, 100%)"}
                softness={0.65}
                intensity={0.55}
                noise={0.34}
                shape="corners"
                offsetX={0}
                offsetY={0}
                scale={1}
                rotation={0}
                speed={1}
                colors={
                    isDark
                        ? [
                            "hsl(210, 100%, 60%)", // bleu clair
                            "hsl(200, 100%, 65%)", // cyan doux
                            "hsl(220, 100%, 45%)", // bleu profond
                        ]
                        : [
                            "hsl(45, 100%, 85%)", // jaune
                            "hsl(25, 100%, 70%)", // orange
                            "hsl(0, 100%, 65%)",  // rouge
                        ]
                }
            />
        </div>
    )
}