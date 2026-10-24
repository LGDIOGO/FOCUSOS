'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import dynamic from 'next/dynamic'

// Modal pesado: so baixa o codigo quando o usuario abre Configuracoes pela primeira vez.
const SettingsModal = dynamic(
  () => import('@/components/dashboard/SettingsModal').then(m => m.SettingsModal),
  {
    ssr: false,
    loading: () => (
      <div role="status" aria-label="Carregando configurações" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 pointer-events-none">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    ),
  }
)
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsEverOpened, setSettingsEverOpened] = useState(false)
  useEffect(() => {
    if (isSettingsOpen) setSettingsEverOpened(true)
  }, [isSettingsOpen])
  const [moreOpen, setMoreOpen] = useState(false)

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
      <div role="status" aria-label="Carregando" className="min-h-dvh bg-black flex items-center justify-center">
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

      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
      <main className="flex-1 overflow-y-auto pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+72px)] lg:pb-0 lg:h-dvh lg:min-w-0 relative bg-[var(--bg-workspace)] rounded-none lg:rounded-tl-[40px] border-l border-white/[0.03] shadow-2xl">
        {children}
        <NotificationSystem />
      </main>
      <MobileNav onOpenSettings={() => setIsSettingsOpen(true)} onMoreOpenChange={setMoreOpen} />
      {settingsEverOpened && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
      <PomodoroSidebar />
      <PomodoroFAB hidden={moreOpen} />
    </div>
  )
}
