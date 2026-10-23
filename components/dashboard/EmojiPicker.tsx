'use client'
import { useModalLayer } from '@/components/ui/useModalLayer'

import { isFinePointer } from '@/lib/utils/pointer'
import { useState, useEffect, useRef } from 'react'
import { fitToVisualViewport } from '@/lib/utils/visualViewport'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils/cn'
import { Smile, X, Leaf, Pizza, Zap, Briefcase, Settings, Music } from 'lucide-react'

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    label: 'Pessoas',
    icon: Smile,
    emojis: [
      '🎯','✨','🌟','🔥','⚡','🌈','❤️','😊','😎','🤩',
      '🥳','🤫','🤔','💪','🧠','🙌','🙏','🤝','👋','✌️',
      '😂','🤣','🥹','🥰','😍','😌','😋','😜','😃','😄',
      '😁','😆','😅','🤗','😇','🥺','😭','😢','😤','😠',
      '😡','🤬','😈','👿','💀','☠️','😱','😳','😬','🫠',
      '🥸','🤡','👹','👺','🤖','👾','👻','👽','🎃','😺',
      '😸','😹','😻','🫂','🫶','👍','👎','✊','👊','🤛',
      '🤜','🤞','🤟','🤘','🤙','👆','👇','👈','👉','✋',
      '🖐️','🤚','💅','💍','👑','💄','👀','👅','🫁','🦷',
      '🦴','👂','👃','🧔','👱','🧑','👨','👩','🧒','👶',
    ]
  },
  {
    id: 'activities',
    label: 'Atividades',
    icon: Zap,
    emojis: [
      '🏃','🧘','🏋️','🚴','🚶','⚽','🏀','🎾','🎮','🎸',
      '🎧','🎬','🎨','📸','📚','✏️','💻','💡','⏰','⌛',
      '🏊','🚣','🧗','🥊','🥋','🛹','🎹','🎻','🎤','🎟',
      '🎭','🧶','🧵','♟','🧩','🚀','⛵','🏹','💎','🧪',
      '⛷️','🏂','🏄','🚵','🤸','🤺','🥅','🏌️','🏇','🤿',
      '🪂','🤼','🤾','🏐','🏈','🏉','🎱','🏓','🏸','🥏',
      '⛳','🎣','🤿','🎯','🎳','🎲','🃏','🪅','🎪','🎡',
      '🎢','🎠','🎆','🎇','🧨','🎑','🎃','🎄','🎋','🎍',
      '🎎','🎏','🎐','🎀','🎁','🎈','🎉','🎊','🎓','🏆',
      '🥇','🥈','🥉','🏅','🎖️','🎗️','🏵️','🎫','🎟️','🎪',
    ]
  },
  {
    id: 'nature',
    label: 'Natureza',
    icon: Leaf,
    emojis: [
      '🐶','🐱','🐼','🦁','🐷','🐸','🐨','🐵','🐣','🦋',
      '🌱','🌿','☘️','🍀','🌵','🌴','🌸','🌼','🌞','🌙',
      '🦊','🐰','🐯','🐮','🐑','🐧','🦆','🐝','🐞','🦗',
      '🌲','🌳','🌊','🍄','🌍','🌋','⛺','🏔','❄️','🔥',
      '🦄','🐉','🦅','🦉','🦝','🐺','🦌','🐗','🐠','🐟',
      '🦈','🐬','🐳','🦭','🌺','🌻','🌹','🌷','🪷','🌾',
      '🍃','🪨','🌰','🐇','🦔','🐿️','🦫','🐛','🦎','🐍',
      '🐊','🦜','🦢','🦩','🕊️','🐓','🦃','🦚','🦜','🦣',
      '🌩️','🌧️','⛈️','🌤️','🌦️','☀️','⭐','🌠','🌌','🪐',
      '🌙','🌛','🌜','🌝','☁️','🌫️','🌪️','🌈','❄️','💧',
    ]
  },
  {
    id: 'food',
    label: 'Comida',
    icon: Pizza,
    emojis: [
      '🍎','🥦','🥕','🥑','🍳','🥞','🍕','🍣','🥙','🍚',
      '🍫','🍿','☕','🍵','🥤','🍷','🍺','🧉','🍼','🥛',
      '🍓','🍉','🍌','🍍','🍔','🍟','🍜','🍲','🥡','🥧',
      '🍦','🍩','🍪','🍯','🥃','🍹','🧂','🥢','🥄','🫗',
      '🍊','🍋','🍇','🍑','🍒','🫐','🥝','🍈','🌽','🫑',
      '🥬','🧅','🧄','🥔','🍠','🥐','🥖','🫓','🧆','🧇',
      '🥩','🍗','🍖','🌭','🌮','🫔','🥪','🥗','🥘','🫕',
      '🧁','🎂','🍰','🥮','🍡','🍧','🍨','🍮','🍭','🍬',
      '🍛','🍝','🍠','🥟','🦪','🍤','🦐','🦑','🦞','🦀',
      '🥚','🧀','🥓','🫙','🧴','🍶','🥂','🍾','🫖','🧃',
    ]
  },
  {
    id: 'objects',
    label: 'Objetos',
    icon: Briefcase,
    emojis: [
      '💼','💰','💳','🛒','🛍','🎁','🎈','🔑','🔒','📞',
      '📧','📦','🏠','🚗','✈️','🏝','🚿','🧼','💊','🪥',
      '🖥','🖱','⌨️','📱','⌚','📷','🎥','🔦','📕','🗞',
      '🏷','✉️','📪','🔨','🪛','🪚','🩹','🩺','🪞','🪑',
      '🛋️','🛏️','🚪','🪟','🧹','🧺','🧻','🪣','🧴','🪒',
      '🧽','🧯','🛁','🧲','🔌','🔋','💡','🕯️','🧱','⚙️',
      '🗜️','⛏️','🪓','⚓','🧭','🗺️','🧳','☂️','🎒','👝',
      '👛','👜','🧢','👒','🎩','⛑️','👓','🕶️','🥽','🌂',
      '💈','🪄','🎩','🪬','🧿','🪩','📿','💎','💍','👑',
      '🔭','🔬','📡','📻','📺','📼','📷','📹','🎞','📞',
    ]
  },
  {
    id: 'symbols',
    label: 'Símbolos',
    icon: Settings,
    emojis: [
      '📅','📝','📌','📍','📈','📉','📊','🛠','⚙️','⚖️',
      '⛓','🧲','🧪','🔭','📡','📢','🔔','💬','🗯','💭',
      '✅','❌','⚠️','🚫','💯','🆘','♻️','🌐','🏧','♿',
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','❤️‍🔥',
      '💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟',
      '☯️','✝️','☪️','🕉️','✡️','🔯','☮️','🕊️','🌀','♾️',
      '🔄','🔃','🔀','🔁','🔂','▶️','⏸️','⏹️','⏺️','⏭️',
      '🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔶',
      '🔷','🔸','🔹','🔺','🔻','💠','🔘','🔲','🔳','⬛',
      '🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🎏','🎀',
    ]
  },
]

const EMOJI_KEYWORDS: Record<string, string> = {
  // Pessoas e Emoções
  '🎯': 'foco meta objetivo alvo precisao',
  '✨': 'magica brilho novo especial maravilhoso',
  '🌟': 'estrela destaque excelente especial',
  '🔥': 'fogo urgente quente motivacao disposicao',
  '⚡': 'energia rapido raio velocidade potencia',
  '🌈': 'arco iris esperanca diversidade felicidade',
  '❤️': 'amor coracao saude carinho afeto',
  '😊': 'feliz sorriso alegria bem humor',
  '😎': 'legal oculos sol estiloso confiante',
  '🤩': 'estrela impressionado animado empolgado',
  '🥳': 'festa aniversario celebracao parabens',
  '🤔': 'pensar reflexao duvida questionar',
  '💪': 'forca treino musculo poder determinacao',
  '🧠': 'inteligencia mente estudo aprender cognitive',
  '🙌': 'aplaudir parabens celebrar conquista',
  '🙏': 'agradecer orar pedir rezar fé',
  '😂': 'risada gargalhada humor comico',
  '🥰': 'amor carinho apaixonado fofo',
  '😍': 'apaixonado admirar lindo bonito',
  '😭': 'chorar triste lagrima saudade',
  '😤': 'bravo frustrado indignado',
  '😈': 'maldade perversao traviesso travessura',
  '💀': 'morte osso esqueleto halloween',
  '😱': 'susto medo choque surpresa assustar',
  // Atividades e Esportes
  '🏃': 'corrida exercicio esporte ativo mover',
  '🧘': 'meditacao yoga calma paz tranquilidade',
  '🏋️': 'academia treino forca musculacao peso',
  '🚴': 'bike bicicleta ciclismo pedalar',
  '🚶': 'caminhada andar passear caminhar',
  '⚽': 'futebol bola esporte time jogar',
  '🏀': 'basquete basquetebol bola cesta',
  '🎾': 'tenis raquete bola quadra',
  '🎮': 'jogo videogame game controle',
  '🎸': 'guitarra musica rock instrumento',
  '🎧': 'musica fone ouvir audio',
  '🎬': 'filme cinema video producao',
  '🎨': 'arte pintura desenhar criatividade',
  '📸': 'foto fotografia camera imagem',
  '📚': 'estudo livros conhecimento aprender',
  '✏️': 'escrever anotar rascunho caneta',
  '💻': 'trabalho computador pc programar',
  '💡': 'ideia luz insight criatividade pensar',
  '⏰': 'hora tempo alarme acordar',
  '🏊': 'natacao piscina nadar agua',
  '🥊': 'boxe luta treino soco',
  '🛹': 'skate manobra patinar',
  '🎹': 'piano musica instrumento tecla',
  '🎤': 'cantar microfone musica show',
  '♟': 'xadrez estrategia pensar inteligencia',
  '🧩': 'quebra-cabeca puzzle montar desafio',
  '🚀': 'espaco lancamento foguete meta alta',
  '🏆': 'trofeu campeao vitoria conquista',
  '🥇': 'ouro primeiro lugar vencer campear',
  // Natureza
  '🐶': 'cachorro cao animal estimacao pet',
  '🐱': 'gato felino animal estimacao pet',
  '🐼': 'panda urso animal fofinho',
  '🦁': 'leao rei forte corajoso',
  '🌱': 'planta crescer evoluir natureza',
  '🌿': 'erva folha natural verde',
  '☘️': 'trevo sorte irlanda verde',
  '🍀': 'trevo quatro folhas sorte felicidade',
  '🌵': 'cactus deserto aridez resistencia',
  '🌴': 'palmeira praia verao tropical',
  '🌸': 'cerejeira primavera flores delicado',
  '🌼': 'flor margarida primavera bonita',
  '🌞': 'sol dia ensolarado calor alegria',
  '🌙': 'lua noite dormir descanso',
  '🦋': 'borboleta transformacao beleza leveza',
  '🌊': 'onda mar oceano agua',
  '🍄': 'cogumelo fungo natureza floresta',
  '🌍': 'mundo terra planeta global',
  '🏔': 'montanha escalar altitude natureza',
  '❄️': 'neve frio inverno gelado',
  // Comida
  '🍎': 'maca fruta dieta saudavel',
  '🥦': 'brocolis vegetal saudavel verde',
  '🥕': 'cenoura vegetal laranja saudavel',
  '🥑': 'abacate gordura boa dieta saudavel',
  '🍳': 'ovo fritura cafe proteina',
  '🥞': 'panqueca cafe manha doce',
  '🍕': 'pizza besteira fast food',
  '🍣': 'sushi peixe japones oriental',
  '🍔': 'hamburguer lanche fast food',
  '🍟': 'fritas batata salgado',
  '🍜': 'macarrao ramen sopa oriental',
  '🍲': 'sopa caldeirão refeicao',
  '🍫': 'chocolate doce cacau gostoso',
  '🍿': 'pipoca cinema lanche',
  '☕': 'cafe bebida quente manha',
  '🍵': 'cha bebida quente relaxar',
  '🥤': 'suco refrigerante bebida',
  '🍷': 'vinho bebida alcoolica beber',
  '🍺': 'cerveja chopp bebida alcoolica',
  '💊': 'remedio medicamento saude suplemento',
  // Objetos
  '💼': 'trabalho mala profissional negocios',
  '💰': 'dinheiro grana lucro financas rico',
  '💳': 'cartao credito pagamento compra',
  '🛒': 'compras carrinho mercado',
  '🎁': 'presente presente aniversario mimo',
  '🎈': 'balao festa aniversario comemoracao',
  '🔑': 'chave acesso entrada abrir',
  '🔒': 'cadeado seguranca privacidade',
  '📞': 'telefone ligar comunicacao',
  '📧': 'email mensagem comunicacao digital',
  '📦': 'caixa pacote entrega produto',
  '🏠': 'casa lar familia hogar',
  '🚗': 'carro transporte dirigir veículo',
  '✈️': 'aviao viagem voar voo ferias',
  '🏝': 'praia ferias descanso ilha',
  '📱': 'celular smartphone telefone app',
  '⌚': 'relogio hora tempo pontualidade',
  '📷': 'camera foto imagem fotografia',
  '📕': 'livro leitura estudar conhecimento',
  '📝': 'nota anotar escrever rascunho',
  '📌': 'fixar importante destaque',
  '📍': 'localização lugar mapa ponto',
  '📈': 'crescer lucro aumento progresso',
  '📉': 'queda baixa diminuir decrescente',
  '📊': 'grafico dados relatorio analise',
  '🔔': 'notificacao alerta sino lembrar',
  '💬': 'conversa chat mensagem comunicacao',
  '🛠': 'ferramenta construir consertar',
  '⚙️': 'configuracao ajuste mecanismo',
  '🔭': 'telescopio astronomia observar',
  '💎': 'diamante precioso luxo valor',
  '🧳': 'mala viagem bagagem',
  // Símbolos
  '✅': 'concluido feito correto certo',
  '❌': 'errado nao falso cancelar',
  '⚠️': 'atencao cuidado alerta aviso',
  '🚫': 'proibido nao permitido bloquear',
  '💯': 'perfeito cem porcento excelente',
  '♻️': 'reciclar sustentavel ecologico verde',
  '🌐': 'internet web global mundo',
  '❤️‍🔥': 'amor apaixonado coracao fogo intenso',
  '💔': 'coracao partido tristeza fim',
  '💕': 'amor carinho dois coracoes',
  '🕊️': 'paz liberdade pomba voar',
  '🌀': 'espiral movimento ciclo rotacao',
  '♾️': 'infinito eterno sempre ilimitado',
  '🔴': 'vermelho alerta urgente importante',
  '🟢': 'verde ok positivo permitido',
  '🔵': 'azul calma tranquilo serenidade',
  '🟡': 'amarelo alerta medio cuidado',
}

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('smileys')

  useEffect(() => { setIsMounted(true) }, [])
  useEffect(() => { if (!isOpen) setSearch('') }, [isOpen])
  useModalLayer(isOpen, () => setIsOpen(false))
  const pickerLayerRef = useRef<HTMLDivElement>(null)

  // ESC fecha só o seletor (capture, antes do modal por baixo); teclado virtual não cobre a busca
  useEffect(() => {
    if (!isOpen) return
    const stopFit = fitToVisualViewport(pickerLayerRef.current)
    return () => { stopFit() }
  }, [isOpen])

  const filteredEmojis = search
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(emoji =>
        EMOJI_KEYWORDS[emoji]?.toLowerCase().includes(search.toLowerCase()) ||
        emoji.includes(search)
      )
    : EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.emojis || EMOJI_CATEGORIES[0].emojis

  const currentCategoryLabel = search
    ? `Resultados para "${search}"`
    : (EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.label || 'Pessoas')

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(prev => !prev) }}
        className={cn(
          "w-16 h-16 md:w-20 md:h-20 bg-white/5 border border-white/10 rounded-[28px] text-3xl flex items-center justify-center hover:bg-white/10 transition-all shadow-xl",
          isOpen && "border-white/30 bg-white/10 ring-4 ring-white/5"
        )}
      >
        {value || <Smile className="text-white/20" size={32} />}
      </button>

      {/* Portal — always mounted when isMounted; AnimatePresence lives INSIDE the portal */}
      {isMounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="emoji-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[29998] bg-black/50 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
              />

              {/* Picker wrapper — centered */}
              <div ref={pickerLayerRef} className="fixed inset-0 z-[29999] flex items-end sm:items-center justify-center pointer-events-none">
                <motion.div
                  key="emoji-picker"
                  initial={{ opacity: 0, scale: 0.88, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 12 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                  onClick={(e) => e.stopPropagation()}
                  className="pointer-events-auto bg-[#1A1A1A] border border-white/10 rounded-t-[28px] sm:rounded-[32px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)] w-full sm:w-[340px] sm:max-w-[92vw] max-h-[70dvh] sm:max-h-[90dvh] flex flex-col"
                >
                {/* Category tabs */}
                <div className="shrink-0 flex bg-white/[0.02] p-2 gap-1 overflow-x-auto border-b border-white/5 no-scrollbar">
                  {EMOJI_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setActiveCategory(cat.id); setSearch('') }}
                      className={cn(
                        "p-3 rounded-2xl transition-all relative flex-1 flex justify-center shrink-0",
                        activeCategory === cat.id && !search
                          ? "bg-white text-black shadow-lg shadow-white/10"
                          : "text-white/40 hover:bg-white/5 hover:text-white/60"
                      )}
                    >
                      <cat.icon size={16} strokeWidth={2.5} />
                    </button>
                  ))}
                </div>

                <div className="p-4 flex flex-col min-h-0 flex-1">
                  {/* Search */}
                  <div className="mb-3 relative shrink-0">
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar emoji... (ex: fogo, meta, treino)"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-red-500/50 transition-all placeholder:text-white/20"
                      autoFocus={isFinePointer()}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white transition-colors"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Header row */}
                  <div className="flex justify-between items-center mb-3 px-0.5 shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 truncate max-w-[160px]">
                      {currentCategoryLabel}
                    </span>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { onChange(''); setIsOpen(false) }}
                        className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors bg-white/5 px-3 min-h-[44px] rounded-lg"
                      >
                        Nenhum
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-red-400/80 hover:text-red-300 transition-colors px-2 min-h-[44px]"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>

                  {/* Emoji grid */}
                  <div className="grid grid-cols-6 gap-0.5 flex-1 min-h-0 sm:flex-none sm:max-h-[230px] overflow-y-auto overscroll-contain pr-0.5 custom-scrollbar content-start">
                    {filteredEmojis.map((emoji, idx) => (
                      <button
                        key={`${emoji}-${idx}`}
                        type="button"
                        onClick={() => { onChange(emoji); setIsOpen(false) }}
                        title={EMOJI_KEYWORDS[emoji]?.split(' ')[0] || emoji}
                        className={cn(
                          "w-full aspect-square flex items-center justify-center text-2xl rounded-xl transition-all duration-150",
                          "hover:bg-white/10 hover:scale-110 active:scale-90",
                          value === emoji ? "bg-white/15 ring-2 ring-white/30" : ""
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                    {filteredEmojis.length === 0 && (
                      <div className="col-span-6 py-8 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                          Nenhum emoji encontrado
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category indicator dots */}
                <div className="shrink-0 flex justify-center gap-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  {EMOJI_CATEGORIES.map(cat => (
                    <div
                      key={cat.id}
                      className={cn(
                        "h-1 rounded-full transition-all duration-300",
                        activeCategory === cat.id && !search
                          ? "bg-white w-4"
                          : "bg-white/10 w-1"
                      )}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  )
}
