import { useAuth } from "@/hooks/useAuth"

export default function TopBar() {
  const { user, logout } = useAuth()
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{user?.name}</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{user?.role}</span>
        <button onClick={logout} className="text-xs text-muted-foreground hover:text-destructive">Logout</button>
      </div>
    </header>
  )
}
