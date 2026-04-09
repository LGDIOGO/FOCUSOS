'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wallet, TrendingUp, Target, Shield, BookOpen, Plane, Crown, Play, CheckCircle2, ChevronRight, Plus, Rocket, X, Zap, ArrowRight, Check, History, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { 
  useFinanceTransactions, useFinanceRecurringCosts, useFinancePotes, useFinanceRoadmap,
  useAddFinanceTransaction, useAddFinanceRecurringCost, useAddFinancePote, useUpdateFinanceRoadmap,
  useDeleteFinanceTransaction, useDeleteFinanceRecurringCost, useDeleteFinancePote, useUpdateFinancePote
} from '@/lib/hooks/useFinance'
import { useAddEvent } from '@/lib/hooks/useEvents'

import { 
  format, isSameMonth, isSameWeek, isSameYear, parseISO, subDays, startOfWeek, endOfWeek, 
  differenceInDays, isWithinInterval, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, addMonths
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SharedHistoryBar, PeriodFilter, DateRange } from '@/components/dashboard/SharedHistoryBar'
import { getDateRangeFromPeriod } from '@/lib/utils/dateFilters'

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'potes' | 'roadmap'>('overview')
  const [selectedNature, setSelectedNature] = useState<'necessidade' | 'urgencia' | 'desejo' | null>(null)
  // Global Dashboard & History Filter
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('current_month')
  const [customRange, setCustomRange] = useState<DateRange>({ start: '', end: '' })
  
  const resolvedDateRange = useMemo(() => {
    return getDateRangeFromPeriod(periodFilter, customRange)
  }, [periodFilter, customRange])

  // DATA HOOKS
  const { data: transactions = [], isLoading: isLoadingTx } = useFinanceTransactions()
  const { data: costs = [], isLoading: isLoadingCosts } = useFinanceRecurringCosts()
  const { data: potes = [], isLoading: isLoadingPotes } = useFinancePotes()
  const { data: roadmap, isLoading: isLoadingRoadmap } = useFinanceRoadmap()

  const dataIsLoading = isLoadingTx || isLoadingCosts || isLoadingPotes

  // MUTATIONS
  const addTransaction = useAddFinanceTransaction()
  const addCost = useAddFinanceRecurringCost()
  const addPote = useAddFinancePote()
  const updateRoadmap = useUpdateFinanceRoadmap()
  
  const deleteTransaction = useDeleteFinanceTransaction()
  const deleteCost = useDeleteFinanceRecurringCost()
  const deletePote = useDeleteFinancePote()
  const updatePote = useUpdateFinancePote()
  const addEvent = useAddEvent()

  // MODAL STATES
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false)
  const [isCostModalOpen, setCostModalOpen] = useState(false)
  const [isPoteModalOpen, setPoteModalOpen] = useState(false)
  const [isAporteModalOpen, setIsAporteModalOpen] = useState(false)
  const [aportePoteId, setAportePoteId] = useState<string | null>(null)
  
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [isInstallment, setIsInstallment] = useState(false)

  // ONBOARDING WIZARD STATE
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  
  // Verify if it's a completely new user
  useEffect(() => {
    if (!dataIsLoading && transactions.length === 0 && costs.length === 0 && potes.length === 0) {
      setShowWizard(true)
    } else {
      setShowWizard(false)
    }
  }, [dataIsLoading, transactions.length, costs.length, potes.length])

  // FILTER TRANSACTIONS GLOBALLY BY SELECTED DATE RANGE
  const filteredGlobalTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Ignore filter parsing if 'all_time' or if t.date doesn't strictly exist
      if (periodFilter === 'all_time') return true
      if (!t.date) return false
      
      const txDate = t.date.split('T')[0] // yyyy-MM-dd
      return txDate >= resolvedDateRange.start && txDate <= resolvedDateRange.end
    })
  }, [transactions, periodFilter, resolvedDateRange])

  // DERIVED DATA (BASED ON FILTERED PERIOD)
  const totalIncome = filteredGlobalTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
  const totalExpense = filteredGlobalTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
  const totalFixedCosts = costs.reduce((acc, c) => acc + c.amount, 0)
  
  // Comprometimento do Período
  const safeCashFlow = totalIncome > 0 ? (totalFixedCosts + totalExpense) / totalIncome * 100 : 0
  const periodRemnant = totalIncome - (totalFixedCosts + totalExpense)

  // AI GENERATION FUNCTION CONNECTED TO BACKEND
  const handleGenerateAIPlan = async () => {
    setIsGeneratingAI(true)
    try {
      const response = await fetch('/api/ai/finance-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          income: totalIncome,
          fixedCosts: totalFixedCosts,
          variableExpenses: totalExpense,
          potes: potes.map(p => ({ title: p.title, percent: p.allocation_type === 'percentage' ? p.allocation_value : 0 })),
          // Enviar projeções futuras conhecidas
          futureTransactions: transactions.filter(t => t.date > new Date().toISOString().split('T')[0]).map(t => ({
            title: t.title,
            amount: t.amount,
            date: t.date,
            type: t.type,
            nature: t.nature
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Falha ao gerar o plano pelo servidor.')
      }

      const data = await response.json()
      
      if (data.plan && Array.isArray(data.plan)) {
        await updateRoadmap.mutateAsync(JSON.stringify(data.plan))
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  // FILTERING LOGIC
  // Sort transactions by date descending
  const sortedFilteredTransactions = [...filteredGlobalTransactions].sort((a, b) => b.date.localeCompare(a.date))
  
  // Recent transactions for the main "Diário de Caixa" (limit to top 10 most recent)
  const recentTransactions = sortedFilteredTransactions.slice(0, 10)

  // Filtered transactions for the History view (same as global, but we use them all un-sliced)
  const filteredHistory = sortedFilteredTransactions

  const historyIncomeTotal = filteredHistory.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0)
  const historyExpenseTotal = filteredHistory.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + t.amount, 0)

  if (dataIsLoading) {
    return <div className="p-10 text-center text-[var(--text-muted)] animate-pulse">Carregando Finanças...</div>
  }

  // --- WIZARD RENDER ---
  if (showWizard) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            
            {/* WIZARD STEP 1: WELCOME & INCOME */}
            {wizardStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[var(--bg-overlay)] border border-[var(--border-subtle)] p-10 rounded-[40px] shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/10 text-green-500 rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp size={32} />
                </div>
                <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2">Bem-vindo(a) às Finanças</h1>
                <p className="text-[var(--text-secondary)] mb-8">Vamos configurar seu fluxo básico. Qual é a sua principal fonte de renda mensal?</p>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await addTransaction.mutateAsync({
                    title: fd.get('title') as string,
                    amount: parseFloat(fd.get('amount') as string),
                    type: 'income',
                    category: 'fixed',
                    date: new Date().toISOString().split('T')[0]
                  });
                  setWizardStep(2);
                }} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Nome da Renda (Ex: Salário, Business Principal)</label>
                    <input name="title" required placeholder="Sua renda principal" className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-4 py-4 text-white font-bold" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Valor Médio (R$)</label>
                    <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-4 py-4 text-white font-black text-xl" />
                  </div>
                  <button type="submit" disabled={addTransaction.isPending} className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-black text-sm uppercase tracking-widest rounded-xl mt-4 flex items-center justify-center gap-2 transition-all">
                    Continuar <ArrowRight size={18}/>
                  </button>
                </form>
              </motion.div>
            )}

            {/* WIZARD STEP 2: FIXED COST */}
            {wizardStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[var(--bg-overlay)] border border-red-500/20 p-10 rounded-[40px] shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-orange-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                  <Shield size={32} />
                </div>
                <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2">Custos de Blindagem</h1>
                <p className="text-[var(--text-secondary)] mb-8">Adicione seu maior custo fixo ou assinatura mensal (você poderá adicionar os outros depois).</p>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await addCost.mutateAsync({
                    title: fd.get('title') as string,
                    amount: parseFloat(fd.get('amount') as string),
                    category: 'basico',
                    billing_cycle: 'monthly'
                  });
                  setWizardStep(3);
                }} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-red-500/70 mb-1 block">Nome do Custo (Ex: Aluguel, Prestação do Carro)</label>
                    <input name="title" required placeholder="Seu maior custo atual" className="w-full bg-[var(--bg-primary)] border border-red-500/20 focus:border-red-500 rounded-xl px-4 py-4 text-white font-bold" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-red-500/70 mb-1 block">Valor Mensal (R$)</label>
                    <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full bg-[var(--bg-primary)] border border-red-500/20 focus:border-red-500 rounded-xl px-4 py-4 text-white font-black text-xl" />
                  </div>
                  
                  <div className="flex gap-3 mt-4">
                    <button type="button" onClick={() => setWizardStep(3)} className="px-6 py-4 bg-transparent border border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold text-sm rounded-xl transition-all hover:bg-white/5">Pular (Adiciono depois)</button>
                    <button type="submit" disabled={addCost.isPending} className="flex-1 py-4 bg-red-500 hover:bg-red-400 text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all">
                      Adicionar <ArrowRight size={18}/>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* WIZARD STEP 3: POTE */}
            {wizardStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[var(--bg-overlay)] border border-blue-500/20 p-10 rounded-[40px] shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                  <Target size={32} />
                </div>
                <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2">Seu Primeiro Pote</h1>
                <p className="text-[var(--text-secondary)] mb-8">Potes organizam seu dinheiro para metas específicas. Crie seu primeiro pote de reserva.</p>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await addPote.mutateAsync({
                    title: fd.get('title') as string,
                    target_amount: 0,
                    saved_amount: 0,
                    allocation_type: 'percentage',
                    allocation_value: parseFloat(fd.get('percentage') as string),
                    emoji: '🎯',
                    color: 'text-blue-500'
                  });
                  setShowWizard(false); // Done
                }} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-blue-500/70 mb-1 block">Objetivo (Ex: Reserva de Emergência, Viagem)</label>
                    <input name="title" required placeholder="Sua meta" className="w-full bg-[var(--bg-primary)] border border-blue-500/20 focus:border-blue-500 rounded-xl px-4 py-4 text-white font-bold" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-blue-500/70 mb-1 block">% da Sobra Destinada ao Pote</label>
                    <input name="percentage" type="number" step="1" max="100" required defaultValue="10" className="w-full bg-[var(--bg-primary)] border border-blue-500/20 focus:border-blue-500 rounded-xl px-4 py-4 text-white font-black text-xl" />
                  </div>
                  <button type="submit" disabled={addPote.isPending} className="w-full py-4 mt-4 bg-blue-500 hover:bg-blue-400 text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all">
                    Finalizar Configuração <Check size={18}/>
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    )
  }

  // --- MAIN DASHBOARD RENDER ---
  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-7xl mx-auto space-y-10 lg:space-y-14 pb-24 md:pb-10 relative min-h-screen">
      
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-black rounded-[24px] flex items-center justify-center border border-zinc-800 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-50" />
            <Wallet className="text-white w-8 h-8 relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <h1 className="text-5xl font-black tracking-tightest text-[var(--text-primary)]">Finanças</h1>
            </div>
            <p className="text-[var(--text-secondary)] font-medium text-lg italic flex items-center gap-2">
              Seu centro de comando financeiro.
            </p>
          </div>
        </div>
        
        {/* Quick Add Buttons */}
        <div className="flex items-center gap-3">
          <button onClick={() => setTransactionModalOpen(true)} className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-overlay)] hover:bg-white/5 border border-[var(--border-subtle)] hover:border-white/10 rounded-xl text-sm font-bold transition-all shadow-sm">
             <Plus size={16} /> Movimentação Rápida
          </button>
        </div>
      </motion.div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none]">
        <button onClick={() => setActiveTab('overview')} className={cn("px-6 py-4 font-black uppercase tracking-widest text-[12px] transition-all relative whitespace-nowrap", activeTab === 'overview' ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}>
          Fluxo De Caixa {activeTab === 'overview' && <motion.div layoutId="wealthTab" className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 rounded-t-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
        </button>
        <button onClick={() => setActiveTab('expenses')} className={cn("px-6 py-4 font-black uppercase tracking-widest text-[12px] transition-all relative whitespace-nowrap", activeTab === 'expenses' ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}>
          Meus Gastos {activeTab === 'expenses' && <motion.div layoutId="wealthTab" className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 rounded-t-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
        </button>
        <button onClick={() => setActiveTab('potes')} className={cn("px-6 py-4 font-black uppercase tracking-widest text-[12px] transition-all relative whitespace-nowrap", activeTab === 'potes' ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}>
          Os Potes {activeTab === 'potes' && <motion.div layoutId="wealthTab" className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 rounded-t-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
        </button>
        <button onClick={() => setActiveTab('roadmap')} className={cn("px-6 py-4 font-black uppercase tracking-widest text-[12px] transition-all relative whitespace-nowrap", activeTab === 'roadmap' ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}>
          Master Plan (IA) {activeTab === 'roadmap' && <motion.div layoutId="wealthTab" className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 rounded-t-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Renda Registrada */}
                <div className="p-8 rounded-[40px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                     <TrendingUp size={120} />
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Renda Consolidada do Período</h3>
                  </div>
                  <div className="text-5xl font-black tracking-tighter text-[var(--text-primary)]">
                    {formatBRL(totalIncome)}
                  </div>
                </div>
                
                {/* Custo / Comprometimento */}
                <div className="p-8 rounded-[40px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 text-red-500 opacity-5 group-hover:opacity-10 transition-opacity">
                     <Shield size={120} />
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-400">Custos & Comprometimento</h3>
                  </div>
                  <div className="text-5xl font-black tracking-tighter text-red-500">
                    {formatBRL(totalFixedCosts + totalExpense)}
                  </div>
                  <div className="mt-4 w-full h-2 bg-red-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${Math.min(safeCashFlow, 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-black uppercase tracking-widest text-red-400/60">
                    {safeCashFlow.toFixed(1)}% Comprometimento do Faturamento
                  </p>
                </div>
              </div>

              {/* LISTAS DETALHADAS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                
                {/* Transações Variáveis */}
                <div>
                   <div className="flex items-center justify-between mb-6">
                     <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                       <Wallet className="text-[var(--text-muted)]" /> Diário de Caixa
                     </h3>
                     <button onClick={() => setTransactionModalOpen(true)} className="text-xs font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-[var(--text-secondary)]">Adicionar Novo</button>
                   </div>
                   
                   {recentTransactions.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl">
                          <p className="text-[var(--text-muted)] font-medium text-sm">Nenhuma movimentação recente registrada.</p>
                      </div>
                   ) : (
                     <div className="space-y-3">
                       {recentTransactions.map(t => (
                         <div key={t.id} className="p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-between group">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-[var(--text-primary)] text-sm">{t.title}</p>
                                {t.nature && (
                                  <span className={cn(
                                    "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded",
                                    t.nature === 'necessidade' ? "bg-blue-500/10 text-blue-400" :
                                    t.nature === 'urgencia' ? "bg-red-500/10 text-red-500" :
                                    "bg-amber-500/10 text-amber-500"
                                  )}>
                                    {t.nature[0]}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1">{t.category || 'Geral'} • {format(parseISO(t.date), 'dd MMM yyyy', { locale: ptBR })}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={cn("font-black tracking-tight", t.type === 'income' ? "text-green-500" : "text-[var(--text-primary)]")}>
                                {t.type === 'income' ? '+ ' : '- '}{formatBRL(t.amount)}
                              </span>
                              <button onClick={() => deleteTransaction.mutate(t.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-500/50 hover:text-red-500 transition-all"><X size={14}/></button>
                            </div>
                         </div>
                       ))}
                     </div>
                   )}
                </div>

                {/* Custos Fixos Blindados */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                       <Shield className="text-[var(--text-muted)]" /> Custos Fixos & Assinaturas
                     </h3>
                     <button onClick={() => setCostModalOpen(true)} className="text-xs font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-[var(--text-secondary)]">Add Custo Fixo</button>
                   </div>

                   {costs.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl">
                          <p className="text-[var(--text-muted)] font-medium text-sm">Nenhum custo fixo ou assinatura cadastrado.</p>
                      </div>
                   ) : (
                     <div className="space-y-3">
                       {costs.map(c => (
                         <div key={c.id} className="p-4 rounded-xl bg-red-400/5 border border-red-500/10 flex items-center justify-between group">
                            <div>
                              <p className="font-bold text-red-400 text-sm">{c.title}</p>
                              <p className="text-[10px] uppercase tracking-widest text-red-500/50 mt-1">{c.category}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-black tracking-tight text-red-400">
                                {formatBRL(c.amount)}<span className="text-xs text-red-500/40 font-medium">/{c.billing_cycle === 'yearly' ? 'ano' : 'mês'}</span>
                              </span>
                              <button onClick={() => deleteCost.mutate(c.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-500/50 hover:text-red-500 transition-all"><X size={14}/></button>
                            </div>
                         </div>
                       ))}
                     </div>
                   )}
                </div>

              </div>

              {/* HISTÓRICO EXPANSÍVEL (FINANCE) */}
              <SharedHistoryBar
                icon={TrendingUp}
                title="Histórico & Extrato Completo"
                subtitle={periodFilter === 'custom' ? 'Período Personalizado' : 'Analise suas transações do período filtrado acima'}
                badgeText={`${filteredHistory.length} Registros`}
                isOpen={isHistoryOpen}
                onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
                filterValue={periodFilter}
                onFilterChange={setPeriodFilter}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
              >
                <div className="pt-2 pb-4 space-y-8 md:pl-4">

                  {/* Visual Summary */}
                  <div className="grid grid-cols-2 gap-6">
                     <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-3xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-500/50 mb-1">Entradas (Período Atual)</p>
                        <p className="text-2xl font-black text-green-500">{formatBRL(historyIncomeTotal)}</p>
                     </div>
                     <div className="p-6 bg-white/5 border border-[var(--border-subtle)] rounded-3xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Saídas (Período Atual)</p>
                        <p className="text-2xl font-black text-[var(--text-primary)]">- {formatBRL(historyExpenseTotal)}</p>
                     </div>
                  </div>

                  {/* History List */}
                  <div className="rounded-[40px]">
                    {filteredHistory.length === 0 ? (
                      <div className="text-center py-10 opacity-50">
                        <History className="mx-auto text-[var(--text-muted)] mb-4" size={40} />
                        <p className="font-bold text-[var(--text-primary)]">Nenhum registro encontrado</p>
                        <p className="text-sm font-medium text-[var(--text-muted)]">Nenhum histórico disponível para este filtro.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                         {filteredHistory.map((t: any, i: number) => {
                           // Group by Date logically
                           const isIncome = t.type === 'income'
                           const fDate = format(parseISO(t.date), "EEEE, dd 'de' MMM", { locale: ptBR })
                           const prevDate = i > 0 ? format(parseISO(filteredHistory[i-1].date), "EEEE, dd 'de' MMM", { locale: ptBR }) : null
                           const showHeader = fDate !== prevDate

                           return (
                             <div key={t.id}>
                               {showHeader && (
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-8 mb-4 border-b border-[var(--border-subtle)] pb-2">{fDate}</h4>
                               )}
                               <div className="group flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "w-10 h-10 rounded-xl flex items-center justify-center",
                                      isIncome ? "bg-green-500/10 text-green-500" : "bg-white/5 text-[var(--text-primary)]"
                                    )}>
                                      {isIncome ? <TrendingUp size={18} /> : <Wallet size={18} />}
                                    </div>
                                    <div>
                                      <p className="font-bold text-[var(--text-primary)] text-sm">{t.title}</p>
                                      <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] opacity-60">
                                        {t.category || 'Geral'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    <span className={cn(
                                      "font-black text-lg",
                                      isIncome ? "text-green-500" : "text-[var(--text-primary)]"
                                    )}>
                                      {isIncome ? '+' : '-'}{formatBRL(t.amount)}
                                    </span>
                                    <button 
                                      onClick={() => deleteTransaction.mutate(t.id)} 
                                      className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                      title="Excluir Transação do Histórico"
                                    >
                                      <Trash2 size={16}/>
                                    </button>
                                  </div>
                               </div>
                             </div>
                           )
                         })}
                      </div>
                    )}
                  </div>
                </div>
              </SharedHistoryBar>

            </div>
          )}

           {/* TAB: GASTOS (DETALHADOS) */}
           {activeTab === 'expenses' && (
             <div className="space-y-10">
                {/* Header de Gastos */}
                <div className="p-10 rounded-[40px] bg-[var(--bg-overlay)] border border-red-500/10 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                     <Wallet size={160} />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-red-500/70 mb-2">Total de Gastos (Filtro Ativo)</h3>
                      <div className="text-6xl font-black tracking-tighter text-[var(--text-primary)]">
                        {formatBRL(filteredHistory.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))}
                      </div>
                      <p className="text-[var(--text-secondary)] mt-1 font-medium italic">Baseado nos filtros de período selecionados abaixo.</p>
                    </div>
                    <div className="flex gap-4">
                       <button onClick={() => setTransactionModalOpen(true)} className="px-6 py-4 bg-white text-black font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl">
                         Lançar Novo Gasto
                       </button>
                    </div>
                  </div>
                </div>

                {/* Filtros Integrados Removidos (Usando filtro global do Dashboard) */}

                {/* Listagem de Despesas */}
                <div className="space-y-4">
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2 px-2">
                    <History size={14} /> Detalhamento de Saídas
                  </h4>
                  
                  {filteredHistory.filter(t => t.type === 'expense').length === 0 ? (
                    <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[40px] text-[var(--text-muted)]">
                       Nenhum gasto encontrado para este período.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                       {filteredHistory.filter(t => t.type === 'expense').map(t => (
                         <div key={t.id} className="group p-6 rounded-[32px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] hover:border-red-500/20 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-6">
                               <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                  <Wallet size={20} />
                               </div>
                               <div>
                                  <div className="flex items-center gap-3">
                                    <p className="font-bold text-[var(--text-primary)] text-lg">{t.title}</p>
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                        t.category === 'investment' ? "bg-indigo-500/10 text-indigo-400" :
                                        t.category === 'extra' ? "bg-amber-500/10 text-amber-500" :
                                        "bg-white/5 text-[var(--text-muted)]"
                                      )}>
                                        {t.category === 'variable' ? 'Variável' : 
                                         t.category === 'extra' ? 'Extra' : 
                                         t.category === 'investment' ? 'Investimento' : 'Outro'}
                                      </span>
                                      {t.nature && (
                                        <span className={cn(
                                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                          t.nature === 'necessidade' ? "bg-blue-500/20 text-blue-400 border border-blue-500/20" :
                                          t.nature === 'urgencia' ? "bg-red-500/20 text-red-500 border border-red-500/20" :
                                          "bg-amber-500/20 text-amber-500 border border-amber-500/20"
                                        )}>
                                          {t.nature}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-[10px] items-center gap-1 font-black uppercase tracking-widest text-[var(--text-muted)] mt-1.5 flex">
                                    {format(parseISO(t.date), 'dd/MM/yyyy')} 
                                    <span className="opacity-20">•</span> 
                                    {format(parseISO(t.date), 'EEEE', { locale: ptBR })}
                                  </p>
                               </div>
                            </div>
                            <div className="flex items-center gap-6">
                               <span className="text-2xl font-black text-[var(--text-primary)]">
                                 - {formatBRL(t.amount)}
                               </span>
                               <button onClick={() => deleteTransaction.mutate(t.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                 <Trash2 size={18} />
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
             </div>
           )}

          {/* TAB: POTES */}
          {activeTab === 'potes' && (
            <div className="space-y-12">
               <div className="text-center space-y-4 max-w-2xl mx-auto">
                 <div className="inline-block px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-black text-[11px] uppercase tracking-widest">
                   Sobra Líquida Atual Estimada
                 </div>
                 <h2 className="text-6xl md:text-7xl font-black tracking-tighter text-[var(--text-primary)]">
                   {formatBRL(periodRemnant > 0 ? periodRemnant : 0)}
                 </h2>
                 <p className="text-[var(--text-secondary)] font-medium text-lg">Distribua inteligentemente sua sobra de caixa criando seus próprios potes e garantindo o fluxo do capital.</p>
               </div>

               <div className="flex justify-end mb-4">
                 <button onClick={() => setPoteModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-[var(--text-primary)] hover:scale-105 active:scale-95 text-[var(--bg-primary)] rounded-xl text-sm font-bold shadow-xl transition-all">
                   <Target size={18} /> Novo Pote de Destinação
                 </button>
               </div>

               {potes.length === 0 ? (
                 <div className="p-20 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-[40px] flex flex-col items-center justify-center gap-4">
                    <Target size={64} className="text-[var(--text-muted)] opacity-50" />
                    <h3 className="text-2xl font-bold text-[var(--text-primary)]">Nenhum Pote Criado.</h3>
                    <p className="text-[var(--text-secondary)]">Crie seu primeiro pote para visualizar o destino da sua sobra de caixa.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {potes.map((pote, i) => {
                     const poteAllocationValue = pote.allocation_type === 'percentage' 
                       ? (periodRemnant > 0 ? periodRemnant : 0) * (pote.allocation_value / 100)
                       : pote.allocation_value

                     return (
                        <motion.div 
                          key={pote.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-8 rounded-[40px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] relative overflow-hidden group"
                        >
                          {/* Background Glow */}
                          <div className={cn("absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity duration-500", "from-red-500/50 to-orange-500/50")} />
                          
                          <div className="relative z-10 flex flex-col h-full justify-between gap-10">
                            <div className="flex justify-between items-start">
                              <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5 bg-white/5 text-3xl shrink-0">
                                {pote.emoji || '🎯'}
                              </div>
                              <div className="flex flex-col items-end">
                                <button onClick={() => deletePote.mutate(pote.id)} className="mb-2 p-1 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"><X size={16}/></button>
                                <span className="text-3xl font-black tracking-tighter text-[var(--text-primary)]">
                                  {pote.allocation_type === 'percentage' ? `${pote.allocation_value}%` : formatBRL(pote.allocation_value)}
                                </span>
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                  {pote.allocation_type === 'percentage' ? 'Fatia da Sobra' : 'Aporte Fixo'}
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{pote.title}</h3>
                              <div className="flex items-center justify-between mt-6">
                                <span className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)]">Depósito Projetado</span>
                                <span className="text-2xl font-black text-[var(--text-primary)]">{formatBRL(poteAllocationValue)}</span>
                              </div>
                              {/* Barra de Progresso Real (Saldo Salvo no Pote vs Meta) */}
                              {pote.target_amount > 0 && (
                                <div className="mt-4">
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                                    <span>Saldo Atual ({formatBRL(pote.saved_amount)})</span>
                                    <span>{formatBRL(pote.target_amount)}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.min((pote.saved_amount / pote.target_amount) * 100, 100)}%` }}
                                      transition={{ duration: 1, delay: 0.5 }}
                                      className="h-full bg-gradient-to-r from-red-500 to-orange-500" 
                                    />
                                  </div>
                                </div>
                              )}
                              
                              <button onClick={() => { setAportePoteId(pote.id); setIsAporteModalOpen(true); }} className="w-full mt-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                                <Plus size={16} /> Aportar Valor
                              </button>
                            </div>
                          </div>
                        </motion.div>
                     )
                   })}
                 </div>
               )}
            </div>
          )}

          {/* TAB: ROADMAP & AI */}
          {activeTab === 'roadmap' && (
            <div className="max-w-4xl mx-auto">
              
              {!roadmap?.plan_json ? (
                 <div className="text-center p-14 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-[40px] shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-50 transition-opacity duration-1000 group-hover:opacity-100" />
                    
                    <div className="relative z-10 flex flex-col items-center">
                       <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-700">
                          <Zap size={40} className="drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                       </div>
                       <h3 className="text-3xl font-black text-[var(--text-primary)] mb-4 tracking-tight">IA Indisponível (Sem Dados)</h3>
                       <p className="text-[var(--text-secondary)] max-w-lg mb-10 text-lg leading-relaxed">
                          Nossa Inteligência Artificial gera um mapa e roteiro de progressão assim que você tem fluxo de caixa rolando no sistema. 
                       </p>
                       
                       <button
                         onClick={handleGenerateAIPlan}
                         disabled={isGeneratingAI || (transactions.length === 0 && costs.length === 0)}
                         className="flex items-center gap-3 px-8 py-4 bg-white text-black font-black text-sm uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                       >
                         {isGeneratingAI ? 'Analisando Fluxo de Caixa...' : 'Gerar Meu Plano Inteligente Agora'}
                         {!isGeneratingAI && <Zap size={16} />}
                       </button>
                    </div>
                 </div>
              ) : (
                <>
                  <div className="flex justify-end mb-8">
                     <button
                       onClick={handleGenerateAIPlan}
                       disabled={isGeneratingAI}
                       className="flex items-center gap-2 px-4 py-2 bg-white/5 text-[var(--text-primary)] border border-white/10 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50"
                     >
                       {isGeneratingAI ? 'Recalculando Rota...' : 'Atualizar Plano com IA'}
                       <Zap size={14} />
                     </button>
                  </div>

                  <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--text-primary)] before:via-[var(--border-subtle)] before:to-transparent">
                  
                  {JSON.parse(roadmap.plan_json).map((road: any, i: number) => (
                     <div key={i} className={cn("relative flex items-center justify-between md:justify-normal group", i % 2 !== 0 ? "md:flex-row-reverse" : "")}>
                       {/* Marker */}
                       <div className={cn(
                         "flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 shadow-xl z-10 transition-colors",
                         i % 2 !== 0 ? "md:translate-x-1/2" : "md:-translate-x-1/2",
                         road.active ? "bg-white border-[var(--bg-primary)] shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "bg-[var(--bg-overlay)] border-[var(--border-subtle)]"
                       )}>
                         {road.active ? <Play size={14} className="text-black ml-0.5" /> : <ChevronRight size={16} className="text-[var(--text-muted)]" />}
                       </div>
                       
                       {/* Card */}
                       <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-[32px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] hover:border-white/15 transition-colors">
                         <div className="flex items-center gap-2 mb-2">
                           <span className={cn(
                             "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                             road.active 
                               ? "text-white bg-white/10 border border-white/15"
                               : "text-[var(--text-muted)] bg-[var(--bg-overlay)]"
                           )}>
                             {road.period}
                           </span>
                         </div>
                         <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{road.phase}</h3>
                         
                         <div className="space-y-3">
                           {road.items.map((item: any, j: number) => (
                             <div key={j} className="flex items-start gap-3 group/item">
                                <button className={cn(
                                  "w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors",
                                  item.done ? "bg-green-500 border-green-500" : "bg-white/5 border-white/10 hover:border-white/30"
                                )}>
                                  {item.done && <CheckCircle2 size={12} className="text-white" />}
                                </button>
                                <span className={cn(
                                  "text-sm font-medium",
                                  item.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-secondary)]"
                                )}>
                                  {item.text}
                                </span>
                             </div>
                           ))}
                         </div>
                       </div>
                     </div>
                  ))}

                </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* --- MODALS --- */}
      
      {/* 1. Modal Transação (Renda/Gasto) */}
      <AnimatePresence>
        {isTransactionModalOpen && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => {
                  setTransactionModalOpen(false)
                  setIsInstallment(false)
                }} 
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white"
              >
                <X size={20}/>
              </button>
              
              <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6">Nova Movimentação</h2>
              
              <form onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const baseDateStr = (fd.get('date') as string) || new Date().toISOString().split('T')[0]
                const installments = isInstallment ? parseInt(fd.get('installments') as string) : 1
                const amount = parseFloat(fd.get('amount') as string)
                
                const title = fd.get('title') as string
                const type = fd.get('type') as any
                const category = fd.get('category') as any

                if (isInstallment && installments > 1) {
                  const installmentAmount = amount / installments
                  const baseDate = parseISO(baseDateStr)
                  
                  for (let i = 0; i < installments; i++) {
                    const currentDate = addMonths(baseDate, i)
                    await addTransaction.mutateAsync({
                      title: `${title} (${i + 1}/${installments})`,
                      amount: installmentAmount,
                      type,
                      category,
                      nature: selectedNature || undefined,
                      date: format(currentDate, 'yyyy-MM-dd')
                    })
                  }
                } else {
                  await addTransaction.mutateAsync({
                    title,
                    amount,
                    type,
                    category,
                    nature: selectedNature || undefined,
                    date: baseDateStr
                  })
                }
                
                setTransactionModalOpen(false)
                setIsInstallment(false)
                setSelectedNature(null)
              }} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Descrição</label>
                  <input name="title" required placeholder="Ex: Renda Extra ou Custo Específico..." className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Valor {isInstallment ? 'Total' : '(R$)'}</label>
                    <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Data Base</label>
                    <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Movimento</label>
                    <select name="type" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                      <option value="expense">Saída (Gasto)</option>
                      <option value="income">Entrada (Renda)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Classificação</label>
                    <select name="category" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                      <option value="variable">Gasto Variável / Renda Fixa</option>
                      <option value="extra">Extra</option>
                      <option value="investment">Investimento Rápido</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                   <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] block">Natureza da Saída (Opcional)</label>
                   <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'necessidade', label: 'Necessidade', color: 'blue' },
                        { id: 'urgencia', label: 'Urgência', color: 'red' },
                        { id: 'desejo', label: 'Desejo', color: 'amber' }
                      ].map(nat => (
                        <button 
                          key={nat.id}
                          type="button"
                          onClick={() => setSelectedNature(selectedNature === nat.id ? null : nat.id as any)}
                          className={cn(
                            "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                            selectedNature === nat.id 
                              ? `bg-${nat.color}-500/20 border-${nat.color}-500 text-${nat.color}-500 shadow-[0_0_15px_rgba(${nat.color === 'blue' ? '59,130,246' : nat.color === 'red' ? '239,68,68' : '245,158,11'},0.3)]`
                              : "bg-white/5 border-white/5 text-[var(--text-muted)] hover:bg-white/10"
                          )}
                        >
                          {nat.label}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="flex flex-col gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl">
                   <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isInstallment}
                        onChange={(e) => setIsInstallment(e.target.checked)}
                        className="w-5 h-5 accent-red-500 rounded-md" 
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-[var(--text-primary)]">Parcelar este lançamento</span>
                        <p className="text-[9px] uppercase font-black tracking-widest text-[var(--text-muted)]">O valor total será dividido pelos meses</p>
                      </div>
                   </label>

                   {isInstallment && (
                     <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-4 border-t border-white/10 mt-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Número de Parcelas</label>
                        <input name="installments" type="number" min="2" max="60" defaultValue="2" className="w-full bg-[var(--bg-primary)] border border-red-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                     </motion.div>
                   )}
                </div>

                <button type="submit" disabled={addTransaction.isPending} className="w-full py-4 mt-2 bg-white hover:bg-white/90 text-black font-black rounded-xl transition-all shadow-xl">Confirmar Lançamento</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. Modal Custo Fixo / Assinatura */}
        {isCostModalOpen && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-[var(--bg-primary)] border border-red-500/20 rounded-3xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative">
              <button onClick={() => setCostModalOpen(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white"><X size={20}/></button>
              <h2 className="text-2xl font-black text-red-500 mb-6 flex items-center gap-2"><Shield size={24}/> Cadastrar Custo Fixo</h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                
                const title = fd.get('title') as string
                const amount = parseFloat(fd.get('amount') as string)
                const category = fd.get('category') as string
                const billing_cycle = fd.get('billing_cycle') as any
                const due_day = parseInt(fd.get('due_day') as string) || 1
                const auto_appointment = fd.get('auto_appointment') === 'on'

                // 1. Add Recurring Cost
                await addCost.mutateAsync({
                  title,
                  amount,
                  category,
                  billing_cycle,
                  due_day,
                  auto_appointment
                })

                // 2. Add Agenda Commitment if checked
                if (auto_appointment) {
                  let freq: any = 'monthly'
                  let interval = 1
                  
                  if (billing_cycle === 'weekly') { freq = 'weekly'; interval = 1; }
                  if (billing_cycle === 'biweekly') { freq = 'weekly'; interval = 2; }
                  if (billing_cycle === 'yearly') { freq = 'yearly'; interval = 1; }
                  
                  // Construct base date (current month/year + due_day)
                  const now = new Date()
                  const eventDate = format(new Date(now.getFullYear(), now.getMonth(), due_day), 'yyyy-MM-dd')

                  await addEvent.mutateAsync({
                    title: `Pagar: ${title}`,
                    type: 'task',
                    date: eventDate,
                    status: 'todo',
                    emoji: '💸',
                    recurrence: { frequency: freq, interval }
                  })
                }

                setCostModalOpen(false)
              }} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Nome do Custo</label>
                  <input name="title" required placeholder="Ex: Streaming, Aluguel, Provedor..." className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Valor (R$)</label>
                    <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Cobrança</label>
                    <select name="billing_cycle" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                      <option value="monthly">Mensal</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="weekly">Semanal</option>
                      <option value="yearly">Anual</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Dia de Vencimento</label>
                    <input name="due_day" type="number" min="1" max="31" defaultValue="10" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Grupo de Custos</label>
                    <select name="category" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                      <option value="assinatura">Software / Assinatura</option>
                      <option value="moradia">Moradia e Aluguel</option>
                      <option value="alimentacao">Alimentação / Mercado</option>
                      <option value="transporte">Transporte / Carro</option>
                      <option value="saude">Saúde / Farmácia</option>
                      <option value="educacao">Educação / Cursos</option>
                      <option value="lazer">Lazer / Estilo de Vida</option>
                      <option value="imposto">Impostos / Taxas</option>
                      <option value="pessoal">Gastos Pessoais</option>
                      <option value="divida">Dívida / Empréstimo</option>
                      <option value="seguro">Seguros / Proteção</option>
                      <option value="outro">Outros Custos</option>
                    </select>
                  </div>
                </div>
                
                <label className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl cursor-pointer hover:bg-red-500/10 transition-colors">
                  <input type="checkbox" name="auto_appointment" className="w-5 h-5 accent-red-500 rounded-md" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--text-primary)]">Criar compromisso na Agenda</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Cria lembrete recorrente automaticamente</span>
                  </div>
                </label>

                <button type="submit" disabled={addCost.isPending} className="w-full py-4 mt-2 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl transition-all shadow-xl">Implantar Custo Fixo</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. Modal Potes */}
        {/* 3. Modal Potes */}
        {isPoteModalOpen && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-[var(--bg-primary)] border border-red-500/20 rounded-3xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative">
              <button onClick={() => setPoteModalOpen(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white"><X size={20}/></button>
              <h2 className="text-2xl font-black text-red-500 mb-6 flex items-center gap-2"><Target size={24}/> Criar Novo Pote</h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                await addPote.mutateAsync({
                  title: fd.get('title') as string,
                  target_amount: parseFloat(fd.get('target_amount') as string) || 0,
                  saved_amount: 0,
                  allocation_type: fd.get('allocation_type') as any,
                  allocation_value: parseFloat(fd.get('allocation_value') as string),
                  color: 'text-red-500',
                  emoji: (fd.get('emoji') as string) || '🎯',
                })
                setPoteModalOpen(false)
              }} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Objetivo do Pote (Emoji & Nome)</label>
                  <div className="flex gap-2">
                    <input name="emoji" maxLength={2} placeholder="🎯" defaultValue="🎯" className="w-16 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-2 py-3 text-center text-xl text-white focus:outline-none focus:border-red-500" />
                    <input name="title" required placeholder="Ex: Viagem, Fundo de Oportunidades..." className="flex-1 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Custo Total / Meta (Opcional)</label>
                  <input name="target_amount" type="number" step="0.01" placeholder="Ex: 5000.00" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Tipo de Depósito</label>
                    <select name="allocation_type" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                      <option value="percentage">% da Sobra do Mês</option>
                      <option value="fixed_value">Valor Fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Fatia / Valor</label>
                    <input name="allocation_value" type="number" step="0.01" required placeholder="Ex: 25" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                  </div>
                </div>
                <button type="submit" disabled={addPote.isPending} className="w-full py-4 mt-2 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl transition-all shadow-xl">Gênesis do Pote</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 4. Modal Aporte Pote (Adding manual funds + creating transaction) */}
        {isAporteModalOpen && aportePoteId && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-[var(--bg-primary)] border border-red-500/20 rounded-3xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative">
              <button onClick={() => {setIsAporteModalOpen(false); setAportePoteId(null)}} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white"><X size={20}/></button>
              <h2 className="text-2xl font-black text-red-500 mb-6 flex items-center gap-2"><Plus size={24}/> Fazer Aporte</h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const value = parseFloat(fd.get('amount') as string)
                if (value <= 0) return;

                const targetPote = potes.find(p => p.id === aportePoteId)
                if (!targetPote) return;

                await updatePote.mutateAsync({
                  id: aportePoteId,
                  saved_amount: (targetPote.saved_amount || 0) + value
                })

                await addTransaction.mutateAsync({
                  title: `Aporte: Pote ${targetPote.title}`,
                  amount: value,
                  type: 'expense',
                  category: 'investment',
                  date: new Date().toISOString()
                })

                setIsAporteModalOpen(false)
                setAportePoteId(null)
              }} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Valor do Aporte (R$)</label>
                  <input name="amount" type="number" step="0.01" required placeholder="Ex: 100.00" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                </div>
                <div className="flex items-start gap-2 p-3 bg-white/5 border border-white/5 rounded-xl text-xs text-[var(--text-secondary)]">
                  <span className="text-red-400 mt-0.5"><Target size={14}/></span>
                  <p>Um lançamento de despesa será criado automaticamente no fluxo geral como Investimento.</p>
                </div>
                <button type="submit" disabled={updatePote.isPending || addTransaction.isPending} className="w-full py-4 mt-2 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl transition-all shadow-xl">Aportar e Deduzir</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
