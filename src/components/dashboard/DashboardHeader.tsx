import { Search, Bell } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import { Input } from "@/components/ui/input"

export function DashboardHeader({ title }: { title: string }) {
  return (
    <header className="fixed top-0 right-0 left-0 lg:left-72 h-20 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-8 z-40 transition-all duration-300">
      <h1 className="text-xl font-bold text-foreground">{title}</h1>

      <div className="flex items-center gap-6">
        <div className="relative group hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
          <Input
            placeholder="Pesquisar..."
            className="pl-10 w-64 h-10 pr-12"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-border bg-secondary text-[10px] text-muted-foreground font-mono">
            Ctrl + K
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="relative p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border border-border">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background"></span>
          </button>
        </div>
      </div>
    </header>
  )
}
