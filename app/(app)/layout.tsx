'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { NotificationSystem } from '@/components/dashboard/NotificationSystem'
import { PomodoroSidebar } from '@/components/dashboard/PomodoroSidebar'
import { PomodoroFAB } from '@/components/dashboard/PomodoroFAB'
import { useSettings } from '@/lib/hooks/useSettings'
import { useProfile } from '@/lib/hooks/useProfile'
import { CpfOnboarding } from '@/components/auth/CpfOnboarding'
import { SubscriptionWall } from '@/components/auth/SubscriptionWall'
import { isTrialExpired, isGracePeriodOver } from '@/lib/utils/subscription'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: settings } = useSettings()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  // Apply theme to document root - always default to dark
  useEffect(() => {
    const theme = settings?.theme || 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#000000' : '#F2F2F7')
    }
  }, [settings?.theme])

  useEffect(() => {
    // 1. Defina um timeout de segurança (5s) para o spinner caso o Firebase trave
    const timer = setTimeout(() => {
      if (loading) setLoading(false)
    }, 5000)

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setLoading(false)
        router.push('/login')
      } else {
        setUser(u)
        // Apenas pare de carregar o auth, o perfil pode demorar um pouco mais
        setLoading(false)
      }
    })
    
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [router, loading])

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // PAYWALL LOGIC
  // CPF is mandatory only after 15 days of trial (grace period)
  const showCpfOnboarding = profile && !profile.cpf && isGracePeriodOver(profile.trial_started_at, 15)
  
  // Subscription required only after 30 days (currently set to 90 for safety during launch)
  const isExpired = isTrialExpired(profile?.trial_started_at)
  const showPaywall = profile && !profile.is_paid && isExpired

  return (
    <div className="flex min-h-dvh bg-[var(--bg-primary)] transition-colors duration-300 font-sans relative">
      {/* Paywalls */}
      {showCpfOnboarding && <CpfOnboarding />}
      {showPaywall && !showCpfOnboarding && <SubscriptionWall />}

      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+80px)] lg:pb-0 relative bg-[var(--bg-workspace)] rounded-none lg:rounded-tl-[40px] border-l border-white/[0.03] shadow-2xl">
        {children}
        <NotificationSystem />
      </main>
      <MobileNav />
      <PomodoroSidebar />
      <PomodoroFAB />
    </div>
  )
}
