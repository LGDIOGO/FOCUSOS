'use client'

import { useEffect } from 'react'
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
import { useCurrentUser } from '@/lib/context/AuthContext'
import { FirestoreDiagnostic } from '@/components/FirestoreDiagnostic'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useCurrentUser()
  const { data: settings } = useSettings()
  const { data: profile } = useProfile()
  const router = useRouter()

  useEffect(() => {
    const theme = settings?.theme || 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#000000' : '#F2F2F7')
    }
  }, [settings?.theme])

  useEffect(() => {
    if (user === undefined) return
    if (user === null) router.push('/login')
  }, [user, router])

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (user === null) return null

  // PAYWALL LOGIC
  // CPF is mandatory only after 15 days of trial (grace period)
  const showCpfOnboarding = profile && !profile.cpf && isGracePeriodOver(profile.trial_started_at, 15)

  // Subscription required only after 30 days (currently set to 90 for safety during launch)
  const isExpired = isTrialExpired(profile?.trial_started_at)
  const showPaywall = profile && !profile.is_paid && isExpired

  return (
    <div className="flex min-h-dvh bg-[var(--bg-primary)] transition-colors duration-300 font-sans relative">
      <FirestoreDiagnostic />
      {/* Paywalls */}
      {showCpfOnboarding && <CpfOnboarding />}
      {showPaywall && !showCpfOnboarding && <SubscriptionWall />}

      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+80px)] md:pb-0 relative bg-[var(--bg-workspace)] rounded-none lg:rounded-tl-[40px] border-l border-white/[0.03] shadow-2xl">
        {children}
        <NotificationSystem />
      </main>
      <MobileNav />
      <PomodoroSidebar />
      <PomodoroFAB />
    </div>
  )
}
