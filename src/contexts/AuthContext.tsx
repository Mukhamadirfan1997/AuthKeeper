import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authService } from '@/services/authService'

interface AuthContextType {
  isAuthenticated: boolean
  isFirstRun: boolean
  isLoading: boolean
  login: (pin: string) => Promise<boolean>
  setupPin: (pin: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isFirstRun, setIsFirstRun] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    authService.checkPinSetup().then((setup) => {
      setIsFirstRun(!setup)
      setIsLoading(false)
    })
  }, [])

  const login = async (pin: string): Promise<boolean> => {
    const ok = await authService.verifyPin(pin)
    if (ok) setIsAuthenticated(true)
    return ok
  }

  const setupPin = async (pin: string): Promise<boolean> => {
    const ok = await authService.setupPin(pin)
    if (ok) {
      setIsFirstRun(false)
      setIsAuthenticated(true)
    }
    return ok
  }

  const logout = () => setIsAuthenticated(false)

  return (
    <AuthContext.Provider value={{ isAuthenticated, isFirstRun, isLoading, login, setupPin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
