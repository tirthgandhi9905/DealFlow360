import { useState, useEffect } from "react"
import api from "@/lib/api"
interface User { id: string; email: string; name: string; role: string }
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { setLoading(false); return }
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false))
  }, [])
  const login = async (email: string, password: string) => {
    const r = await api.post("/auth/login", { email, password }); localStorage.setItem("token", r.data.access_token); setUser(r.data.user)
  }
  const logout = () => { localStorage.removeItem("token"); setUser(null) }
  return { user, loading, login, logout }
}
