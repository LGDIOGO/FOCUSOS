'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '@/lib/firebase/config'
import { onAuthStateChanged, User } from 'firebase/auth'

// undefined = still resolving, null = not authenticated, User = authenticated
type AuthState = User | null | undefined

const AuthContext = createContext<AuthState>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState>(undefined)

  useEffect(() => {
    // Guard: if Firebase auth didn't initialize (e.g. SSR/missing config), treat as unauthenticated
    if (!auth) {
      setUser(null)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
    })
  }, [])

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>
}

export function useCurrentUser() {
  return useContext(AuthContext)
}
