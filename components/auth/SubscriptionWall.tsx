'use client'

import { motion } from 'framer-motion'
import { Check, Crown, CreditCard, Sparkles, LogOut, ArrowRight, Zap, Gem } from 'lucide-react'
import { auth } from '@/lib/firebase/config'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'

const PLANS = [
  { 
    id: 'monthly', 
    title: 'Mensal', 
    price: '29', 
    period: '/mês', 
    icon: CreditCard,
    features: ['Dashboard Completo', 'Foco em Hábitos', 'Agenda Estratégica', 'Suporte Básico']
  },
  { 
    id: 'quarterly', 
    title: 'Trimestral', 
    price: '79', 
    period: '/trim', 
    icon: Zap,
    features: ['Dashboard Completo', 'Foco em Hábitos', 'Agenda Estratégica', 'Prioridade no Suporte']
  },
  { 
    id: 'semiannual', 
    title: 'Semestral', 
    price: '149', 
    period: '/sem', 
    icon: Crown, 
    badge: 'Popular',
    features: ['Dashboard Completo', 'Foco em Hábitos', 'Agenda Estratégica', 'Comunidade Focus PRO']
  },
  { 
    id: 'annual', 
    title: 'Anual', 
    price: '269', 
    period: '/ano', 
    icon: Gem, 
    badge: 'Melhor Valor',
    features: ['Dashboard Completo', 'Foco em Hábitos', 'Agenda Estratégica', 'Comunidade Focus PRO', 'Novidades Antecipadas']
  },
]

export function SubscriptionWall() {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black p-6 overflow-y-auto custom-scrollbar">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-500/[0.03] blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative w-full max-w-6xl space-y-16 py-12">
        {/* Header */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest mb-4"
          >
            <Crown size={12} className="text-red-500" />
            Vencimento de Experiência
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tightest leading-[0.85] text-white"
          >
            A jornada continua <br />
            <span className="text-white/20">nos planos PRO.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 text-[18px] font-medium leading-relaxed max-w-2xl mx-auto"
          >
            Seus 30 dias de trial chegaram ao fim. Escolha o plano que melhor se adapta ao seu estilo de vida e não perca o progresso conquistado.
          </motion.p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.3 }}
              className={`group relative bg-[#111] border rounded-[40px] p-8 space-y-10 transition-all duration-500 cursor-pointer overflow-hidden shadow-2xl ${
                plan.badge === 'Popular' 
                  ? 'border-red-500/30 ring-1 ring-red-500/20 bg-[#141414]' 
                  : 'border-white/5 hover:border-white/20 hover:bg-[#161616]'
              }`}
            >
              {plan.badge && (
                <div className={`absolute top-8 right-8 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg ${
                  plan.badge === 'Popular' ? 'bg-red-500 text-white' : 'bg-white text-black'
                }`}>
                  {plan.badge}
                </div>
              )}
              
              <div className="space-y-6">
                <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center border transition-all duration-500 group-hover:scale-110 ${
                  plan.badge === 'Popular' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-white/5 border-white/10 text-white'
                }`}>
                  <plan.icon size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white/40 group-hover:text-white transition-colors tracking-tight">{plan.title}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-lg font-black text-white/20 tracking-tightest">R$</span>
                    <span className="text-5xl font-black tracking-tightest text-white leading-none">{plan.price}</span>
                    <span className="text-[14px] font-bold text-white/20">{plan.period}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-[13px] font-bold text-white/30 group-hover:text-white/60 transition-colors">
                    <div className={`mt-1 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                      plan.badge === 'Popular' ? 'bg-red-500/10 text-red-500' : 'bg-white/10 text-white/40'
                    }`}>
                      <Check size={10} strokeWidth={4} />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>

              <button className={`w-full flex items-center justify-center gap-2 h-16 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all ${
                plan.badge === 'Popular' 
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.2)]' 
                : 'bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black group-hover:border-transparent'
              }`}>
                Assinar Agora
                <ArrowRight size={14} strokeWidth={3} />
              </button>

              {/* Shine effect for Popular */}
              {plan.badge === 'Popular' && (
                <div className="absolute -inset-[100%] pointer-events-none bg-[conic-gradient(from_0deg,transparent_0%,rgba(239,68,68,0.05)_50%,transparent_100%)] animate-spin-slow" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Footer info & Logout */}
        <div className="flex flex-col items-center gap-12 pt-16">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <p className="text-[14px] font-bold text-white/20 italic leading-relaxed">
              &quot;Para desbloqueio manual imediato via transferência (PIX), entre em contato com nossa equipe de suporte enviando seu CPF e o comprovante.&quot;
            </p>
          </div>

          <div className="flex items-center gap-6">
             <button 
                onClick={handleLogout}
                className="flex items-center gap-3 text-white/40 hover:text-red-500 transition-all font-black text-[11px] uppercase tracking-widest bg-white/[0.03] px-8 py-4 rounded-full border border-white/5 hover:border-red-500/20 active:scale-95"
              >
                <LogOut size={16} />
                Sair da minha conta
              </button>
          </div>
        </div>
      </div>
    </div>
  )
}
