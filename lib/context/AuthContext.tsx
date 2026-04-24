'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '@/lib/firebase/config'
import { onAuthStateChanged, User } from 'firebase/auth'

// undefined = still loading, null = not authenticated, User = authenticated
type AuthState = User | null | undefined

const AuthContext = createContext<AuthState>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState>(undefined)

  useEffect(() => {
    return onAuthStateChanged(auth, setUser)
  }, [])

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>
}

export function useCurrentUser() {
  return useContext(AuthContext)
}
