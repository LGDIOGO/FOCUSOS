'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { NotificationSystem } from '@/components/dashboard/NotificationSystem'
import { useSettings } from '@/lib/hooks/useSettings'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: settings } = useSettings()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  // Apply theme to document root
  useEffect(() => {
    if (settings?.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme)
      // Update meta theme-color for mobile browser address bars
      const metaTheme = document.querySelector('meta[name="theme-color"]')
      if (metaTheme) {
        metaTheme.setAttribute('content', settings.theme === 'dark' ? '#000000' : '#F2F2F7')
      }
    }
  }, [settings?.theme])

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
    <div className="flex min-h-screen bg-[var(--bg-primary)] transition-colors duration-300 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 relative bg-[var(--bg-workspace)] rounded-none lg:rounded-tl-[40px] border-l border-white/[0.03] shadow-2xl">
        {children}
        <NotificationSystem />
      </main>
      <MobileNav />
    </div>
  )
}
