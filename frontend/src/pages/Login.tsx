import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      await login(email, password)
      navigate("/", { replace: true })
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(
        typeof detail === "string"
          ? detail
          : "Invalid credentials. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword("1234")
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-secondary/5 blur-[100px] rounded-full -z-10" />

      <div className="w-full max-w-md p-8 glass rounded-2xl animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mx-auto mb-4">
            <span className="text-white font-bold text-2xl leading-none">D</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">DealFlow360</h1>
          <p className="text-sm text-muted-foreground">Sign in to your sales workspace</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground ml-1">Email address</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground transition-all shadow-sm"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-medium text-muted-foreground">Password</label>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground transition-all shadow-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-4">
          <div className="h-px bg-border/50 flex-1"></div>
          <span className="text-xs text-muted-foreground font-medium uppercase">Demo accounts</span>
          <div className="h-px bg-border/50 flex-1"></div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-xs">
          <button
            type="button"
            onClick={() => fillDemo("hemil@gs.in")}
            className="text-left px-3 py-2 rounded-lg border border-border bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="font-medium text-foreground">Admin</span>
            <span className="text-muted-foreground"> · hemil@gs.in</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo("vikram@dealflow.in")}
            className="text-left px-3 py-2 rounded-lg border border-border bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="font-medium text-foreground">Sales Manager</span>
            <span className="text-muted-foreground"> · vikram@dealflow.in</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo("ravi@dealflow.in")}
            className="text-left px-3 py-2 rounded-lg border border-border bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="font-medium text-foreground">Sales Rep</span>
            <span className="text-muted-foreground"> · ravi@dealflow.in</span>
          </button>
          <p className="text-center text-muted-foreground mt-1">
            Password for all demo accounts: <span className="font-mono font-medium text-foreground">1234</span>
          </p>
        </div>
      </div>
    </div>
  )
}
