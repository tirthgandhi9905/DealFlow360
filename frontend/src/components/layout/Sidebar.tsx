import { useState } from "react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { DealFlowLogo } from "./DealFlowLogo"
import { useAuth } from "@/hooks/useAuth"
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  Package, 
  Handshake, 
  CreditCard, 
  HeartPulse, 
  Box, 
  Users,
  Settings,
  Repeat,
  Building2,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

const nav = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Quotations", path: "/quotes", icon: FileText },
  { label: "Approvals", path: "/approvals", icon: CheckSquare },
  { label: "Fulfillment", path: "/fulfillment", icon: Package },
  { label: "Negotiations", path: "/negotiations", icon: Handshake },
  { label: "Billing", path: "/billing", icon: CreditCard },
  { label: "Subscriptions", path: "/subscriptions", icon: Repeat },
  { label: "Deal Health", path: "/deal-health", icon: HeartPulse },
  { label: "Products", path: "/products", icon: Box },
  { label: "Customers", path: "/customers", icon: Users },
  { label: "Warehouses", path: "/warehouses", icon: Building2 },
  { label: "Settings", path: "/settings", icon: Settings, adminOnly: true },
]

export default function Sidebar() {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const isAdmin = user?.role === "admin"

  const filteredNav = nav.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside className={cn(
      "border-r border-border bg-surface h-screen sticky top-0 flex flex-col transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        {!collapsed && <DealFlowLogo size={28} />}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-muted-foreground hover:text-foreground mx-auto"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            end={item.path === "/"}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative",
              isActive 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                )}
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors")} />
                {!collapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

