import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Lock, Mail, ShieldCheck, ArrowRight, Sparkles } from "lucide-react"

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState("prince@gs.in")
  const [password, setPassword] = useState("1234")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword("1234")
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-card shadow-xl space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">DealFlow360</h1>
          <p className="text-xs text-muted-foreground">Self-Governing Sales Operations & Deal Digital Twin</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="name@dealflow.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In to Workspace"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Login Credentials Picker */}
        <div className="pt-3 border-t border-border space-y-2">
          <span className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Demo Quick Select (Password: 1234)
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin("prince@gs.in")}
              className="p-2 rounded-md border border-border hover:bg-accent text-left transition-colors"
            >
              <strong className="block text-foreground">Prince (Admin)</strong>
              <span className="text-[10px] text-muted-foreground">prince@gs.in</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("ravi@dealflow.in")}
              className="p-2 rounded-md border border-border hover:bg-accent text-left transition-colors"
            >
              <strong className="block text-foreground">Ravi (Sales Rep)</strong>
              <span className="text-[10px] text-muted-foreground">ravi@dealflow.in</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("vikram@dealflow.in")}
              className="p-2 rounded-md border border-border hover:bg-accent text-left transition-colors"
            >
              <strong className="block text-foreground">Vikram (Manager)</strong>
              <span className="text-[10px] text-muted-foreground">vikram@dealflow.in</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("deepak@dealflow.in")}
              className="p-2 rounded-md border border-border hover:bg-accent text-left transition-colors"
            >
              <strong className="block text-foreground">Deepak (Finance)</strong>
              <span className="text-[10px] text-muted-foreground">deepak@dealflow.in</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
