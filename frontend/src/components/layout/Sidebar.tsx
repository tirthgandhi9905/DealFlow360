import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  Package, 
  Handshake, 
  CreditCard, 
  HeartPulse, 
  Box, 
  Users 
} from "lucide-react"

const nav = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Quotations", path: "/quotes", icon: FileText },
  { label: "Approvals", path: "/approvals", icon: CheckSquare },
  { label: "Fulfillment", path: "/fulfillment", icon: Package },
  { label: "Negotiations", path: "/negotiations", icon: Handshake },
  { label: "Billing", path: "/billing", icon: CreditCard },
  { label: "Deal Health", path: "/deal-health", icon: HeartPulse },
  { label: "Products", path: "/products", icon: Box },
  { label: "Customers", path: "/customers", icon: Users },
]

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-surface h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-lg leading-none">D</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">DealFlow360</h1>
            <p className="text-xs text-muted-foreground">B2B Sales Platform</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            end={item.path === "/"}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative",
              isActive 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors")} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

