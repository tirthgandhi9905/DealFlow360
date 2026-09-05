import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import AppShell from "@/components/layout/AppShell"
import Login from "@/pages/Login"
import Dashboard from "@/pages/Dashboard"
import Quotes from "@/pages/Quotes"
import QuoteBuilder from "@/pages/QuoteBuilder"
import Approvals from "@/pages/Approvals"
import Fulfillment from "@/pages/Fulfillment"
import Negotiations from "@/pages/Negotiations"
import Billing from "@/pages/Billing"
import DealHealth from "@/pages/DealHealth"
import Products from "@/pages/Products"
import Customers from "@/pages/Customers"

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/quotes/new" element={<QuoteBuilder />} />
        <Route path="/quotes/:id" element={<QuoteBuilder />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/fulfillment" element={<Fulfillment />} />
        <Route path="/negotiations" element={<Negotiations />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/deal-health" element={<DealHealth />} />
        <Route path="/products" element={<Products />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AppShell>
  )
}
