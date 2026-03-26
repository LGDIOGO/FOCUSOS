'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Sparkles, Wand2 } from 'lucide-react'
import AIChatOnboarding from './AIChatOnboarding'

export default function SeedData() {
  const [showChat, setShowChat] = useState(false)

  return (
    <>
      <div className="relative group mt-8">
        {/* Glow Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-[32px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative bg-black border border-white/10 rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden">
          {/* Decorative background icon */}
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] scale-150 rotate-12">
            <Sparkles size={120} />
          </div>

          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
              <Database size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black tracking-tightest flex items-center gap-2">
                Dados Iniciais
                <span className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] uppercase tracking-widest text-white/60 border border-white/10">Alpha</span>
              </h3>
              <p className="text-sm md:text-base text-white/40 font-medium mt-1">
                Personalize sua experiência com ajuda do <span className="text-white/80 font-bold">Gemini AI</span>.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowChat(true)}
            className="w-full md:w-auto px-8 py-4 bg-white text-black rounded-2xl hover:bg-neutral-200 transition-all text-base font-black flex items-center justify-center gap-2 active:scale-95 shadow-xl relative z-10"
          >
            <Wand2 size={18} />
            Conversar com Gemini
          </button>
        </div>
      </div>

      <AIChatOnboarding isOpen={showChat} onClose={() => setShowChat(false)} />
    </>
  )
}
