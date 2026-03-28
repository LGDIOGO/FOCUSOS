'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle2, Zap, Brain, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-md" />
            <span className="font-bold tracking-tight text-lg">FocusOS</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/signup" className="px-4 py-1.5 bg-white text-black text-sm font-bold rounded-full hover:bg-neutral-200 transition-colors">
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-bold tracking-widest uppercase mb-8 text-white/40">
              A Produtividade Reimaginada
            </span>
            <h1 className="text-6xl md:text-8xl font-extrabold tracking-tightest mb-8 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent leading-[0.9]">
              Menos ruído.<br />Mais foco.
            </h1>
            <p className="text-xl md:text-2xl text-white/40 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
              O sistema operacional para sua rotina. Design minimalista, inteligência artificial e alta performance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="w-full sm:w-auto px-10 py-4 bg-white text-black font-extrabold rounded-2xl text-lg hover:scale-105 active:scale-95 transition-all duration-200">
                Começar agora
              </Link>
              <Link href="/login" className="w-full sm:w-auto px-10 py-4 bg-white/5 border border-white/10 text-white font-extrabold rounded-2xl text-lg hover:bg-white/10 transition-all duration-200">
                Fazer login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid (Bento) */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4">
          <motion.div 
            whileHover={{ y: -5 }}
            className="md:col-span-8 h-[400px] bg-white/[0.03] border border-white/10 rounded-[32px] p-10 flex flex-col justify-end overflow-hidden group relative"
          >
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Brain className="w-12 h-12 text-red-400 mb-6" />
            <h3 className="text-3xl font-bold mb-3 tracking-tight">IA Insight Engine</h3>
            <p className="text-white/40 text-lg max-w-md">Analise seus padrões de foco e receba sugestões inteligentes para otimizar seu dia.</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="md:col-span-4 h-[400px] bg-white/[0.03] border border-white/10 rounded-[32px] p-10 flex flex-col justify-end"
          >
            <CheckCircle2 className="w-12 h-12 text-green-400 mb-6" />
            <h3 className="text-3xl font-bold mb-3 tracking-tight">Hábito Zen</h3>
            <p className="text-white/40 text-lg">Ciclagem de status inspirada em planilhas de alta performance.</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="md:col-span-4 h-[400px] bg-white/[0.03] border border-white/10 rounded-[32px] p-10 flex flex-col justify-end"
          >
            <Zap className="w-12 h-12 text-amber-400 mb-6" />
            <h3 className="text-3xl font-bold mb-3 tracking-tight">Agenda Ágil</h3>
            <p className="text-white/40 text-lg">Distribua suas tarefas por prioridade e urgência sem esforço.</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="md:col-span-8 h-[400px] bg-white/[0.03] border border-white/10 rounded-[32px] p-10 flex flex-col justify-end group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Shield className="w-12 h-12 text-[#e02020] mb-6" />
            <h3 className="text-3xl font-bold mb-3 tracking-tight">Privacidade Total</h3>
            <p className="text-white/40 text-lg max-w-md">Seus dados são criptografados e armazenados com segurança máxima via Supabase.</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 opacity-40">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm font-medium">
          <p>© 2024 FocusOS. Inspirado no minimalismo Apple.</p>
        </div>
      </footer>
    </div>
  )
}
