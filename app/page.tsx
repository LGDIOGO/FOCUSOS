'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion'
import Link from 'next/link'
import { 
  Check, ChevronRight, Brain, Target, Calendar, RefreshCcw,
  BarChart3, Bell, Sparkles, Shield, Zap, ArrowRight, Star,
  Clock, TrendingUp, Flame, CheckCircle2, SlidersHorizontal, X, Minus
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// ─── Logo Component ────────────────────────────────────────────
function FocusOSLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  const radius = Math.round(size * 0.22)
  const innerSize = Math.round(size * 0.38)
  return (
    <div 
      className={`bg-white flex items-center justify-center flex-shrink-0 border border-black/10 ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <div 
        className="bg-black"
        style={{ width: innerSize, height: innerSize, borderRadius: 2, transform: 'rotate(45deg)' }}
      />
    </div>
  )
}

// ─── Animated Counter ─────────────────────────────────────────
function Counter({ end, duration = 2, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = end / (duration * 60)
    const timer = setInterval(() => {
      start += step
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [inView, end, duration])

  return <span ref={ref}>{count.toLocaleString('pt-BR')}{suffix}</span>
}

// ─── Pricing Plans ────────────────────────────────────────────
const PLANS = [
  {
    id: 'monthly',
    label: 'Mensal',
    price: 29.90,
    billedAs: 'por mês',
    period: 'mês',
    savings: null,
    badge: null,
    color: 'white',
  },
  {
    id: 'quarterly',
    label: 'Trimestral',
    price: 24.90,
    billedAs: 'por mês · R$ 74,70 a cada 3 meses',
    period: 'trimestre',
    savings: 17,
    badge: null,
    color: 'blue',
  },
  {
    id: 'semiannual',
    label: 'Semestral',
    price: 22.90,
    billedAs: 'por mês · R$ 137,40 a cada 6 meses',
    period: 'semestre',
    savings: 24,
    badge: 'Popular',
    color: 'red',
  },
  {
    id: 'annual',
    label: 'Anual',
    price: 19.90,
    billedAs: 'por mês · R$ 238,80 por ano',
    period: 'ano',
    savings: 34,
    badge: 'Melhor valor',
    color: 'green',
  },
]

const FEATURES_ALL = [
  'Agenda inteligente com IA',
  'Hábitos positivos e negativos',
  'Metas estratégicas com OKR',
  'Insights e análises por IA',
  'Notificações personalizadas',
  'Score diário de performance',
  'Suporte prioritário',
  'Acesso em todos os dispositivos',
]

// ─── Mock App Screens ─────────────────────────────────────────
function MockDashboard() {
  const habits = [
    { name: 'Meditar 10 min', status: 'done', emoji: '🧘' },
    { name: 'Treinar musculação', status: 'done', emoji: '🏋️' },
    { name: 'Leitura 30 min', status: 'none', emoji: '📚' },
  ]
  const avoid = [
    { name: 'Frituras no almoço', status: 'failed', emoji: '🍟' },
  ]
  
  return (
    <div className="bg-[#0F0F0F] border border-white/5 rounded-[24px] p-5 space-y-4 text-white w-full shadow-2xl">
      {/* Score */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase font-black tracking-widest text-white/20 mb-1">Performance Hoje</p>
          <p className="text-4xl font-black text-white leading-none tracking-tighter">87<span className="text-xl text-white/20 ml-0.5">%</span></p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
          <Flame size={22} className="text-amber-500" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Habits */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Hábitos</p>
          <div className="space-y-2">
            {habits.map((h, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                <span className="text-sm">{h.emoji}</span>
                <span className="flex-1 text-[11px] font-bold text-white/70 truncate">{h.name}</span>
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                  h.status === 'done' ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "border border-white/10"
                )}>
                  {h.status === 'done' && <Check size={10} strokeWidth={4} className="text-white" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Avoid */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">A Evitar</p>
          </div>
          <div className="space-y-2">
            {avoid.map((h, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                <span className="text-sm">{h.emoji}</span>
                <span className="flex-1 text-[11px] font-bold text-white/70 truncate">{h.name}</span>
                <div className="w-5 h-5 rounded-full bg-red-600 shadow-[0_0_10px_rgba(224,32,32,0.3)] flex items-center justify-center flex-shrink-0">
                  <X size={10} strokeWidth={4} className="text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MockAgenda() {
  const events = [
    { time: '09:00', title: 'Reunião de planejamento', status: 'done' },
    { time: '12:00', title: 'Almoço estratégico', status: 'done' },
    { time: '15:30', title: 'Call com investidores', status: 'partial' },
    { time: '18:00', title: 'Revisão de métricas', status: 'todo' },
  ]
  return (
    <div className="bg-[#0F0F0F] border border-white/5 rounded-[24px] p-5 space-y-4 text-white w-full shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Compromissos</p>
        <span className="text-[10px] font-black text-red-500 px-2 py-0.5 bg-red-500/10 rounded-full">Hoje</span>
      </div>
      <div className="space-y-2.5">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3.5 py-3 px-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <div className={cn(
               "w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0",
               e.status === 'done' ? "bg-green-500 border-green-500" :
               e.status === 'partial' ? "bg-amber-400 border-amber-400" :
               "border-white/10"
            )}>
              {e.status === 'done' && <Check size={12} strokeWidth={4} className="text-white" />}
              {e.status === 'partial' && <Minus size={12} strokeWidth={4} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-[11px] font-bold truncate",
                e.status === 'done' ? "text-white/30 line-through" : "text-white/90"
              )}>{e.title}</p>
            </div>
            <span className="text-[10px] font-black tracking-tighter text-white/20">{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockGoals() {
  const goals = [
    { title: 'Meta Mensal', pct: 68, color: '#32D74B', icon: Target },
    { title: 'Progresso Semanal', pct: 45, color: '#0A84FF', icon: TrendingUp },
  ]
  return (
    <div className="bg-[#0F0F0F] border border-white/5 rounded-[24px] p-5 space-y-5 text-white w-full shadow-2xl">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Metas Estratégicas</p>
        <Sparkles size={14} className="text-blue-400" />
      </div>
      {goals.map((g, i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                <g.icon size={12} style={{ color: g.color }} />
              </div>
              <span className="text-[11px] font-bold text-white/90">{g.title}</span>
            </div>
            <span className="text-[11px] font-black tracking-tighter" style={{ color: g.color }}>{g.pct}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${g.pct}%` }}
              transition={{ duration: 1, delay: i * 0.2, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ 
                backgroundColor: g.color,
                boxShadow: `0 0 10px ${g.color}30`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Section Heading ──────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[11px] font-black tracking-widest uppercase text-white/40 mb-5">
      {children}
    </span>
  )
}

// ─── Feature Card ─────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, color, mock }: any) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="bg-white/[0.02] border border-white/[0.07] rounded-[28px] p-7 flex flex-col gap-4 overflow-hidden group relative"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 10% 10%, ${color}15, transparent 60%)` }} />
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <h3 className="text-xl font-bold mb-2 tracking-tight">{title}</h3>
        <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
      </div>
      {mock && <div className="mt-2 opacity-80 group-hover:opacity-100 transition-opacity">{mock}</div>}
    </motion.div>
  )
}

// ─── Testimonial ─────────────────────────────────────────────
function Testimonial({ name, role, text, stars = 5 }: any) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.07] rounded-[24px] p-6 flex flex-col gap-4">
      <div className="flex gap-0.5">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
        ))}
      </div>
      <p className="text-white/60 text-sm leading-relaxed italic">&ldquo;{text}&rdquo;</p>
      <div className="mt-auto">
        <p className="font-bold text-sm text-white">{name}</p>
        <p className="text-white/30 text-xs">{role}</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function LandingPage() {
  const [activePlan, setActivePlan] = useState('semiannual')
  const { scrollY } = useScroll()
  const navBg = useTransform(scrollY, [0, 100], ['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)'])
  const navBorder = useTransform(scrollY, [0, 100], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)'])

  const selectedPlan = PLANS.find(p => p.id === activePlan)!

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden">

      {/* ─── Navbar ─── */}
      <motion.nav 
        style={{ backgroundColor: navBg, borderBottomColor: navBorder }}
        className="fixed top-0 w-full z-50 border-b transition-colors"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FocusOSLogo size={30} />
            <span className="font-bold tracking-tight text-lg">FocusOS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Recursos</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planos</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Depoimentos</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-white/50 hover:text-white transition-colors hidden sm:block">
              Entrar
            </Link>
            <Link 
              href="/signup" 
              className="px-5 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-neutral-200 transition-all active:scale-95"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ─── Hero Section ─── */}
      <section className="pt-36 pb-24 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] text-xs font-black tracking-widest uppercase text-white/50 mb-10"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Primeiro mês grátis — sem cartão
            </motion.div>

            {/* Headline */}
            <h1 className="text-6xl md:text-8xl lg:text-[96px] font-black tracking-[-0.04em] mb-6 leading-[0.92]">
              <span className="bg-gradient-to-b from-white via-white to-white/30 bg-clip-text text-transparent">
                Seu sistema<br />
                de alta<br />
                performance.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/40 max-w-xl mx-auto mb-12 font-medium leading-relaxed">
              Combine agenda inteligente, rastreamento de hábitos e metas estratégicas em uma interface que foi projetada para quem não aceita mediocridade.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/signup" 
                className="group w-full sm:w-auto px-8 py-4 bg-white text-black font-black rounded-2xl text-base hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Testar 30 dias grátis
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="#pricing" 
                className="w-full sm:w-auto px-8 py-4 bg-white/[0.04] border border-white/10 text-white font-black rounded-2xl text-base hover:bg-white/[0.08] transition-all duration-200"
              >
                Ver planos
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-20 border-t border-white/5 pt-10"
          >
            {[
              { value: 2800, label: 'Usuários ativos', suffix: '+' },
              { value: 94, label: 'Taxa de retenção', suffix: '%' },
              { value: 4.9, label: 'Avaliação média', suffix: '★' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-black text-white">
                  <Counter end={s.value} suffix={s.suffix} />
                </p>
                <p className="text-xs text-white/30 font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── App Preview Section ─── */}
      <section className="py-20 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>O Produto</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Tudo que você precisa,<br/>
              <span className="text-white/30">nada que você não precisa.</span>
            </h2>
            <p className="text-white/40 max-w-lg mx-auto text-base">
              Três telas. Toda a sua vida produtiva organizada em tempo real.
            </p>
          </div>

          {/* 3-column mock preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              viewport={{ once: true }}
              className="bg-white/[0.02] border border-white/[0.07] rounded-[28px] p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-xl bg-amber-400/10 flex items-center justify-center">
                  <BarChart3 size={14} className="text-amber-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-white/40">Painel Diário</span>
              </div>
              <MockDashboard />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white/[0.02] border border-white/[0.07] rounded-[28px] p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-xl bg-red-400/10 flex items-center justify-center">
                  <Calendar size={14} className="text-red-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-white/40">Agenda</span>
              </div>
              <MockAgenda />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white/[0.02] border border-white/[0.07] rounded-[28px] p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-xl bg-blue-400/10 flex items-center justify-center">
                  <Target size={14} className="text-blue-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-white/40">Metas</span>
              </div>
              <MockGoals />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <SectionLabel>Recursos</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Construído para<br/>
              <span className="text-white/30">quem leva sério.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Brain}
              title="IA Insight Engine"
              desc="A IA analisa seus padrões e entrega insights personalizados sobre performance, inconsistências e oportunidades de melhoria."
              color="#FF453A"
            />
            <FeatureCard
              icon={RefreshCcw}
              title="Hábitos com Rastreamento"
              desc="Crie hábitos positivos e negativos com frequência personalizada. Ofensivas, streaks e histórico visual de progresso."
              color="#32D74B"
            />
            <FeatureCard
              icon={Target}
              title="Metas OKR"
              desc="Defina objetivos com valores inicial, atual e alvo. Visualize o progresso em tempo real com milestones gerados por IA."
              color="#0A84FF"
            />
            <FeatureCard
              icon={Calendar}
              title="Agenda Inteligente"
              desc="Compromissos com status em tempo real, alertas visuais 15 min antes e detecção automática de itens atrasados."
              color="#FF9F0A"
            />
            <FeatureCard
              icon={Bell}
              title="Notificações Sonoras"
              desc="Alertas personalizáveis com sons premium estilo Apple. Configure o lead time e o tipo de notificação para cada compromisso."
              color="#BF5AF2"
            />
            <FeatureCard
              icon={BarChart3}
              title="Score de Performance"
              desc="Pontuação diária calculada com base em hábitos, tarefas e eventos. Compare semanas e identifique seus melhores dias."
              color="#FFD60A"
            />
          </div>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section className="py-24 px-6 bg-white/[0.015] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <SectionLabel>Como funciona</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Simples de começar.<br/>
              <span className="text-white/30">Poderoso para crescer.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: CheckCircle2, color: '#32D74B', title: 'Configure sua rotina', desc: 'Adicione seus compromissos, hábitos e metas em menos de 5 minutos. A IA já começa a aprender sobre você.' },
              { step: '02', icon: Zap, color: '#FF9F0A', title: 'Execute com foco', desc: 'Siga seu painel diário, marque status em tempo real e receba alertas inteligentes para nunca perder um compromisso.' },
              { step: '03', icon: TrendingUp, color: '#0A84FF', title: 'Evolua com dados', desc: 'Analise seus padrões, compare semanas e receba sugestões de IA para otimizar continuamente sua performance.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="text-center flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-3xl mb-5 flex items-center justify-center" style={{ backgroundColor: `${step.color}15`, border: `1px solid ${step.color}30` }}>
                  <step.icon size={28} style={{ color: step.color }} />
                </div>
                <span className="text-[10px] font-black tracking-[0.3em] text-white/20 uppercase mb-2">Passo {step.step}</span>
                <h3 className="text-xl font-bold mb-3 tracking-tight">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed max-w-xs">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <SectionLabel>Depoimentos</SectionLabel>
            <h2 className="text-4xl font-black tracking-tight">
              Quem usou, não volta atrás.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Testimonial
              name="Rafael Mendes"
              role="CEO · Startup de SaaS"
              text="Nunca mais precisei de planilhas. O FocusOS é o único app que conseguiu manter minha rotina organizada sem vício em configuração. Simples, elegante e poderoso."
              stars={5}
            />
            <Testimonial
              name="Ana Beatriz Costa"
              role="Atleta & Empreendedora"
              text="O sistema de hábitos com streak é viciante no bom sentido. Estou na semana 14 sem perder um dia de treino. A IA me deu insights que eu nunca teria sozinha."
              stars={5}
            />
            <Testimonial
              name="Dr. Lucas Oliveira"
              role="Médico & Investidor"
              text="Como médico, preciso de organização impecável. O FocusOS entrega isso com um design que não me enlouquece. O modo claro é lindo, o escuro é profissional."
              stars={5}
            />
          </div>
        </div>
      </section>

      {/* ─── Pricing Plans ─── */}
      <section id="pricing" className="py-24 px-6 bg-white/[0.015] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <SectionLabel>Planos & Preços</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Invista no seu potencial.
            </h2>
            <p className="text-white/40 max-w-md mx-auto text-base mb-8">
              Primeiro mês completamente grátis, sem precisar de cartão de crédito. Depois, escolha o plano que faz mais sentido.
            </p>
          </div>

          {/* Free Trial Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-green-500/10 via-green-400/5 to-transparent border border-green-500/20 rounded-[24px] p-5 flex items-center gap-4 mb-8"
          >
            <div className="w-10 h-10 bg-green-500/15 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-black text-white text-sm">🎁 Seu primeiro mês é 100% grátis</p>
              <p className="text-white/40 text-xs mt-0.5">
                Sem cartão de crédito. Vinculado ao seu CPF e dispositivo para garantir uma experiência exclusiva por usuário.
              </p>
            </div>
            <Link href="/signup" className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-green-500 text-black text-xs font-black rounded-xl hover:bg-green-400 transition-colors whitespace-nowrap">
              Começar agora <ArrowRight size={12} />
            </Link>
          </motion.div>

          {/* Plan Selector */}
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            {PLANS.map(plan => (
              <button
                key={plan.id}
                onClick={() => setActivePlan(plan.id)}
                className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activePlan === plan.id 
                    ? 'bg-white text-black shadow-lg' 
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {plan.label}
                {plan.badge && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-black rounded-full">
                    {plan.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active Plan Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activePlan}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.3 }}
              className="bg-white/[0.03] border border-white/10 rounded-[32px] p-8 mb-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-black text-white">{selectedPlan.label}</h3>
                    {selectedPlan.savings && (
                      <span className="px-2.5 py-1 bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-black rounded-full uppercase tracking-widest">
                        Economize {selectedPlan.savings}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-5xl font-black text-white">
                      R$ {selectedPlan.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-white/40 text-sm font-medium">/mês</span>
                  </div>
                  <p className="text-white/30 text-xs">{selectedPlan.billedAs}</p>
                </div>

                <div className="flex flex-col gap-3 min-w-[220px]">
                  <Link
                    href="/signup"
                    className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-white text-black font-black rounded-2xl hover:bg-neutral-200 transition-all active:scale-95 text-base"
                  >
                    Começar grátis por 30 dias
                    <ChevronRight size={18} />
                  </Link>
                  <p className="text-white/20 text-[10px] text-center font-medium">
                    Cancele a qualquer momento · Sem fidelidade
                  </p>
                </div>
              </div>

              <div className="border-t border-white/5 mt-6 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FEATURES_ALL.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <Check size={11} className="text-green-400" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-white/60 font-medium">{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Plan Comparison */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLANS.map(plan => (
              <motion.button
                key={plan.id}
                onClick={() => setActivePlan(plan.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-[20px] border transition-all text-left ${
                  activePlan === plan.id 
                    ? 'border-white/30 bg-white/[0.06]' 
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15'
                }`}
              >
                <p className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-1">{plan.label}</p>
                <p className="text-xl font-black text-white">
                  R$ {plan.price.toFixed(2).replace('.', ',')}
                  <span className="text-xs text-white/30 font-medium">/mês</span>
                </p>
                {plan.savings && (
                  <p className="text-[10px] text-green-400 font-bold mt-0.5">Economize {plan.savings}%</p>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[400px] bg-red-500/5 blur-[150px] rounded-full" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <FocusOSLogo size={64} className="mx-auto mb-8" />
            <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[0.95]">
              <span className="bg-gradient-to-b from-white to-white/30 bg-clip-text text-transparent">
                Pronto para<br/>parar de procrastinar?
              </span>
            </h2>
            <p className="text-white/40 text-lg mb-10 max-w-md mx-auto">
              Mais de 2.800 pessoas já transformaram sua rotina. Seu primeiro mês é por nossa conta.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="group px-10 py-5 bg-white text-black font-black rounded-2xl text-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Criar conta grátis
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <p className="text-white/20 text-xs mt-6">
              Gratuito por 30 dias · Sem cartão · Cancele quando quiser
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.05] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <FocusOSLogo size={28} />
            <span className="font-bold text-white/80">FocusOS</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-white/30">
            <Link href="/login" className="hover:text-white transition-colors">Entrar</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Criar conta</Link>
            <a href="mailto:suporte@focusos.app" className="hover:text-white transition-colors">Suporte</a>
          </nav>
          <p className="text-white/20 text-xs text-center">
            © 2026 FocusOS. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
