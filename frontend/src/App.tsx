import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import AppShell from "@/components/layout/AppShell"
import Login from "@/pages/Login"
import Dashboard from "@/pages/Dashboard"
import Quotes from "@/pages/Quotes"
import Pipeline from "@/pages/Pipeline"
import QuoteBuilder from "@/pages/QuoteBuilder"
import Approvals from "@/pages/Approvals"
import ApprovalDetail from "@/pages/ApprovalDetail"
import Fulfillment from "@/pages/Fulfillment"
import Negotiations from "@/pages/Negotiations"
import Billing from "@/pages/Billing"
import Subscriptions from "@/pages/Subscriptions"
import DealHealth from "@/pages/DealHealth"
import Products from "@/pages/Products"
import Customers from "@/pages/Customers"
import CustomerDetail from "@/pages/CustomerDetail"
import CustomerPortal from "@/pages/CustomerPortal"
import Settings from "@/pages/Settings"

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>

  return (
    <>
      <Routes>
        <Route path="/portal/:token" element={<CustomerPortal />} />
        <Route path="/*" element={
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/quotes/new" element={<QuoteBuilder />} />
              <Route path="/quotes/:id" element={<QuoteBuilder />} />
              <Route path="/quotes/:id/edit" element={<QuoteBuilder />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/approvals/:id" element={<ApprovalDetail />} />
              <Route path="/fulfillment" element={<Fulfillment />} />
              <Route path="/negotiations" element={<Negotiations />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/deal-health" element={<DealHealth />} />
              <Route path="/products" element={<Products />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AppShell>
        } />
      </Routes>
    </>
  )
}
