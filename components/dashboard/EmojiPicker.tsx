import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils/cn'
import { Smile, X, Heart, Dog, Pizza, Zap, Briefcase, Settings } from 'lucide-react'

const EMOJI_CATEGORIES = [
  { 
    id: 'smileys', 
    label: 'Smileys', 
    icon: Smile, 
    emojis: [
      '🎯', '✨', '🌟', '🔥', '⚡️', '🌈', '❤️', '😊', '😎', '🤩', '🥳', '🤫', '🤔', '💪', '🧠', '🙌', '🙏', '🤝', '👋', '✌️',
      '😂', '🤣', '🥹', '🥰', '😍', '😌', '😋', '😜', '👻', '👽', '🤖', '👾', '👐', '🤲', '💅', '💍', '👑', '💄', '👀', '👅'
    ]
  },
  { 
    id: 'activities', 
    label: 'Atividades', 
    icon: Zap, 
    emojis: [
      '🏃', '🧘', '🏋️', '🚴', '🚶', '⚽️', '🏀', '🎾', '🎮', '🎸', '🎧', '🎬', '🎨', '📸', '📚', '✏️', '💻', '💡', '⏰', '⌛️',
      '🏊', '🚣', '🧗', '🥊', '🥋', '🛹', '🎹', '🎻', '🎤', '🎟', '🎭', '🧶', '🧵', '♟', '🧩', '🚀', '⛵️', '🏹', '💎', '🧪'
    ]
  },
  { 
    id: 'animals', 
    label: 'Natureza', 
    icon: Dog, 
    emojis: [
      '🐶', '🐱', '🐼', '🦁', '🐷', '🐸', '🐨', '🐵', '🐣', '🦋', '🌱', '🌿', '☘️', '🍀', '🌵', '🌴', '🌸', '🌼', '🌞', '🌙',
      '🦊', '🐰', '🐯', '🐮', '🐑', '🐧', '🦆', '🐝', '🐞', '🦗', '🌲', '🌳', '🌊', '🍄', '🌍', '🌋', '⛺️', '🏔', '❄️', '🔥'
    ]
  },
  { 
    id: 'food', 
    label: 'Comida', 
    icon: Pizza, 
    emojis: [
      '🍎', '🥦', '🥕', '🥑', '🍳', '🥞', '🍕', '🍣', '🥙', '🍚', '🍫', '🍿', '☕️', '🍵', '🥤', '🍷', '🍺', '🧉', '🍼',
      '🍓', '🍉', '🍌', '🍍', '🍔', '🍟', '🍜', '🍲', '🥡', '🥧', '🍦', '🍩', '🍪', '🍯', '🥃', '🍹', '🧉', '🧂', '🥢', '🥄'
    ]
  },
  { 
    id: 'objects', 
    label: 'Objetos', 
    icon: Briefcase, 
    emojis: [
      '💼', '💰', '💳', '🛒', '🛍', '🎁', '🎈', '🔑', '🔒', '📞', '📧', '📦', '🏠', '🚗', '✈️', '🏝', '🚿', '🧼', '💊', '🪥',
      '🖥', '🖱', '⌨️', '📱', '⌚️', '📷', '🎥', '🔦', '📕', '🗞', '🏷', '✉️', '📪', '🔨', '🪛', '🪚', '🩹', '🩺', '🪞', '🪑'
    ]
  },
  { 
    id: 'symbols', 
    label: 'Símbolos', 
    icon: Settings, 
    emojis: [
      '📅', '📝', '📌', '📍', '📈', '📉', '📊', '🛠', '⚙️', '⚖️', '⛓', '🧲', '🧪', '🔭', '📡', '📢', '🔔', '💬', '🗯', '💭',
      '✅', '❌', '⚠️', '🚫', '💯', '🆘', '♻️', '🌐', '🏧', '♿️', '🚾', '🚻', '🚹', '🚺', '⚧', '🏳️', '🏴', '🏁', '🚩', '🃏'
    ]
  }
]

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('smileys')

  const EMOJI_KEYWORDS: Record<string, string> = {
    '🎯': 'foco meta objetivo alvo', '✨': 'magica brilho novo especial', '🔥': 'fogo urgente quente', '⚡️': 'energia rapido raio',
    '❤️': 'amor coracao saude', '😊': 'feliz sorriso alegria', '😎': 'legal oculos sol', '🤩': 'estrela impressionado',
    '🏃': 'corrida exercicio esporte', '🧘': 'meditacao yoga calma paz', '🏋️': 'academia treino forca', '🚴': 'bike bicicleta ciclismo',
    '🍏': 'dieta saude fruta maca', '🍎': 'dieta saude fruta maca', '🥦': 'comida vegetal saudavel', '🥑': 'abacate comida saudavel',
    '🍳': 'ovo cafe proteina', '🥞': 'panqueca doce cafe', '🍕': 'pizza besteira comida', '🍣': 'sushi peixe oriental',
    '💊': 'remedio saude suplemento', '🦷': 'dente dentista saude', '📱': 'celular telefone app', '💻': 'trabalho pc computador',
    '💡': 'ideia luz insight', '⏰': 'hora tempo alarme', '⌛️': 'espera tempo ampulheta', '💰': 'dinheiro meta lucro financas',
    '💳': 'cartao pagamento grana', '📈': 'crescer lucro aumento', '📉': 'queda prejuizo diminuir', '📅': 'data agenda dia',
    '📝': 'nota rascunho escrita', '📌': 'fixar importante local', '🏠': 'casa lar familia', '✈️': 'viagem voar ferias',
    '🏝': 'praia ferias descanso', '📖': 'leitura livro estudar', '📚': 'estudo livros conhecimento'
  }

  const filteredEmojis = search 
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(emoji => 
        EMOJI_KEYWORDS[emoji]?.toLowerCase().includes(search.toLowerCase()) || 
        emoji.includes(search)
      )
    : EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.emojis || EMOJI_CATEGORIES[0].emojis

  const currentCategoryLabel = search ? `Resultados para "${search}"` : (EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.label || 'Smileys')

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 md:w-20 md:h-20 bg-white/5 border border-white/10 rounded-[28px] text-3xl flex items-center justify-center hover:bg-white/10 transition-all shadow-xl",
          isOpen && "border-white/30 bg-white/10 ring-4 ring-white/5"
        )}
      >
        {value || <Smile className="text-white/20" size={32} />}
      </button>

      <AnimatePresence>
        {isOpen && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              className="fixed inset-0 z-[19999] bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[20000] bg-[#1A1A1A] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] w-[320px] max-w-[90vw]"
            >
              {/* Tabs Header */}
              <div className="flex bg-white/2 p-2 gap-1 overflow-x-auto scrollbar-none border-b border-white/5 no-scrollbar">
                {EMOJI_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "p-3 rounded-2xl transition-all relative flex-1 flex justify-center",
                      activeCategory === cat.id ? "bg-white text-black shadow-lg shadow-white/10" : "text-white/40 hover:bg-white/5"
                    )}
                  >
                    <cat.icon size={16} strokeWidth={2.5} />
                  </button>
                ))}
              </div>

              <div className="p-4 pt-4">
                {/* Search Bar */}
                <div className="mb-4 relative group">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pesquisar ícone... (ex: meta, fogo)"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-red-500/50 transition-all placeholder:text-white/20"
                    autoFocus
                  />
                  {search && (
                    <button 
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/20 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center mb-4 px-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 truncate max-w-[150px]">
                    {currentCategoryLabel}
                  </span>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => { onChange(''); setIsOpen(false); }} 
                      className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-md"
                    >
                      Nenhum
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsOpen(false)} 
                      className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
                    >
                      X
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-1 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredEmojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onChange(emoji)
                        setIsOpen(false)
                      }}
                      className={cn(
                        "w-12 h-12 flex items-center justify-center text-2xl rounded-2xl transition-all duration-200",
                        "hover:bg-white/10 hover:scale-110 active:scale-90",
                        value === emoji ? "bg-white/10 ring-2 ring-white/20" : "hover:shadow-xl"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                  {filteredEmojis.length === 0 && (
                    <div className="col-span-5 py-8 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Nenhum ícone encontrado</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Page indicator dots */}
              <div className="flex justify-center gap-1.5 pb-4">
                {EMOJI_CATEGORIES.map(cat => (
                  <div 
                    key={cat.id} 
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      activeCategory === cat.id ? "bg-white w-4" : "bg-white/10 w-1"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>
    </div>
  )
}
