import { LayoutDashboard, Calendar, RefreshCcw, Target, Brain, Wallet, BookOpen, GraduationCap, PiggyBank, Sparkles, Briefcase } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { NavIconKey } from '@/lib/utils/navItems'

export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  resumo: LayoutDashboard,
  agenda: Calendar,
  trabalho: Briefcase,
  habitos: RefreshCcw,
  metas: Target,
  insights: Brain,
  financas: Wallet,
  livros: BookOpen,
  estudos: GraduationCap,
  aposentadoria: PiggyBank,
  ia: Sparkles,
}
