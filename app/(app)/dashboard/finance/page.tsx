'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, TrendingUp, TrendingDown, Wallet,
  Repeat, ChevronRight, ArrowUpRight, ArrowDownRight,
  Sparkles, PiggyBank, BarChart3, ListFilter,
  Pencil, X, Check, Clock, Target,
} from 'lucide-react'
import { EmojiPicker } from '@/components/dashboard/EmojiPicker'
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  useFinanceTransactions,
  useAddFinanceTransaction,
  useDeleteFinanceTransaction,
  useFinanceRecurringCosts,
  useAddFinanceRecurringCost,
  useDeleteFinanceRecurringCost,
} from '@/lib/hooks/useFinance'
import {
  useReserves,
  useCreateReserve,
  useDeleteReserve,
  useTransact,
  useUpdateReserve,
  useReserveTxs,
  type Reserve,
} from '@/lib/hooks/useReserves'
import { useSettings, useUpdateSettings } from '@/lib/hooks/useSettings'
import type { FinanceTransaction, FinanceRecurringCost } from '@/types'

// ─── Utils ────────────────────────────────────────────────────────────────────

const brl = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const TODAY = new Date().toISOString().split('T')[0]

function isThisMonth(dateStr: string) {
  try {
    return isWithinInterval(parseISO(dateStr), {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    })
  } catch { return false }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  { id: 'blue',    bg: 'bg-blue-500/20',    ring: 'ring-blue-500',    text: 'text-blue-400',    bar: 'bg-blue-500' },
  { id: 'emerald', bg: 'bg-emerald-500/20', ring: 'ring-emerald-500', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  { id: 'amber',   bg: 'bg-amber-500/20',   ring: 'ring-amber-500',   text: 'text-amber-400',   bar: 'bg-amber-500' },
  { id: 'purple',  bg: 'bg-purple-500/20',  ring: 'ring-purple-500',  text: 'text-purple-400',  bar: 'bg-purple-500' },
  { id: 'rose',    bg: 'bg-rose-500/20',    ring: 'ring-rose-500',    text: 'text-rose-400',    bar: 'bg-rose-500' },
  { id: 'cyan',    bg: 'bg-cyan-500/20',    ring: 'ring-cyan-500',    text: 'text-cyan-400',    bar: 'bg-cyan-500' },
  { id: 'orange',  bg: 'bg-orange-500/20',  ring: 'ring-orange-500',  text: 'text-orange-400',  bar: 'bg-orange-500' },
  { id: 'indigo',  bg: 'bg-indigo-500/20',  ring: 'ring-indigo-500',  text: 'text-indigo-400',  bar: 'bg-indigo-500' },
] as const

const EMOJIS = ['💰', '🏦', '🎯', '🏠', '🚗', '✈️', '💊', '📚', '🍔', '🎮', '👗', '💎', '🌴', '🔑', '🛡️', '⚡']

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação',
  'Lazer', 'Vestuário', 'Renda', 'Investimento', 'Outros',
]

const CYCLES: { value: FinanceRecurringCost['billing_cycle']; label: string }[] = [
  { value: 'monthly',  label: 'Mensal' },
  { value: 'weekly',   label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'yearly',   label: 'Anual' },
]

const WIZARD_KEY = 'focusos:finance:wizard_done'

type Tab = 'resumo' | 'lancamentos' | 'recorrentes' | 'reservas'

// ─── Wizard ──────────────────────────────────────────────────────────────────

function Wizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)

  const [incomeTitle, setIncomeTitle]   = useState('Salário')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [expTitle, setExpTitle]         = useState('')
  const [expAmount, setExpAmount]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')

  const addCost = useAddFinanceRecurringCost()
  const updateSettings = useUpdateSettings()

  // Marca como concluído no Firestore (persiste entre dispositivos) + localStorage
  // como cache local para evitar flash do wizard antes das settings carregarem.
  const finish = () => {
    try { localStorage.setItem(WIZARD_KEY, '1') } catch {}
    updateSettings.mutate({ finance_onboarded: true })
    onDone()
  }

  const handleStep0 = async () => {
    const a = parseFloat(incomeAmount.replace(',', '.'))
    if (!a || a <= 0) { setError('Informe um valor válido'); return }
    setSaving(true); setError('')
    try {
      await addCost.mutateAsync({
        title: incomeTitle.trim() || 'Salário',
        amount: a,
        category: 'Renda',
        billing_cycle: 'monthly',
        entry_type: 'income',
      })
      setStep(1)
    } catch { setError('Erro ao salvar. Verifique sua conexão.') }
    finally { setSaving(false) }
  }

  const handleStep1 = async () => {
    const a = parseFloat(expAmount.replace(',', '.'))
    if (!expTitle.trim() || !a || a <= 0) { finish(); return }
    setSaving(true); setError('')
    try {
      await addCost.mutateAsync({
        title: expTitle.trim(),
        amount: a,
        category: 'Moradia',
        billing_cycle: 'monthly',
        entry_type: 'expense',
      })
      setStep(2)
    } catch { setError('Erro ao salvar. Verifique sua conexão.') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-zinc-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex gap-2 mb-6">
          {[0, 1].map(i => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i < step ? 'bg-emerald-500' : i === step ? 'bg-blue-500' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="text-4xl mb-3">💸</div>
              <h2 className="text-xl font-bold text-white mb-1">Qual é sua renda mensal?</h2>
              <p className="text-zinc-400 text-sm mb-5">Vamos configurar seu perfil financeiro.</p>

              <input
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-500"
                placeholder="Ex: Salário, Freelance..."
                value={incomeTitle}
                onChange={e => setIncomeTitle(e.target.value)}
              />
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">R$</span>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-600"
                  placeholder="0,00"
                  value={incomeAmount}
                  onChange={e => setIncomeAmount(e.target.value)}
                  inputMode="decimal"
                  onKeyDown={e => e.key === 'Enter' && handleStep0()}
                />
              </div>
              {error && <p className="text-rose-400 text-xs mb-3">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={finish}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3 rounded-xl transition-colors text-sm"
                >
                  Pular
                </button>
                <button
                  disabled={saving}
                  onClick={handleStep0}
                  className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Continuar →'}
                </button>
              </div>
              <p className="text-zinc-600 text-[11px] text-center mt-3">
                Você pode configurar isso depois na aba Recorrentes.
              </p>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="text-4xl mb-3">🏠</div>
              <h2 className="text-xl font-bold text-white mb-1">Maior gasto fixo?</h2>
              <p className="text-zinc-400 text-sm mb-5">Aluguel, financiamento... pode pular.</p>

              <input
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-500"
                placeholder="Ex: Aluguel"
                value={expTitle}
                onChange={e => setExpTitle(e.target.value)}
              />
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">R$</span>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
                  placeholder="0,00"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              {error && <p className="text-rose-400 text-xs mb-3">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={finish}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3 rounded-xl transition-colors text-sm"
                >
                  Pular
                </button>
                <button
                  disabled={saving}
                  onClick={handleStep1}
                  className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Continuar →'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-white mb-2">Perfil configurado!</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Agora acompanhe seus gastos, crie reservas e conecte com seu plano de aposentadoria.
              </p>
              <button
                onClick={finish}
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold py-3 rounded-xl"
              >
                Ir para o painel →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─── Tab: Resumo ──────────────────────────────────────────────────────────────

function ResumoTab({
  transactions,
  recurring,
  reserves,
  onNavigate,
}: {
  transactions: FinanceTransaction[]
  recurring: FinanceRecurringCost[]
  reserves: Reserve[] | undefined
  onNavigate: (tab: Tab) => void
}) {
  const router = useRouter()

  const monthlyIncome  = recurring.filter(r => r.entry_type === 'income').reduce((s, r) => s + r.amount, 0)
  const fixedExpenses  = recurring.filter(r => r.entry_type !== 'income').reduce((s, r) => s + r.amount, 0)

  const thisMonthTx = transactions.filter(t => isThisMonth(t.date))
  const varIncome   = thisMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const varExpenses = thisMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const totalIncome   = monthlyIncome + varIncome
  const totalExpenses = fixedExpenses + varExpenses
  const balance       = totalIncome - totalExpenses
  const totalReserves = (reserves ?? []).reduce((s, r) => s + r.balance, 0)

  const retirementMonthly = useMemo(() => {
    if (typeof window === 'undefined') return 0
    try {
      const cfg = JSON.parse(localStorage.getItem('focusos:retirement') ?? '{}')
      return (cfg.monthlyContribution as number) ?? 0
    } catch { return 0 }
  }, [])

  const base     = totalIncome || 1
  const fixedPct = Math.min(100, (fixedExpenses / base) * 100)
  const varPct   = Math.min(100 - fixedPct, (varExpenses / base) * 100)
  const freePct  = Math.max(0, 100 - fixedPct - varPct)

  const categories = useMemo(() => {
    const map: Record<string, number> = {}
    thisMonthTx
      .filter(t => t.type === 'expense')
      .forEach(t => { const cat = t.category ?? 'Outros'; map[cat] = (map[cat] ?? 0) + t.amount })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [thisMonthTx])

  const kpis = [
    {
      label: 'Renda Mensal',
      value: totalIncome,
      color: 'text-emerald-400',
      sub: `${recurring.filter(r => r.entry_type === 'income').length} recorrentes`,
      icon: TrendingUp,
    },
    {
      label: 'Gastos Totais',
      value: totalExpenses,
      color: 'text-rose-400',
      sub: `${brl(fixedExpenses)} fixos`,
      icon: TrendingDown,
    },
    {
      label: 'Saldo Livre',
      value: balance,
      color: balance >= 0 ? 'text-blue-400' : 'text-amber-400',
      sub: balance >= 0 ? 'disponível' : 'no vermelho',
      icon: Wallet,
    },
    {
      label: 'Em Reservas',
      value: totalReserves,
      color: 'text-purple-400',
      sub: `${reserves?.length ?? 0} potes`,
      icon: PiggyBank,
    },
  ]

  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <k.icon size={13} className={k.color} />
              <span className="text-xs text-zinc-500">{k.label}</span>
            </div>
            <div className={`text-lg font-bold leading-tight ${k.color}`}>{brl(k.value)}</div>
            <div className="text-xs text-zinc-600 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Cash flow bar */}
      {totalIncome > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-zinc-200">Fluxo do Mês</span>
            <span className="text-xs text-zinc-500 capitalize">
              {format(new Date(), 'MMMM', { locale: ptBR })}
            </span>
          </div>
          <div className="h-4 rounded-full bg-zinc-800 overflow-hidden flex">
            <div className="h-full bg-rose-500/80 transition-all duration-700"   style={{ width: `${fixedPct}%` }} />
            <div className="h-full bg-amber-400/80 transition-all duration-700"  style={{ width: `${varPct}%` }} />
            <div className="h-full bg-emerald-500/60 transition-all duration-700" style={{ width: `${freePct}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500/80 shrink-0" />Fixos {brl(fixedExpenses)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400/80 shrink-0" />Variáveis {brl(varExpenses)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500/60 shrink-0" />Livre {brl(balance)}
            </span>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-zinc-200">Gastos por Categoria</span>
            <button
              onClick={() => onNavigate('lancamentos')}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Ver todos →
            </button>
          </div>
          <div className="space-y-2.5">
            {categories.map(([cat, total]) => (
              <div key={cat}>
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>{cat}</span>
                  <span className="font-medium">{brl(total)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-rose-500/70 transition-all duration-500"
                    style={{ width: `${Math.min(100, (total / (totalExpenses || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retirement card */}
      {retirementMonthly > 0 && (
        <button
          onClick={() => router.push('/dashboard/aposentadoria/acompanhamento')}
          className="w-full bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-center gap-3 hover:bg-amber-500/15 transition-colors text-left group"
        >
          <span className="text-2xl">🎯</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-300">Plano de Aposentadoria</div>
            <div className="text-xs text-zinc-400 mt-0.5">
              Aporte mensal:{' '}
              <span className="text-amber-400 font-medium">{brl(retirementMonthly)}</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-amber-500/50 group-hover:text-amber-500/80 transition-colors shrink-0" />
        </button>
      )}

      {/* Recent transactions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-zinc-200">Últimos Lançamentos</span>
          <button
            onClick={() => onNavigate('lancamentos')}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Ver todos →
          </button>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-zinc-600 text-sm mb-2">Nenhum lançamento ainda.</p>
            <button
              onClick={() => onNavigate('lancamentos')}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
            >
              Adicionar primeiro lançamento →
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.slice(0, 6).map(tx => (
              <div key={tx.id} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type === 'income' ? 'bg-emerald-500/15' : 'bg-rose-500/15'
                  }`}
                >
                  {tx.type === 'income'
                    ? <ArrowUpRight size={14} className="text-emerald-400" />
                    : <ArrowDownRight size={14} className="text-rose-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-200 truncate">{tx.title}</div>
                  <div className="text-xs text-zinc-500">
                    {format(parseISO(tx.date), 'dd/MM', { locale: ptBR })}
                    {tx.category ? ` · ${tx.category}` : ''}
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold shrink-0 ${
                    tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'}{brl(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Lançamentos ─────────────────────────────────────────────────────────

function LancamentosTab({ transactions }: { transactions: FinanceTransaction[] }) {
  const addTx    = useAddFinanceTransaction()
  const deleteTx = useDeleteFinanceTransaction()

  const [title, setTitle]       = useState('')
  const [amount, setAmount]     = useState('')
  const [type, setType]         = useState<'expense' | 'income'>('expense')
  const [category, setCategory] = useState('Outros')
  const [date, setDate]         = useState(TODAY)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [filter, setFilter]     = useState<'all' | 'income' | 'expense'>('all')

  const handleAdd = async () => {
    const a = parseFloat(amount.replace(',', '.'))
    if (!title.trim() || !a || a <= 0) { setError('Preencha título e valor'); return }
    setSaving(true); setError('')
    try {
      await addTx.mutateAsync({ title: title.trim(), amount: a, type, category, date })
      setTitle(''); setAmount('')
    } catch { setError('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  const handleAiParse = async () => {
    if (!title.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/parse-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: title }),
      })
      if (res.ok) {
        const d = await res.json()
        if (d.title)    setTitle(d.title)
        if (d.amount)   setAmount(String(d.amount))
        if (d.type)     setType(d.type)
        if (d.category) setCategory(d.category)
      }
    } catch {}
    finally { setAiLoading(false) }
  }

  const filtered = transactions.filter(t => filter === 'all' || t.type === filter)

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex gap-2">
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                type === t
                  ? t === 'expense'
                    ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'expense' ? '↓ Gasto' : '↑ Renda'}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 pr-11 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-500"
            placeholder='Descrição — ou "Gastei R$50 no mercado" para IA'
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          {title.trim() && (
            <button
              onClick={handleAiParse}
              disabled={aiLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors"
              title="Parsear com IA"
            >
              <Sparkles size={16} className={aiLoading ? 'animate-pulse' : ''} />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">R$</span>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              inputMode="decimal"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <input
            type="date"
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <select
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>

        {error && <p className="text-rose-400 text-xs">{error}</p>}

        <button
          disabled={saving}
          onClick={handleAdd}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${
            type === 'expense'
              ? 'bg-rose-500 hover:bg-rose-400 text-white'
              : 'bg-emerald-500 hover:bg-emerald-400 text-white'
          }`}
        >
          {saving ? 'Salvando...' : `+ Registrar ${type === 'expense' ? 'Gasto' : 'Renda'}`}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'income', 'expense'] as const).map(v => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === v ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {v === 'all' ? 'Todos' : v === 'income' ? 'Renda' : 'Gastos'}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-600">{filtered.length} registros</span>
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {filtered.map(tx => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16, height: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 group"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  tx.type === 'income' ? 'bg-emerald-500/15' : 'bg-rose-500/15'
                }`}
              >
                {tx.type === 'income'
                  ? <ArrowUpRight size={15} className="text-emerald-400" />
                  : <ArrowDownRight size={15} className="text-rose-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-200 font-medium truncate">{tx.title}</div>
                <div className="text-xs text-zinc-500">
                  {format(parseISO(tx.date), 'dd/MM/yyyy')}
                  {tx.category ? ` · ${tx.category}` : ''}
                </div>
              </div>
              <span
                className={`text-sm font-bold shrink-0 ${
                  tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {tx.type === 'income' ? '+' : '-'}{brl(tx.amount)}
              </span>
              <button
                onClick={() => deleteTx.mutate(tx.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all ml-1 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-zinc-600 text-sm">Nenhum lançamento.</div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Recorrentes ─────────────────────────────────────────────────────────

function RecurringItem({
  item,
  onDelete,
}: {
  item: FinanceRecurringCost
  onDelete: () => void
}) {
  const isIncome   = item.entry_type === 'income'
  const cycleLabel = CYCLES.find(c => c.value === item.billing_cycle)?.label ?? item.billing_cycle

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 group mb-2"
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isIncome ? 'bg-emerald-500/15' : 'bg-rose-500/15'
        }`}
      >
        {isIncome
          ? <ArrowUpRight size={15} className="text-emerald-400" />
          : <ArrowDownRight size={15} className="text-rose-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-200 font-medium truncate">{item.title}</div>
        <div className="text-xs text-zinc-500">{item.category} · {cycleLabel}</div>
      </div>
      <span className={`text-sm font-bold shrink-0 ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isIncome ? '+' : '-'}{brl(item.amount)}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all shrink-0"
      >
        <Trash2 size={13} />
      </button>
    </motion.div>
  )
}

function RecorrentesTab({ recurring }: { recurring: FinanceRecurringCost[] }) {
  const addCost    = useAddFinanceRecurringCost()
  const deleteCost = useDeleteFinanceRecurringCost()

  const [showForm, setShowForm]     = useState(false)
  const [title, setTitle]           = useState('')
  const [amount, setAmount]         = useState('')
  const [entryType, setEntryType]   = useState<'expense' | 'income'>('expense')
  const [category, setCategory]     = useState('Moradia')
  const [cycle, setCycle]           = useState<FinanceRecurringCost['billing_cycle']>('monthly')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const incomeItems  = recurring.filter(r => r.entry_type === 'income')
  const expenseItems = recurring.filter(r => r.entry_type !== 'income')
  const totalIncome  = incomeItems.reduce((s, r) => s + r.amount, 0)
  const totalExpense = expenseItems.reduce((s, r) => s + r.amount, 0)

  const handleAdd = async () => {
    const a = parseFloat(amount.replace(',', '.'))
    if (!title.trim() || !a || a <= 0) { setError('Preencha título e valor'); return }
    setSaving(true); setError('')
    try {
      await addCost.mutateAsync({
        title: title.trim(),
        amount: a,
        category,
        billing_cycle: cycle,
        entry_type: entryType,
      })
      setTitle(''); setAmount(''); setShowForm(false)
    } catch { setError('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <div className="text-xs text-emerald-400 mb-1">Renda Recorrente</div>
          <div className="text-xl font-bold text-emerald-400">{brl(totalIncome)}</div>
          <div className="text-xs text-zinc-500">{incomeItems.length} {incomeItems.length === 1 ? 'item' : 'itens'}</div>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
          <div className="text-xs text-rose-400 mb-1">Gastos Fixos</div>
          <div className="text-xl font-bold text-rose-400">{brl(totalExpense)}</div>
          <div className="text-xs text-zinc-500">{expenseItems.length} {expenseItems.length === 1 ? 'item' : 'itens'}</div>
        </div>
      </div>

      {/* Add toggle */}
      <button
        onClick={() => setShowForm(v => !v)}
        className="w-full py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors text-sm flex items-center justify-center gap-2"
      >
        <Plus size={15} />
        {showForm ? 'Cancelar' : 'Adicionar recorrente'}
      </button>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setEntryType(t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                      entryType === t
                        ? t === 'expense'
                          ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {t === 'expense' ? 'Gasto Fixo' : 'Renda Recorrente'}
                  </button>
                ))}
              </div>

              <input
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-500"
                placeholder="Ex: Aluguel, Netflix, Salário..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">R$</span>
                  <input
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
                    placeholder="0,00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    inputMode="decimal"
                  />
                </div>
                <select
                  className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                  value={cycle}
                  onChange={e => setCycle(e.target.value as FinanceRecurringCost['billing_cycle'])}
                >
                  {CYCLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>

              {error && <p className="text-rose-400 text-xs">{error}</p>}

              <button
                disabled={saving}
                onClick={handleAdd}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Income list */}
      {incomeItems.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 px-1">Renda</div>
          <AnimatePresence>
            {incomeItems.map(item => (
              <RecurringItem key={item.id} item={item} onDelete={() => deleteCost.mutate(item.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Expense list */}
      {expenseItems.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 px-1 mt-2">Gastos Fixos</div>
          <AnimatePresence>
            {expenseItems.map(item => (
              <RecurringItem key={item.id} item={item} onDelete={() => deleteCost.mutate(item.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {recurring.length === 0 && !showForm && (
        <div className="text-center py-10 text-zinc-600 text-sm">Nenhum recorrente configurado.</div>
      )}
    </div>
  )
}

// ─── Tab: Reservas ────────────────────────────────────────────────────────────

function TxHistoryList({ reserveId }: { reserveId: string }) {
  const { data: txs = [], isLoading } = useReserveTxs(reserveId)
  if (isLoading) {
    return <div className="text-center py-4 text-zinc-600 text-xs animate-pulse">Carregando...</div>
  }
  const sorted = [...txs].sort((a, b) => b.created_at.localeCompare(a.created_at))
  if (sorted.length === 0) {
    return <div className="text-center py-4 text-zinc-600 text-xs">Sem movimentações.</div>
  }
  return (
    <div className="space-y-2 max-h-44 overflow-y-auto">
      {sorted.map(tx => (
        <div key={tx.id} className="flex items-center gap-2">
          <span className={`text-sm font-semibold shrink-0 ${tx.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {tx.type === 'deposit' ? '+' : '-'}{brl(tx.amount)}
          </span>
          {tx.note && <span className="text-zinc-500 text-xs flex-1 truncate">{tx.note}</span>}
          <span className="text-zinc-600 text-xs shrink-0 ml-auto">{tx.date}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Reserve helpers (finance page) ──────────────────────────────────────────

const RESERVE_COLORS = [
  { id: 'blue',    stroke: '#3b82f6', bg: 'bg-blue-500/15',    ring: 'ring-blue-500',    text: 'text-blue-400',    dot: 'bg-blue-500'    },
  { id: 'emerald', stroke: '#10b981', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  { id: 'amber',   stroke: '#f59e0b', bg: 'bg-amber-500/15',   ring: 'ring-amber-500',   text: 'text-amber-400',   dot: 'bg-amber-500'   },
  { id: 'purple',  stroke: '#a855f7', bg: 'bg-purple-500/15',  ring: 'ring-purple-500',  text: 'text-purple-400',  dot: 'bg-purple-500'  },
  { id: 'rose',    stroke: '#f43f5e', bg: 'bg-rose-500/15',    ring: 'ring-rose-500',    text: 'text-rose-400',    dot: 'bg-rose-500'    },
  { id: 'cyan',    stroke: '#06b6d4', bg: 'bg-cyan-500/15',    ring: 'ring-cyan-500',    text: 'text-cyan-400',    dot: 'bg-cyan-500'    },
  { id: 'orange',  stroke: '#f97316', bg: 'bg-orange-500/15',  ring: 'ring-orange-500',  text: 'text-orange-400',  dot: 'bg-orange-500'  },
  { id: 'indigo',  stroke: '#6366f1', bg: 'bg-indigo-500/15',  ring: 'ring-indigo-500',  text: 'text-indigo-400',  dot: 'bg-indigo-500'  },
]

function rsvColorById(id: string) {
  return RESERVE_COLORS.find(c => c.id === id) ?? RESERVE_COLORS[0]
}

function ReserveProgressRing({ pct, stroke, size = 64, thickness = 4 }: { pct: number; stroke: string; size?: number; thickness?: number }) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(pct, 100) / 100)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} className="absolute inset-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={stroke} strokeWidth={thickness}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  )
}

function ReserveEditModal({ reserve, onClose }: { reserve: Reserve; onClose: () => void }) {
  const { mutate: update, isPending } = useUpdateReserve()
  const [name, setName]     = useState(reserve.name)
  const [emoji, setEmoji]   = useState(reserve.emoji)
  const [color, setColor]   = useState(reserve.color)
  const [target, setTarget] = useState(reserve.target > 0 ? String(reserve.target) : '')

  function handleSave() {
    if (!name.trim()) return
    update({ id: reserve.id, name: name.trim(), emoji, color, target: parseInt(target.replace(/\D/g, ''), 10) || 0 }, { onSuccess: onClose })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="w-full max-w-sm bg-[#1a1a1a] rounded-3xl border border-white/[0.08] p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <p className="text-base font-black text-white">Editar Reserva</p>
          <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"><X size={16} /></button>
        </div>
        <div className="flex justify-center">
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>
        <input type="text" placeholder="Nome da reserva" value={name} onChange={e => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-white placeholder:text-white/25 outline-none focus:border-white/25 transition-colors"
        />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2.5">Cor</p>
          <div className="flex gap-2.5 flex-wrap">
            {RESERVE_COLORS.map(c => (
              <button key={c.id} onClick={() => setColor(c.id)}
                className={cn('w-8 h-8 rounded-full transition-all', c.dot, color === c.id ? `ring-2 ring-offset-2 ring-offset-[#1a1a1a] ${c.ring}` : 'opacity-60 hover:opacity-100')}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] focus-within:border-white/20 transition-colors">
          <Target size={14} className="text-white/30 shrink-0" />
          <span className="text-sm text-white/30 font-semibold shrink-0">Meta R$</span>
          <input type="text" inputMode="numeric" placeholder="Sem meta" value={target} onChange={e => setTarget(e.target.value.replace(/\D/g, ''))}
            className="flex-1 bg-transparent text-sm font-bold text-white outline-none min-w-0 placeholder:text-white/20"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/[0.08] text-sm text-white/40 hover:text-white/70 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={isPending || !name.trim()}
            className={cn('flex-1 py-3 rounded-2xl bg-white text-black text-sm font-black transition-all hover:bg-white/90', (isPending || !name.trim()) && 'opacity-40 cursor-not-allowed')}
          >{isPending ? '...' : 'Salvar'}</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ReserveCard({ reserve }: { reserve: Reserve }) {
  const { mutate: deleteReserve } = useDeleteReserve()
  const { mutate: transact, isPending: txPending } = useTransact()

  const [panel, setPanel]   = useState<'transact' | 'history' | null>(null)
  const [txType, setTxType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [txAmount, setTxAmount] = useState('')
  const [txNote, setTxNote]     = useState('')
  const [editing, setEditing]   = useState(false)

  const col = rsvColorById(reserve.color)
  const pct = reserve.target > 0 ? Math.min(100, Math.round((reserve.balance / reserve.target) * 100)) : null
  const isGoalMet = pct !== null && pct >= 100
  const RING = 60

  function handleTransact() {
    const a = parseInt(txAmount.replace(/\D/g, ''), 10)
    if (!a || a <= 0) return
    transact({ reserveId: reserve.id, amount: a, type: txType, note: txNote, currentBalance: reserve.balance }, {
      onSuccess: () => { setTxAmount(''); setTxNote(''); setPanel(null) }
    })
  }

  function confirmDelete() {
    if (window.confirm(`Excluir "${reserve.name}"? Todas as movimentações serão apagadas.`)) deleteReserve(reserve.id)
  }

  return (
    <>
      <AnimatePresence>{editing && <ReserveEditModal key="edit" reserve={reserve} onClose={() => setEditing(false)} />}</AnimatePresence>
      <div className="bg-[var(--bg-overlay)] border border-white/[0.06] rounded-2xl p-4 hover:border-white/[0.10] transition-colors">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0" style={{ width: RING, height: RING }}>
            {pct !== null && <ReserveProgressRing pct={pct} stroke={col.stroke} size={RING} />}
            <div className={cn('absolute inset-[5px] rounded-full flex items-center justify-center text-xl', col.bg)}>{reserve.emoji}</div>
            {isGoalMet && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check size={8} className="text-white" strokeWidth={3} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-white truncate">{reserve.name}</p>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditing(true)} className="p-1 rounded-lg text-white/25 hover:text-white hover:bg-white/[0.06] transition-all"><Pencil size={11} /></button>
                <button onClick={confirmDelete} className="p-1 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={11} /></button>
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={cn('text-xl font-black tabular-nums', col.text)}>{brl(reserve.balance)}</span>
              {reserve.target > 0 && <span className="text-xs text-white/30">/ {brl(reserve.target)}</span>}
            </div>
            {pct !== null && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: col.stroke }}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                </div>
                <span className="text-[10px] font-bold text-white/25 tabular-nums">{pct}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {([['transact', TrendingUp, 'Movimentar'], ['history', Clock, 'Histórico']] as const).map(([p, Icon, label]) => (
            <button key={p} onClick={() => setPanel(prev => prev === p ? null : p)}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border uppercase tracking-wide transition-all',
                panel === p ? 'bg-white/[0.08] border-white/20 text-white' : 'border-white/[0.08] text-white/35 hover:text-white hover:border-white/20'
              )}
            >
              <Icon size={11} />{label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {panel === 'transact' && (
            <motion.div key="transact" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="pt-3 mt-3 border-t border-white/[0.06] space-y-2.5">
                <div className="flex gap-2">
                  {(['deposit', 'withdrawal'] as const).map(t => (
                    <button key={t} onClick={() => setTxType(t)}
                      className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all uppercase tracking-wide flex items-center justify-center gap-1',
                        txType === t && t === 'deposit' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : txType === t ? 'bg-red-500/20 border-red-500/40 text-red-400'
                          : 'border-white/[0.08] text-white/30 hover:text-white/60'
                      )}
                    >
                      {t === 'deposit' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {t === 'deposit' ? 'Depositar' : 'Retirar'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] focus-within:border-white/20 transition-colors">
                  <span className="text-xs text-white/30 font-semibold shrink-0">R$</span>
                  <input type="text" inputMode="numeric" placeholder="0" value={txAmount} onChange={e => setTxAmount(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleTransact()} autoFocus
                    className="flex-1 bg-transparent text-base font-black text-white outline-none min-w-0 placeholder:text-white/20"
                  />
                </div>
                <input type="text" placeholder="Observação (opcional)" value={txNote} onChange={e => setTxNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
                />
                <div className="flex gap-2">
                  <button onClick={() => setPanel(null)} className="flex-1 py-2 rounded-xl border border-white/[0.08] text-xs text-white/35 hover:text-white/70 transition-all">Cancelar</button>
                  <button onClick={handleTransact} disabled={txPending || !txAmount}
                    className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                      txType === 'deposit' ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-red-500 text-white hover:bg-red-400',
                      (txPending || !txAmount) && 'opacity-40 cursor-not-allowed'
                    )}
                  >{txPending ? '...' : txType === 'deposit' ? 'Depositar' : 'Retirar'}</button>
                </div>
              </div>
            </motion.div>
          )}
          {panel === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <TxHistoryList reserveId={reserve.id} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

function ReservasTab() {
  const { data: reserves = [], isLoading } = useReserves()
  const { mutate: createReserve, isPending: creating } = useCreateReserve()

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName]   = useState('')
  const [emoji, setEmoji] = useState('💰')
  const [colorId, setColorId] = useState('blue')
  const [target, setTarget]   = useState('')

  const totalReserves = reserves.reduce((s, r) => s + r.balance, 0)
  const goalsMetCount = reserves.filter(r => r.target > 0 && r.balance >= r.target).length

  function handleCreate() {
    if (!name.trim()) return
    createReserve({ name: name.trim(), emoji, color: colorId, target: parseInt(target.replace(/\D/g, ''), 10) || 0 }, {
      onSuccess: () => { setName(''); setTarget(''); setShowCreate(false) }
    })
  }

  if (isLoading) return <div className="text-center py-12 text-white/30 text-sm">Carregando reservas...</div>

  return (
    <div className="space-y-4">
      {reserves.length > 0 && (
        <div className="bg-[var(--bg-overlay)] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4">
          <PiggyBank size={24} className="text-purple-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-white/35 mb-0.5">Total em Reservas</p>
            <p className="text-xl font-black text-white">{brl(totalReserves)}</p>
            <p className="text-xs text-white/30 mt-0.5">
              {reserves.length} {reserves.length === 1 ? 'reserva' : 'reservas'}
              {goalsMetCount > 0 && <span className="text-emerald-400 ml-2">· {goalsMetCount} meta{goalsMetCount > 1 ? 's' : ''} ✓</span>}
            </p>
          </div>
        </div>
      )}

      <button onClick={() => setShowCreate(v => !v)}
        className="w-full py-3 rounded-xl border border-dashed border-white/10 text-white/35 hover:text-white hover:border-white/25 transition-colors text-sm flex items-center justify-center gap-2"
      >
        <Plus size={14} />{showCreate ? 'Cancelar' : 'Nova Reserva'}
      </button>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-[var(--bg-overlay)] border border-white/[0.08] rounded-2xl p-4 space-y-4">
              <p className="text-sm font-black text-white">Nova Reserva</p>
              <div className="flex justify-center">
                <EmojiPicker value={emoji} onChange={setEmoji} />
              </div>
              <input type="text" placeholder="Nome da reserva" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus
                className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-bold text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
              />
              <div className="flex gap-2 flex-wrap">
                {RESERVE_COLORS.map(c => (
                  <button key={c.id} onClick={() => setColorId(c.id)}
                    className={cn('w-7 h-7 rounded-full transition-all', c.dot, colorId === c.id ? `ring-2 ring-offset-2 ring-offset-[var(--bg-overlay)] ${c.ring}` : 'opacity-60 hover:opacity-100')}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] focus-within:border-white/20 transition-colors">
                <Target size={13} className="text-white/30 shrink-0" />
                <span className="text-sm text-white/30 shrink-0">Meta R$</span>
                <input type="text" inputMode="numeric" placeholder="Opcional" value={target} onChange={e => setTarget(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-transparent text-sm font-bold text-white outline-none min-w-0 placeholder:text-white/20"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/35 hover:text-white/70 transition-all">Cancelar</button>
                <button onClick={handleCreate} disabled={creating || !name.trim()}
                  className={cn('flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-black transition-all hover:bg-white/90', (creating || !name.trim()) && 'opacity-40 cursor-not-allowed')}
                >{creating ? '...' : 'Criar'}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <AnimatePresence>
          {reserves.map(r => (
            <motion.div key={r.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
              <ReserveCard reserve={r} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {reserves.length === 0 && !showCreate && (
        <div className="text-center py-12 text-white/25">
          <PiggyBank size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma reserva criada ainda.</p>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'resumo',      label: 'Resumo',      icon: BarChart3  },
  { id: 'lancamentos', label: 'Lançamentos', icon: ListFilter },
  { id: 'recorrentes', label: 'Recorrentes', icon: Repeat     },
  { id: 'reservas',    label: 'Reservas',    icon: PiggyBank  },
]

export default function FinancePage() {
  const [tab, setTab]           = useState<Tab>('resumo')
  const [showWizard, setShowWizard] = useState(false)

  const { data: transactions = [], isLoading: loadingTx  } = useFinanceTransactions()
  const { data: recurring    = [], isLoading: loadingRec } = useFinanceRecurringCosts()
  const { data: reserves         } = useReserves()
  const { data: settings,          isLoading: loadingSet } = useSettings()
  const updateSettings = useUpdateSettings()

  // O wizard só aparece para quem realmente nunca configurou nada.
  // Antes usávamos apenas localStorage, então ele reaparecia a cada novo
  // dispositivo/navegador. Agora a fonte da verdade é o Firestore, com dois
  // fallbacks: cache local e — o mais importante — os próprios dados do usuário.
  useEffect(() => {
    if (loadingSet || loadingRec || loadingTx) return          // espera dados: evita flash
    if (!settings) return                                      // deslogado ou query desabilitada
    if (settings.finance_onboarded) return                     // já concluiu (qualquer device)

    const hasData = recurring.length > 0 || transactions.length > 0
    if (hasData) {
      // Usuário já tem dados mas a flag nunca foi gravada (conta antiga ou
      // localStorage perdido). Grava agora para não perguntar de novo.
      updateSettings.mutate({ finance_onboarded: true })
      return
    }

    let cached = false
    try { cached = !!localStorage.getItem(WIZARD_KEY) } catch {}
    if (cached) {
      updateSettings.mutate({ finance_onboarded: true })       // migra flag antiga p/ Firestore
      return
    }

    setShowWizard(true)
  }, [loadingSet, loadingRec, loadingTx, settings?.finance_onboarded, recurring.length, transactions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {showWizard && <Wizard onDone={() => setShowWizard(false)} />}

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Finanças</h1>
            <p className="text-zinc-500 text-sm capitalize">
              {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Wallet size={18} className="text-emerald-400" />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-1 mb-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                tab === t.id
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <t.icon size={13} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
          >
            {tab === 'resumo' && (
              <ResumoTab
                transactions={transactions}
                recurring={recurring}
                reserves={reserves}
                onNavigate={setTab}
              />
            )}
            {tab === 'lancamentos' && <LancamentosTab transactions={transactions} />}
            {tab === 'recorrentes' && <RecorrentesTab recurring={recurring} />}
            {tab === 'reservas'    && <ReservasTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}
