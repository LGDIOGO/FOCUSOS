'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wallet, TrendingUp, Target, Shield, BookOpen, Plane, Crown, Play, CheckCircle2, ChevronRight 
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const POTES = [
  {
    id: 'milhao',
    title: 'O Milhão & Aposentadoria',
    icon: Crown,
    percentage: 40,
    amount: 'R$ 748,00',
    color: 'from-amber-400 to-orange-600',
    bg: 'bg-amber-400/10',
    text: 'text-amber-400'
  },
  {
    id: 'empresas',
    title: 'Acelerador de Empresas',
    icon: TrendingUp,
    percentage: 20,
    amount: 'R$ 374,00',
    color: 'from-emerald-400 to-green-600',
    bg: 'bg-emerald-400/10',
    text: 'text-emerald-400'
  },
  {
    id: 'sonhos',
    title: 'MacBook & Internacional',
    icon: Plane,
    percentage: 25,
    amount: 'R$ 467,00',
    color: 'from-blue-400 to-indigo-600',
    bg: 'bg-blue-400/10',
    text: 'text-blue-400'
  },
  {
    id: 'estilo',
    title: 'Estilo de Vida & Presentes',
    icon: Wallet,
    percentage: 15,
    amount: 'R$ 282,00',
    color: 'from-rose-400 to-pink-600',
    bg: 'bg-rose-400/10',
    text: 'text-rose-400'
  }
]

const ROADMAP = [
  {
    phase: 'Fase 1: Cenário de Guerra',
    period: 'Maio a Julho/26',
    items: [
      { text: 'Liquidar Cartão (R$ 1.300)', done: false },
      { text: 'Pára-brisa do Versa', done: false },
      { text: 'Fim do Hotel (Julho)', done: false }
    ],
    active: true
  },
  {
    phase: 'Fase 2: A Virada',
    period: 'Agosto a Dez/26',
    items: [
      { text: 'Projeto DaVinci', done: false },
      { text: 'Pote de Conhecimento (R$ 200/mês)', done: false },
      { text: 'Assinatura Networking', done: false },
      { text: 'iPhone 16 Pro', done: false }
    ],
    active: false
  },
  {
    phase: 'Fase 3: O Ano da Escala',
    period: '2027',
    items: [
      { text: 'Fim da Dívida (Fev)', done: false },
      { text: 'Seguro Versa & Manutenção Ativos', done: false },
      { text: 'Fundo Anuidades', done: false },
      { text: 'Aportes Sólidos (Os 4 Potes)', done: false }
    ],
    active: false
  },
  {
    phase: 'Fase 4: A Disrupção',
    period: '2028',
    items: [
      { text: 'Venda de Conhecimento / Comunidade', done: false },
      { text: 'MacBook Hardware Elite', done: false },
      { text: 'Aceleração Rumão ao Milhão', done: false }
    ],
    active: false
  }
]

const FIXED_COSTS = [
  { label: 'Saúde & Academia', value: 'R$ 380', icon: Target },
  { label: 'Gasolina', value: 'R$ 320', icon: Play },
  { label: 'Inglês', value: 'R$ 330', icon: BookOpen },
  { label: 'Assinaturas Digitais', value: 'R$ 340', icon: Shield },
  { label: 'Contabilidade & MEI', value: 'R$ 239', icon: Wallet },
  { label: 'Seguro Versa', value: 'R$ 150', icon: Shield },
  { label: 'Manutenção Carro', value: 'R$ 150', icon: Play },
  { label: 'Dates', value: 'R$ 150', icon: Target },
]

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'potes' | 'roadmap'>('overview')

  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-7xl mx-auto space-y-10 lg:space-y-14 pb-24 md:pb-10">
      {/* Header Premium */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-black rounded-[24px] flex items-center justify-center border border-zinc-800 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-50" />
            <TrendingUp className="text-white w-8 h-8 relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <h1 className="text-5xl font-black tracking-tightest text-[var(--text-primary)]">WealthOS</h1>
               <div className="flex items-center gap-1 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full px-3 py-1 border border-red-500/20">
                  <span className="text-[12px] font-black uppercase tracking-widest text-red-500">
                    Master Plan 2026-2028
                  </span>
               </div>
            </div>
            <p className="text-[var(--text-secondary)] font-medium text-lg italic flex items-center gap-2">
              Seu centro de comando para o Primeiro Milhão.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none]">
        {[
          { id: 'overview', label: 'Fluxo 2027' },
          { id: 'potes', label: 'Os Potes' },
          { id: 'roadmap', label: 'Roadmap de Ação' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-4 font-black uppercase tracking-widest text-[12px] transition-all relative whitespace-nowrap",
              activeTab === tab.id ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="financeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 rounded-t-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           className="w-full"
        >
          {activeTab === 'overview' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-[40px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                     <TrendingUp size={120} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Projeção de Renda (PJ/Edição/Zion)</h3>
                  <div className="text-5xl font-black tracking-tighter text-[var(--text-primary)]">R$ 4.200<span className="text-2xl text-[var(--text-muted)]">,00</span></div>
                  <p className="mt-4 text-sm font-medium text-[var(--text-secondary)]">Base estimada de fluxo líquido para 2027.</p>
                </div>
                
                <div className="p-8 rounded-[40px] bg-red-500/5 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 text-red-500 opacity-5 group-hover:opacity-10 transition-opacity">
                     <Shield size={120} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-red-400 mb-2">Custos Fixos Blindados</h3>
                  <div className="text-5xl font-black tracking-tighter text-red-500">R$ 2.329<span className="text-2xl opacity-50">,00</span></div>
                  <div className="mt-4 w-full h-2 bg-red-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: '55%' }} />
                  </div>
                  <p className="mt-2 text-xs font-black uppercase tracking-widest text-red-400/60">55.4% de comprometimento</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black tracking-tight mb-6 flex items-center gap-3">
                  <Shield className="text-[var(--text-muted)]" />
                  Detalhamento de Defesa (Custos Fixos)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {FIXED_COSTS.map((cost, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                         <cost.icon size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{cost.label}</div>
                        <div className="text-lg font-bold text-[var(--text-primary)]">{cost.value}</div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Pote Especial */}
                  <div className="sm:col-span-2 md:col-span-4 p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                           <BookOpen size={24} />
                        </div>
                        <div>
                          <div className="text-[12px] font-black uppercase tracking-widest text-blue-400">O Pote do Conhecimento</div>
                          <div className="text-sm font-medium text-blue-300/80">Blindado para comprar livros mensais e guardar para cursos (Marketing, Transição DaVinci). Jamais cortar.</div>
                        </div>
                     </div>
                     <div className="text-2xl font-black text-blue-400 shrink-0">R$ 200,00 <span className="text-sm opacity-50">/mês</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'potes' && (
            <div className="space-y-12">
               <div className="text-center space-y-4 max-w-2xl mx-auto">
                 <div className="inline-block px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-black text-[11px] uppercase tracking-widest">
                   Sobra Limpa & Blindada em 2027
                 </div>
                 <h2 className="text-6xl md:text-7xl font-black tracking-tighter text-[var(--text-primary)]">R$ 1.871</h2>
                 <p className="text-[var(--text-secondary)] font-medium text-lg">Essa é a sua munição pesada para distribuir. Tudo já está pago: seu seguro, sua manutenção, seu inglês e sua dieta.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {POTES.map((pote, i) => (
                   <motion.div 
                     key={pote.id}
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: i * 0.1 }}
                     className="p-8 rounded-[40px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] relative overflow-hidden group"
                   >
                     {/* Background Glow */}
                     <div className={cn("absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-500", pote.color)} />
                     
                     <div className="relative z-10 flex flex-col h-full justify-between gap-10">
                       <div className="flex justify-between items-start">
                         <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5", pote.bg, pote.text)}>
                           <pote.icon size={26} />
                         </div>
                         <div className="text-right">
                           <span className={cn("text-3xl font-black tracking-tighter", pote.text)}>{pote.percentage}%</span>
                           <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Fatia do Pote</div>
                         </div>
                       </div>
                       
                       <div>
                         <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{pote.title}</h3>
                         <div className="flex items-center justify-between mt-6">
                           <span className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)]">Aporte Dinâmico</span>
                           <span className="text-2xl font-black text-[var(--text-primary)]">{pote.amount}</span>
                         </div>
                         <div className="mt-3 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${pote.percentage}%` }}
                             transition={{ duration: 1, delay: 0.5 }}
                             className={cn("h-full bg-gradient-to-r", pote.color)} 
                           />
                         </div>
                       </div>
                     </div>
                   </motion.div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'roadmap' && (
            <div className="max-w-4xl mx-auto">
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--text-primary)] before:via-[var(--border-subtle)] before:to-transparent">
                
                {ROADMAP.map((road, i) => (
                   <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                     {/* Marker */}
                     <div className={cn(
                       "flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl z-10 transition-colors",
                       road.active ? "bg-red-500 border-[var(--bg-primary)]" : "bg-[var(--bg-overlay)] border-[var(--border-subtle)]"
                     )}>
                       {road.active ? <Play size={14} className="text-white ml-0.5" /> : <CheckCircle2 size={16} className="text-[var(--text-muted)]" />}
                     </div>
                     
                     {/* Card */}
                     <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-[32px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] hover:border-red-500/30 transition-colors">
                       <div className="flex items-center gap-2 mb-2">
                         <span className="text-[10px] font-black uppercase tracking-widest text-red-500 px-2 py-1 bg-red-500/10 rounded-md">
                           {road.period}
                         </span>
                       </div>
                       <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{road.phase}</h3>
                       
                       <div className="space-y-3">
                         {road.items.map((item, j) => (
                           <div key={j} className="flex items-start gap-3">
                              <div className={cn(
                                "w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors",
                                item.done ? "bg-green-500 border-green-500" : "bg-white/5 border-white/10"
                              )}>
                                {item.done && <CheckCircle2 size={12} className="text-white" />}
                              </div>
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
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
