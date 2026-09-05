import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"

const nav = [
  { label: "Dashboard", path: "/", icon: "📊" },
  { label: "Quotations", path: "/quotes", icon: "📋" },
  { label: "Approvals", path: "/approvals", icon: "✅" },
  { label: "Fulfillment", path: "/fulfillment", icon: "🏭" },
  { label: "Negotiations", path: "/negotiations", icon: "🤝" },
  { label: "Billing", path: "/billing", icon: "💳" },
  { label: "Deal Health", path: "/deal-health", icon: "❤️" },
  { label: "Products", path: "/products", icon: "📦" },
  { label: "Customers", path: "/customers", icon: "👥" },
]

export default function Sidebar() {
  return (
    <aside className="w-56 border-r border-border bg-card h-screen sticky top-0 flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-primary">DealFlow360</h1>
        <p className="text-xs text-muted-foreground">Deal Digital Twin</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === "/"}
            className={({ isActive }) => cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
            )}>
            <span>{item.icon}</span>{item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
