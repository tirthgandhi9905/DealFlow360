import { useAuth } from "@/hooks/useAuth"
import { LogOut, User as UserIcon, Shield, Search } from "lucide-react"

export default function TopBar() {
  const { user, logout } = useAuth()
  
  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Workspace Mode</span>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> {user?.role || "Active"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-slate-900">{user?.name}</span>
            <span className="text-[10px] text-muted-foreground">{user?.email}</span>
          </div>
        </div>
        <button 
          onClick={logout} 
          title="Sign Out"
          className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
