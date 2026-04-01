'use client'

import { motion } from 'framer-motion'
import { Check, Crown, CreditCard, Sparkles, LogOut, ArrowRight } from 'lucide-react'
import { auth } from '@/lib/firebase/config'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'

const PLANS = [
  { id: 'monthly', title: 'Mensal', price: '29', period: '/mês', icon: CreditCard },
  { id: 'quarterly', title: 'Trimestral', price: '79', period: '/trim', icon: Sparkles, badge: 'Popular' },
  { id: 'semiannual', title: 'Semestral', price: '149', period: '/sem', icon: Crown },
  { id: 'annual', title: 'Anual', price: '269', period: '/ano', icon: Sparkles, badge: 'Melhor Valor' },
]

export function SubscriptionWall() {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black p-6 overflow-y-auto">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.03] blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative w-full max-w-5xl space-y-16 py-12">
        {/* Header */}
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-black uppercase tracking-widest mb-4"
          >
            <Crown size={14} className="text-amber-500" />
            Vencimento de Experiência
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tightest leading-[0.9] text-white"
          >
            A jornada continua <br />
            <span className="text-white/20">nos planos PRO.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/50 text-[17px] font-medium leading-relaxed"
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
              className="group relative bg-[#111] border border-white/5 rounded-[32px] p-8 space-y-8 hover:border-white/20 hover:bg-[#161616] transition-all duration-500 cursor-pointer overflow-hidden shadow-2xl"
            >
              {plan.badge && (
                <div className="absolute top-6 right-6 px-3 py-1 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full">
                  {plan.badge}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                  <plan.icon size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white/40 group-hover:text-white transition-colors">{plan.title}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-[14px] font-black text-white/30 tracking-tightest">R$</span>
                    <span className="text-4xl font-black tracking-tightest text-white leading-none">{plan.price}</span>
                    <span className="text-[14px] font-bold text-white/20">{plan.period}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                {[
                  'Dashboard Completo',
                  'Foco em Hábitos',
                  'Agenda Estratégica',
                  'Analytics em Tempo Real'
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-[13px] font-medium text-white/30">
                    <Check size={14} className="text-white/20" />
                    {feature}
                  </div>
                ))}
              </div>

              <button className="w-full flex items-center justify-center gap-2 h-14 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all group-hover:shadow-[0_10px_30px_rgba(255,255,255,0.05)]">
                Assinar Plano
                <ArrowRight size={14} />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Footer info & Logout */}
        <div className="flex flex-col items-center gap-10 pt-10">
          <div className="max-w-md mx-auto text-center space-y-4">
            <p className="text-[13px] font-medium text-white/20 italic">
              "Para desbloqueio manual após transferência (PIX), entre em contato com o suporte enviando seu CPF e o comprovante."
            </p>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/40 hover:text-red-500 transition-colors font-bold text-sm bg-white/5 px-6 py-3 rounded-full hover:bg-red-500/10 hover:border-red-500/20 border border-white/5"
          >
            <LogOut size={16} />
            Sair da minha conta
          </button>
        </div>
      </div>
    </div>
  )
}
