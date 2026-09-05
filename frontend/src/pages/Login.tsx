import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await login(email, password) } catch { setError("Invalid credentials") }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-sm p-8 rounded-xl border border-border bg-card">
        <h1 className="text-2xl font-bold text-center mb-1">DealFlow360</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Deal Digital Twin Platform</p>
        {error && <p className="text-sm text-destructive mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
          <button type="submit" className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            Sign In
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/api/auth/google" className="text-sm text-muted-foreground hover:text-primary">Sign in with Google</a>
        </div>
      </div>
    </div>
  )
}
