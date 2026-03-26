'use client'

import { motion } from 'framer-motion'
import { Brain, Sparkles } from 'lucide-react'

export default function InsightsPage() {
  return (
    <div className="p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
            <Brain className="text-white/60" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">IA Insight Engine</h1>
            <p className="text-white/40">Análises detalhadas geradas pela inteligência artificial sobre sua produtividade.</p>
          </div>
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex items-start gap-4"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold mb-1">Análise de Padrão #{i}</h4>
                <p className="text-sm text-white/40 leading-relaxed">O algoritmo está coletando dados suficientes para gerar um insight profundo sobre seus hábitos de foco.</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
