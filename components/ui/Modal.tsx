'use client'

import { useEffect, useId, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { fitToVisualViewport } from '@/lib/utils/visualViewport'
import { cn } from '@/lib/utils/cn'
import { createScrollLock } from '@/lib/utils/scrollLock'
import { FOCUSABLE_SELECTOR, nextFocusIndex, shouldCloseOnBackdrop, layerStack } from '@/lib/utils/modalLogic'

// Trava de rolagem compatível com o Safari do iPhone (position:fixed, não só overflow:hidden).
const scrollLock = createScrollLock(() => document.body, () => window)
export function lockBodyScroll() { scrollLock.lock() }
export function unlockBodyScroll() { scrollLock.unlock() }

export const DARK_TOKENS = '[--bg-primary:#0A0A0A] [--bg-overlay:rgba(255,255,255,0.04)] [--text-primary:#FFFFFF] [--text-secondary:rgba(255,255,255,0.6)] [--text-muted:rgba(255,255,255,0.5)] [--border-subtle:rgba(255,255,255,0.08)]'
const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Rodapé fixo (botões Salvar/Criar/Excluir). Fica sempre visível. */
  footer?: React.ReactNode
  /** Se informado, a casca vira um <form> e o submit dos botões do rodapé dispara isto. */
  onSubmit?: (e: React.FormEvent) => void
  /** Camadas acima do corpo rolável (ex.: mini-modal de categoria). Cobrem toda a tela. */
  overlays?: React.ReactNode
  /** Classe de largura máxima no desktop. Padrão: sm:max-w-lg */
  maxWidthClass?: string
  /** Texto pequeno abaixo do título. */
  subtitle?: string
  /** Ícone ao lado do título. */
  icon?: React.ReactNode
  /** Fixa os tokens de tema em escuro dentro do modal (conteúdo escrito só para fundo escuro). */
  forceDark?: boolean
  /** Classe extra do corpo (padding/espaçamento). */
  bodyClassName?: string
}

export function Modal({
  isOpen, onClose, title, children, footer, onSubmit, overlays,
  maxWidthClass = 'sm:max-w-lg', bodyClassName, subtitle, icon, forceDark,
}: ModalProps) {
  const uid = useId()
  const reduceMotion = useReducedMotion()
  const titleId = `modal-title-${uid}`
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const downTarget = useRef<EventTarget | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Trava de scroll, ESC, trap de foco, foco inicial e devolução do foco
  useEffect(() => {
    if (!isOpen) return
    const id = uid
    layerStack.push(id)
    lockBodyScroll()
    const previouslyFocused = document.activeElement as HTMLElement | null

    const onKey = (e: KeyboardEvent) => {
      if (!layerStack.isTop(id)) return
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return }
      if (e.key !== 'Tab' || !sheetRef.current) return
      // Foco num portal externo (ex.: seletor de data): não interfere
      const active = document.activeElement
      if (active && active !== document.body && !sheetRef.current.contains(active)) return
      const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      const idx = items.indexOf(document.activeElement as HTMLElement)
      const next = nextFocusIndex(items.length, idx, e.shiftKey)
      if (next !== null) { e.preventDefault(); items[next].focus() }
    }
    document.addEventListener('keydown', onKey)

    // Foco inicial: primeiro campo no desktop; no toque, o título (não abre o teclado sozinho)
    const finePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches
    const firstField = finePointer
      ? bodyRef.current?.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])')
      : null
    ;(firstField || titleRef.current)?.focus({ preventScroll: true })

    return () => {
      document.removeEventListener('keydown', onKey)
      layerStack.remove(id)
      unlockBodyScroll()
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus({ preventScroll: true })
    }
  }, [isOpen, uid])

  // Teclado virtual: campo focalizado no corpo vai para o centro; overlay acompanha o viewport visual
  useEffect(() => {
    if (!isOpen) return
    const body = bodyRef.current
    const overlay = overlayRef.current
    const touchLike = typeof window.matchMedia === 'function'
      && (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 639px)').matches)
    let timer: ReturnType<typeof setTimeout> | undefined
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null
      if (!touchLike || !t || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      if (timer) clearTimeout(timer)
      // espera o teclado terminar de abrir antes de centralizar
      timer = setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
    }
    body?.addEventListener('focusin', onFocusIn)

    const stopFit = fitToVisualViewport(overlay)
    return () => {
      if (timer) clearTimeout(timer)
      body?.removeEventListener('focusin', onFocusIn)
      stopFit()
    }
  }, [isOpen])

  if (!isOpen) return null

  const Shell: any = onSubmit ? 'form' : 'div'

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center sm:p-6 text-left"
    >
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onMouseDown={e => { downTarget.current = e.target }}
        onTouchStart={e => { downTarget.current = e.target }}
        onClick={e => {
          const ok = shouldCloseOnBackdrop(downTarget.current, e.target, e.currentTarget)
          downTarget.current = null
          if (ok) onClose()
        }}
        className="absolute inset-0 bg-black/70 md:backdrop-blur-md"
        aria-hidden="true"
      />

      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
        animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
        transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', damping: 32, stiffness: 320 }}
        className={cn(
          'relative w-full flex flex-col max-h-[92dvh] bg-[var(--bg-primary)] border border-[var(--border-subtle)]',
          'rounded-t-[28px] sm:rounded-[32px] shadow-2xl overflow-hidden',
          maxWidthClass,
          forceDark && DARK_TOKENS,
        )}
      >
        <Shell
          ref={sheetRef as any}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onSubmit={onSubmit}
          className="flex flex-col min-h-0 flex-1"
        >
          {/* Cabeçalho fixo */}
          <div className="shrink-0 px-5 pt-3 sm:pt-5 sm:px-7">
            <div className="w-10 h-1 bg-[var(--border-subtle)] rounded-full mx-auto mb-3 sm:hidden [@media(max-height:500px)]:hidden" />
            <div className="flex justify-between items-center gap-3 pb-3">
              {icon}
              <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                ref={titleRef}
                tabIndex={-1}
                className="text-2xl max-[500px]:text-lg sm:text-3xl font-black tracking-tightest text-[var(--text-primary)] outline-none"
              >
                {title}
              </h2>
              {subtitle && <p className="text-[12px] text-[var(--text-muted)] uppercase tracking-widest font-black mt-1">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className={cn('shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[var(--bg-overlay)] rounded-2xl transition-all', FOCUS_RING)}
              >
                <X size={20} className="text-[var(--text-secondary)]" />
              </button>
            </div>
          </div>

          {/* Corpo rolável */}
          <div
            ref={bodyRef}
            className={cn('flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-7 pb-4', bodyClassName)}
          >
            {children}
          </div>

          {/* Rodapé fixo (Salvar sempre visível) */}
          {footer && (
            <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-5 sm:px-7 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] [@media(max-height:500px)]:py-2">
              {footer}
            </div>
          )}
        </Shell>
      </motion.div>

      {overlays && (forceDark ? <div className={cn(DARK_TOKENS)}>{overlays}</div> : overlays)}
    </div>
  )
}
