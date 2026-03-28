'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { NotificationSystem } from '@/components/dashboard/NotificationSystem'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    // 1. Defina um timeout de segurança (5s) para o spinner caso o Firebase trave
    const timer = setTimeout(() => {
      if (loading) setLoading(false)
    }, 5000)

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setLoading(false) // Saia do spinner ANTES de redirecionar
        router.push('/login')
      } else {
        setUser(u)
        setLoading(false)
      }
    })
    
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [router, loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 relative">
        {children}
        <NotificationSystem />
      </main>
      <MobileNav />
    </div>
  )
}
