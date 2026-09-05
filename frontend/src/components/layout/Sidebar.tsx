import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  CheckSquare, 
  Truck, 
  Handshake, 
  CreditCard, 
  Activity, 
  Package, 
  Users,
  Sparkles
} from "lucide-react"

const nav = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Quotations", path: "/quotes", icon: FileSpreadsheet },
  { label: "Approvals", path: "/approvals", icon: CheckSquare },
  { label: "Fulfillment", path: "/fulfillment", icon: Truck },
  { label: "Negotiations", path: "/negotiations", icon: Handshake },
  { label: "Billing", path: "/billing", icon: CreditCard },
  { label: "Deal Health", path: "/deal-health", icon: Activity },
  { label: "Products", path: "/products", icon: Package },
  { label: "Customers", path: "/customers", icon: Users },
]

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white h-screen sticky top-0 flex flex-col shadow-sm">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary text-white shadow-md shadow-primary/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight">DealFlow360</h1>
          <p className="text-[11px] font-semibold text-primary">Self-Governing Engine</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink 
              key={item.path} 
              to={item.path} 
              end={item.path === "/"}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200",
                isActive 
                  ? "bg-primary text-white shadow-md shadow-primary/20 translate-x-0.5" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
          <span>Odoo Hackathon 2026</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">v1.0.0</span>
        </div>
      </div>
    </aside>
  )
}
