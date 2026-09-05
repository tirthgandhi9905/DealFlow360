import { useAuth } from "@/hooks/useAuth"
import { Bell, Settings, Search } from "lucide-react"

export default function TopBar() {
  const { user, logout } = useAuth()
  
  return (
    <header className="h-16 border-b border-border bg-white flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search deals, customers..." 
            className="w-full bg-slate-100 border border-border rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <button className="hover:text-foreground transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
          </button>
          <button className="hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        <div className="h-6 w-px bg-border/50"></div>
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-foreground leading-none">{user?.name || "John Doe"}</p>
            <p className="text-xs text-muted-foreground mt-1">{user?.role || "Sales Rep"}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-info flex items-center justify-center cursor-pointer border border-border/50" onClick={logout}>
            <span className="text-white font-medium text-sm">{(user?.name || "J")[0]}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
