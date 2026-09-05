import { useState, useEffect } from "react"
import api from "@/lib/api"
interface User { id: string; email: string; name: string; role: string }
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { setLoading(false); return }
    // Mock user verification
    setTimeout(() => {
      setUser({ id: "1", email: "admin@company.com", name: "Demo User", role: "Sales Rep" })
      setLoading(false)
    }, 300)
  }, [])
  const login = async (email: string, password: string) => {
    // Mock successful login
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        localStorage.setItem("token", "mock_token")
        setUser({ id: "1", email, name: "Demo User", role: "Sales Rep" })
        resolve()
      }, 500)
    })
  }
  const logout = () => { localStorage.removeItem("token"); setUser(null) }
  return { user, loading, login, logout }
}
