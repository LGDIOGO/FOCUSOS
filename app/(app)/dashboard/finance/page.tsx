'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wallet, TrendingUp, Target, Shield, BookOpen, Plane, Crown, Play, CheckCircle2, ChevronRight, Plus, Rocket, X, Zap, ArrowRight, Check
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { 
  useFinanceTransactions, useFinanceRecurringCosts, useFinancePotes, useFinanceRoadmap,
  useAddFinanceTransaction, useAddFinanceRecurringCost, useAddFinancePote, useUpdateFinanceRoadmap,
  useDeleteFinanceTransaction, useDeleteFinanceRecurringCost, useDeleteFinancePote
} from '@/lib/hooks/useFinance'

// Mock icons mapped to string IDs for DB storage
const POTE_ICONS: Record<string, any> = { crown: Crown, plane: Plane, wallet: Wallet, target: Target, book: BookOpen, rocket: Rocket }
const ICON_KEYS = Object.keys(POTE_ICONS)

const GRADIENT_THEMES = [
  'from-amber-400 to-orange-600',
  'from-emerald-400 to-green-600',
  'from-blue-400 to-indigo-600',
  'from-rose-400 to-pink-600',
  'from-purple-400 to-violet-600'
]

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'potes' | 'roadmap'>('overview')

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

  // MODAL STATES
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false)
  const [isCostModalOpen, setCostModalOpen] = useState(false)
  const [isPoteModalOpen, setPoteModalOpen] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

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

  // DERIVED DATA
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
  const totalFixedCosts = costs.reduce((acc, c) => acc + c.amount, 0)
  
  // Comprometimento do Mês
  const safeCashFlow = totalIncome > 0 ? (totalFixedCosts + totalExpense) / totalIncome * 100 : 0
  const monthlyRemnant = totalIncome - (totalFixedCosts + totalExpense)

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
          potes: potes.map(p => ({ title: p.title, percent: p.percentage_goal }))
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
                    percentage_goal: parseFloat(fd.get('percentage') as string),
                    current_amount: 0,
                    color_theme: 'from-blue-400 to-indigo-600',
                    icon_name: 'target'
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
                   
                   {transactions.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl">
                          <p className="text-[var(--text-muted)] font-medium text-sm">Nenhuma transação do dia-a-dia registrada hoje.</p>
                      </div>
                   ) : (
                     <div className="space-y-3">
                       {transactions.map(t => (
                         <div key={t.id} className="p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-between group">
                            <div>
                              <p className="font-bold text-[var(--text-primary)] text-sm">{t.title}</p>
                              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1">{t.category || 'Geral'} • {t.date}</p>
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
                   {formatBRL(monthlyRemnant > 0 ? monthlyRemnant : 0)}
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
                     const IconComponent = POTE_ICONS[pote.icon_name] || Wallet
                     const poteAllocationValue = (monthlyRemnant > 0 ? monthlyRemnant : 0) * (pote.percentage_goal / 100)

                     return (
                       <motion.div 
                         key={pote.id}
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ delay: i * 0.1 }}
                         className="p-8 rounded-[40px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] relative overflow-hidden group"
                       >
                         {/* Background Glow */}
                         <div className={cn("absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-500", pote.color_theme)} />
                         
                         <div className="relative z-10 flex flex-col h-full justify-between gap-10">
                           <div className="flex justify-between items-start">
                             <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5 bg-white/5 text-white/80 shrink-0">
                               <IconComponent size={26} />
                             </div>
                             <div className="flex flex-col items-end">
                               <button onClick={() => deletePote.mutate(pote.id)} className="mb-2 p-1 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"><X size={16}/></button>
                               <span className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60" style={ { backgroundImage: `linear-gradient(to right, white, rgba(255,255,255,0.6))` } }>{pote.percentage_goal}%</span>
                               <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Fatia da Sobra</div>
                             </div>
                           </div>
                           
                           <div>
                             <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{pote.title}</h3>
                             <div className="flex items-center justify-between mt-6">
                               <span className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)]">Depósito Projetado</span>
                               <span className="text-2xl font-black text-[var(--text-primary)]">{formatBRL(poteAllocationValue)}</span>
                             </div>
                             <div className="mt-3 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${pote.percentage_goal}%` }}
                                 transition={{ duration: 1, delay: 0.5 }}
                                 className={cn("h-full bg-gradient-to-r", pote.color_theme)} 
                               />
                             </div>
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
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-50 transition-opacity duration-1000 group-hover:opacity-100" />
                    
                    <div className="relative z-10 flex flex-col items-center">
                       <div className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform duration-700">
                          <Zap size={40} className="drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
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
                       className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-500/20 transition-all disabled:opacity-50"
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
                         road.active ? "bg-indigo-500 border-[var(--bg-primary)]" : "bg-[var(--bg-overlay)] border-[var(--border-subtle)]"
                       )}>
                         {road.active ? <Play size={14} className="text-white ml-0.5" /> : <ChevronRight size={16} className="text-[var(--text-muted)]" />}
                       </div>
                       
                       {/* Card */}
                       <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-[32px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] hover:border-indigo-500/30 transition-colors">
                         <div className="flex items-center gap-2 mb-2">
                           <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 px-2 py-1 bg-indigo-500/10 rounded-md">
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-2xl relative">
              <button onClick={() => setTransactionModalOpen(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white"><X size={20}/></button>
              <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6">Nova Movimentação</h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                await addTransaction.mutateAsync({
                  title: fd.get('title') as string,
                  amount: parseFloat(fd.get('amount') as string),
                  type: fd.get('type') as any,
                  category: fd.get('category') as any,
                  date: new Date().toISOString().split('T')[0]
                })
                setTransactionModalOpen(false)
              }} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Descrição do Movimento</label>
                  <input name="title" required placeholder="Ex: Renda Extra ou Monster na Padaria..." className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Valor (R$)</label>
                  <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
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
                <button type="submit" disabled={addTransaction.isPending} className="w-full py-4 mt-2 bg-white hover:bg-white/90 text-black font-black rounded-xl transition-all shadow-xl">Cadastrar</button>
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
                await addCost.mutateAsync({
                  title: fd.get('title') as string,
                  amount: parseFloat(fd.get('amount') as string),
                  category: fd.get('category') as any,
                  billing_cycle: fd.get('billing_cycle') as any
                })
                setCostModalOpen(false)
              }} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Nome do Custo Mensal</label>
                  <input name="title" required placeholder="Ex: Streaming, Aluguel, Provedor..." className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Valor Cheio (R$)</label>
                    <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Cobrança</label>
                    <select name="billing_cycle" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                      <option value="monthly">Mensal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Grupo de Custos</label>
                  <select name="category" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                    <option value="assinatura">Software / Serviço Fechado</option>
                    <option value="divida">Parcela ou Dívida Ativa</option>
                    <option value="basico">Moradia e Essencial</option>
                    <option value="seguro">Saúde ou Seguros</option>
                    <option value="conhecimento">Custos em Aprendizado</option>
                  </select>
                </div>
                <button type="submit" disabled={addCost.isPending} className="w-full py-4 mt-2 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl transition-all shadow-xl">Implantar Custo Fixo</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. Modal Potes */}
        {isPoteModalOpen && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-[var(--bg-primary)] border border-blue-500/20 rounded-3xl p-6 shadow-[0_0_50px_rgba(59,130,246,0.1)] relative">
              <button onClick={() => setPoteModalOpen(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white"><X size={20}/></button>
              <h2 className="text-2xl font-black text-blue-400 mb-6 flex items-center gap-2"><Target size={24}/> Criar Novo Pote</h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                await addPote.mutateAsync({
                  title: fd.get('title') as string,
                  percentage_goal: parseFloat(fd.get('percentage') as string),
                  current_amount: 0,
                  color_theme: fd.get('theme') as string,
                  icon_name: fd.get('icon') as string
                })
                setPoteModalOpen(false)
              }} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Objetivo do Pote</label>
                  <input name="title" required placeholder="Ex: Viagem, Fundo de Oportunidades..." className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Fatía (%) Destinada do Fluxo Sobrante</label>
                  <input name="percentage" type="number" step="0.1" max="100" required placeholder="Ex: 25" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Estilo da Aura</label>
                    <select name="theme" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500">
                      {GRADIENT_THEMES.map((th, i) => (
                        <option key={i} value={th}>Aura {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Ícone Visual</label>
                    <select name="icon" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500">
                      {ICON_KEYS.map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={addPote.isPending} className="w-full py-4 mt-2 bg-blue-500 hover:bg-blue-400 text-white font-black rounded-xl transition-all shadow-xl">Gênesis do Pote</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
