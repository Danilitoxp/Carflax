import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/context/theme-provider"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-xl",
        "bg-secondary/50 hover:bg-secondary transition-all duration-300",
        "border border-border backdrop-blur-sm shadow-sm"
      )}
      aria-label="Toggle theme"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
    </button>
  )
}
