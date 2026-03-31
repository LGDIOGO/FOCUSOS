'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, LayoutDashboard, CheckSquare, Zap, Brain, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
}

const SLIDES = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao FocusOS',
    description: 'Seu novo sistema operacional para o foco absoluto. Um ambiente minimalista para gerenciar hábitos, visão de futuro e compromissos diários.',
    icon: LayoutDashboard,
    imageElement: (
      <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,0,0,0.1),rgba(0,0,0,0))]" />
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] mb-4">
          <div className="w-8 h-8 rounded-md bg-black rotate-45" />
        </div>
        <div className="h-2 w-24 bg-white/20 rounded-full mb-2" />
        <div className="h-2 w-16 bg-white/10 rounded-full" />
      </div>
    )
  },
  {
    id: 'habits',
    title: 'Acompanhe Hábitos & Rascunhos',
    description: 'Transforme atitudes em disciplina. Marque hábitos ou tarefas como concluídas, ou deixe como parcial se não deu 100%.',
    icon: CheckSquare,
    imageElement: (
       <div className="w-full h-full bg-gradient-to-br from-[#0A0A0A] to-[#111] rounded-2xl border border-white/5 flex flex-col items-center justify-center p-6 gap-3">
          <div className="w-full h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between px-4">
             <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded-md bg-white/10" />
               <div className="h-2 w-20 bg-white/40 rounded-full" />
             </div>
             <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-sm" />
             </div>
          </div>
          <div className="w-full h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between px-4">
             <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded-md bg-white/10" />
               <div className="h-2 w-32 bg-white/40 rounded-full" />
             </div>
             <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
                <div className="w-3 h-1.5 bg-amber-500 rounded-sm" />
             </div>
          </div>
       </div>
    )
  },
  {
    id: 'selection',
    title: 'Gerenciamento em Massa',
    description: 'Pressione e segure (ou clique com o botão direito) em qualquer item do seu painel para ativar o Modo Seleção para arranjos rápidos.',
    icon: Zap,
    imageElement: (
      <div className="w-full h-full bg-[#111] rounded-2xl border border-white/5 flex flex-col items-center justify-center relative p-4 gap-2">
         <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-red-500 animate-ping" />
         <div className="w-[80%] h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between px-4 scale-105 shadow-[0_0_30px_rgba(255,0,0,0.15)]">
             <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-white rounded-sm" />
               </div>
               <div className="h-2 w-24 bg-red-500/60 rounded-full" />
             </div>
          </div>
          <div className="w-[80%] h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 px-4">
               <div className="w-6 h-6 rounded-full border-2 border-white/10" />
               <div className="h-2 w-16 bg-white/20 rounded-full" />
          </div>
      </div>
    )
  },
  {
    id: 'ai',
    title: 'Sua IA de Elite',
    description: 'O FocusOS Concierge cruza os dados do seu dia e as suas metas de longo prazo para entregar insights cruéis e dicas analíticas no seu rodapé.',
    icon: Brain,
    imageElement: (
      <div className="w-full h-full bg-[#0A0A0A] rounded-2xl border border-white/5 flex flex-col items-center justify-center p-6">
         <div className="w-full h-full bg-gradient-to-tr from-red-900/10 to-transparent rounded-xl border border-red-500/20 p-4 relative overflow-hidden flex flex-col items-start gap-4">
             <div className="flex items-center gap-2 text-red-400">
               <Brain size={16} />
               <span className="text-[10px] font-bold uppercase tracking-widest">FocusOS Insight</span>
             </div>
             <div className="space-y-2 w-full">
               <div className="h-3 w-3/4 bg-white/80 rounded-sm" />
               <div className="h-2 w-full bg-white/30 rounded-sm" />
               <div className="h-2 w-5/6 bg-white/30 rounded-sm" />
             </div>
         </div>
      </div>
    )
  }
]

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Reset to first slide when opened
  useEffect(() => {
    if (isOpen) setCurrentSlide(0)
  }, [isOpen])

  if (!isOpen) return null

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1)
    }
  }

  const isLast = currentSlide === SLIDES.length - 1
  const slide = SLIDES[currentSlide]
  const Icon = slide.icon

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-xl"
        onClick={() => {}} // Bloqueia o clique fora (onboardng obriga interagir)
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[600px]"
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all z-20"
        >
          <X className="text-white/40" size={16} />
        </button>

        {/* Cima: Visual */}
        <div className="h-1/2 w-full bg-[#111] border-b border-white/5 p-6 relative">
           <AnimatePresence mode="wait">
             <motion.div
               key={slide.id}
               initial={{ opacity: 0, y: 10, scale: 0.98 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: -10, scale: 0.98 }}
               transition={{ duration: 0.3 }}
               className="w-full h-full"
             >
               {slide.imageElement}
             </motion.div>
           </AnimatePresence>
        </div>

        {/* Baixo: Conteúdo */}
        <div className="flex-1 p-8 flex flex-col justify-between">
            <AnimatePresence mode="wait">
               <motion.div
                 key={slide.id}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 transition={{ duration: 0.3 }}
                 className="space-y-4"
               >
                 <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
                    <Icon className="text-white" size={24} />
                 </div>
                 <h2 className="text-2xl font-black text-white tracking-tight">{slide.title}</h2>
                 <p className="text-white/50 font-medium leading-relaxed">{slide.description}</p>
               </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-8">
               <div className="flex items-center gap-2">
                 {SLIDES.map((_, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-300",
                        idx === currentSlide ? "bg-white w-6" : "bg-white/20"
                      )}
                    />
                 ))}
               </div>

               <div className="flex items-center gap-3">
                 {currentSlide > 0 && (
                   <button 
                     onClick={handlePrev}
                     className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                   >
                     <ChevronLeft size={20} />
                   </button>
                 )}
                 <button 
                   onClick={handleNext}
                   className={cn(
                     "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95",
                     isLast ? "bg-white text-black hover:bg-neutral-200" : "bg-white/10 text-white hover:bg-white/20"
                   )}
                 >
                   {isLast ? 'Começar' : 'Próximo'}
                   {!isLast && <ChevronRight size={18} />}
                   {isLast && <ArrowRight size={18} />}
                 </button>
               </div>
            </div>
        </div>
      </motion.div>
    </div>
  )
}
