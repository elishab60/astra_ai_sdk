"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(true)

    // Charger l’état initial à partir du localStorage
    useEffect(() => {
        if (typeof window === "undefined") return
        const stored = localStorage.getItem("theme")
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        const useDark = stored ? stored === "dark" : prefersDark
        document.documentElement.classList.toggle("dark", useDark)
        setIsDark(useDark)
    }, [])

    // Basculer clair/sombre
    function toggleTheme() {
        const newTheme = isDark ? "light" : "dark"
        document.documentElement.classList.toggle("dark", newTheme === "dark")
        localStorage.setItem("theme", newTheme)
        setIsDark(!isDark)
    }

    return (
        <Button
            onClick={toggleTheme}
            variant="outline"
            className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full border-white/10 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all"
            size="icon"
            title="Changer de thème"
        >
            {isDark ? (
                <Moon className="h-5 w-5 text-slate-700 transition-all" />
            ) : (
                <Sun className="h-5 w-5 text-yellow-300 transition-all" />

            )}
        </Button>
    )
}