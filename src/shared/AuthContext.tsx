import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Role } from './types'
import { apiRequest } from './api'

interface AuthContextType {
  user: User | null
  token: string | null
  role: Role | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (token: string, user: User) => void
  logout: () => void
  hasRole: (roles: Role[]) => boolean
  loginAsDemoRole: (roleName: Role) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('wayfarer_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('wayfarer_jwt_token'))

  useEffect(() => {
    if (token && !user) {
      apiRequest<User>('/auth/me')
        .then(u => {
          setUser(u)
          localStorage.setItem('wayfarer_user', JSON.stringify(u))
        })
        .catch(() => logout())
    }
  }, [token])

  const login = (newToken: string, newUser: User) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('wayfarer_jwt_token', newToken)
    localStorage.setItem('wayfarer_user', JSON.stringify(newUser))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('wayfarer_jwt_token')
    localStorage.removeItem('wayfarer_user')
  }

  const hasRole = (roles: Role[]): boolean => {
    if (!user) return false
    if (user.role === 'SUPER_ADMIN') return true
    return roles.includes(user.role)
  }

  const loginAsDemoRole = async (demoRole: Role) => {
    const creds: Record<Role, { email: string; pass: string }> = {
      SUPER_ADMIN: { email: 'admin@wayfarer.com', pass: 'admin123' },
      EVENT_MANAGER: { email: 'events@wayfarer.com', pass: 'events123' },
      TICKET_STAFF: { email: 'staff@wayfarer.com', pass: 'staff123' },
      BOOKING_MANAGER: { email: 'admin@wayfarer.com', pass: 'admin123' },
      FINANCE_MANAGER: { email: 'admin@wayfarer.com', pass: 'admin123' },
      SUPPORT_AGENT: { email: 'admin@wayfarer.com', pass: 'admin123' },
      CUSTOMER: { email: 'customer@wayfarer.com', pass: 'pass123' },
    }
    const target = creds[demoRole] || creds.CUSTOMER
    const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email: target.email, password: target.pass },
    })
    login(res.token, res.user)
  }

  const isAdmin = Boolean(
    user && ['SUPER_ADMIN', 'EVENT_MANAGER', 'BOOKING_MANAGER', 'FINANCE_MANAGER', 'SUPPORT_AGENT', 'TICKET_STAFF'].includes(user.role)
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: Boolean(user),
        isAdmin,
        login,
        logout,
        hasRole,
        loginAsDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

