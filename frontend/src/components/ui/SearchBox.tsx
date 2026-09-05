import { useState, useEffect } from "react"
import { Search, X } from "lucide-react"

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  debounceMs?: number
}

export function SearchBox({ value, onChange, placeholder = "Search…", className = "", debounceMs = 300 }: Props) {
  const [local, setLocal] = useState(value)

  // Sync local state when parent value changes externally
  useEffect(() => { setLocal(value) }, [value])

  // Debounce local → parent
  useEffect(() => {
    if (local === value) return
    const t = setTimeout(() => onChange(local), debounceMs)
    return () => clearTimeout(t)
  }, [local, debounceMs])

  return (
    <div className={`relative ${className}`}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-[240px] pl-9 pr-8 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground transition-all shadow-sm"
      />
      {local && (
        <button
          onClick={() => { setLocal(""); onChange("") }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded text-muted-foreground"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
