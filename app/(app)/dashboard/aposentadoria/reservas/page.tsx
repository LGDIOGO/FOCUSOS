'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Trash2, Pencil, TrendingUp, TrendingDown,
  Wallet, Target, Clock, X, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { EmojiPicker } from '@/components/dashboard/EmojiPicker'
import {
  useReserves, useReserveTxs, useCreateReserve,
  useDeleteReserve, useTransact, useUpdateReserve,
  type Reserve, type ReserveTx,
} from '@/lib/hooks/useReserves'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  { id: 'blue',    stroke: '#3b82f6', bg: 'bg-blue-500/15',    ring: 'ring-blue-500',    text: 'text-blue-400',    dot: 'bg-blue-500'    },
  { id: 'emerald', stroke: '#10b981', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  { id: 'amber',   stroke: '#f59e0b', bg: 'bg-amber-500/15',   ring: 'ring-amber-500',   text: 'text-amber-400',   dot: 'bg-amber-500'   },
  { id: 'purple',  stroke: '#a855f7', bg: 'bg-purple-500/15',  ring: 'ring-purple-500',  text: 'text-purple-400',  dot: 'bg-purple-500'  },
  { id: 'red',     stroke: '#ef4444', bg: 'bg-red-500/15',     ring: 'ring-red-500',     text: 'text-red-400',     dot: 'bg-red-500'     },
  { id: 'cyan',    stroke: '#06b6d4', bg: 'bg-cyan-500/15',    ring: 'ring-cyan-500',    text: 'text-cyan-400',    dot: 'bg-cyan-500'    },
  { id: 'pink',    stroke: '#ec4899', bg: 'bg-pink-500/15',    ring: 'ring-pink-500',    text: 'text-pink-400',    dot: 'bg-pink-500'    },
  { id: 'orange',  stroke: '#f97316', bg: 'bg-orange-500/15',  ring: 'ring-orange-500',  text: 'text-orange-400',  dot: 'bg-orange-500'  },
]

const DEFAULT_COLOR = 'blue'
const DEFAULT_EMOJI = '🏦'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number, compact = false): string {
  if (compact) {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`
    if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`
  }
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function colorById(id: string) {
  return COLORS.find(c => c.id === id) ?? COLORS[0]
}

// ─── SVG circular progress ring ───────────────────────────────────────────────

function ProgressRing({ pct, stroke, size = 64, thickness = 5 }: { pct: number; stroke: string; size?: number; thickness?: number }) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(pct, 100) / 100)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} className="absolute inset-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={stroke} strokeWidth={thickness}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  )
}

// ─── Transaction list ─────────────────────────────────────────────────────────

function TxList({ reserveId }: { reserveId: string }) {
  const { data: txs = [], isLoading } = useReserveTxs(reserveId)
  const sorted = useMemo(() => [...txs].sort((a, b) => b.created_at.localeCompare(a.created_at)), [txs])

  if (isLoading) return <p className="text-xs text-white/30 py-3 text-center">Carregando...</p>
  if (!sorted.length) return <p className="text-xs text-white/30 py-3 text-center">Nenhuma movimentação ainda.</p>

  return (
    <div className="space-y-px max-h-52 overflow-y-auto">
      {sorted.map(tx => (
        <div key={tx.id} className="flex items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
              tx.type === 'deposit' ? 'bg-emerald-500/15' : 'bg-red-500/15'
            )}>
              {tx.type === 'deposit'
                ? <TrendingUp size={12} className="text-emerald-400" />
                : <TrendingDown size={12} className="text-red-400" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/80 truncate">{tx.note || (tx.type === 'deposit' ? 'Depósito' : 'Retirada')}</p>
              <p className="text-[10px] text-white/30">{fmtDate(tx.date)}</p>
            </div>
          </div>
          <span className={cn('text-sm font-bold tabular-nums shrink-0', tx.type === 'deposit' ? 'text-emerald-400' : 'text-red-400')}>
            {tx.type === 'deposit' ? '+' : '−'}{fmtBRL(tx.amount, true)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Transact panel ───────────────────────────────────────────────────────────

function TransactPanel({ reserve, onClose }: { reserve: Reserve; onClose: () => void }) {
  const { mutate: transact, isPending } = useTransact()
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const col = colorById(reserve.color)

  function handleSubmit() {
    const v = parseInt(amount.replace(/\D/g, ''), 10)
    if (isNaN(v) || v <= 0) return
    transact({ reserveId: reserve.id, amount: v, type, note, currentBalance: reserve.balance }, { onSuccess: onClose })
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="pt-3 mt-3 border-t border-white/[0.06] space-y-3">
        {/* Type toggle */}
        <div className="flex gap-2">
          {(['deposit', 'withdrawal'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 uppercase tracking-wide',
                type === t && t === 'deposit'  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : type === t && t === 'withdrawal' ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'border-white/[0.08] text-white/30 hover:text-white/60'
              )}
            >
              {t === 'deposit' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {t === 'deposit' ? 'Depositar' : 'Retirar'}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] focus-within:border-white/20 transition-colors">
          <span className="text-sm text-white/40 font-semibold shrink-0">R$</span>
          <input
            type="text" inputMode="numeric" placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
            className="flex-1 bg-transparent text-xl font-black text-white outline-none min-w-0 placeholder:text-white/20"
          />
        </div>

        {/* Note */}
        <input
          type="text" placeholder="Observação (opcional)"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
        />

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/40 hover:text-white/70 transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !amount}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
              type === 'deposit' ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-red-500 text-white hover:bg-red-400',
              (isPending || !amount) && 'opacity-40 cursor-not-allowed'
            )}
          >
            {isPending ? '...' : type === 'deposit' ? 'Depositar' : 'Retirar'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({ reserve, onClose }: { reserve: Reserve; onClose: () => void }) {
  const { mutate: update, isPending } = useUpdateReserve()
  const [name, setName] = useState(reserve.name)
  const [emoji, setEmoji] = useState(reserve.emoji)
  const [color, setColor] = useState(reserve.color)
  const [target, setTarget] = useState(reserve.target > 0 ? String(reserve.target) : '')

  function handleSave() {
    if (!name.trim()) return
    update(
      { id: reserve.id, name: name.trim(), emoji, color, target: parseInt(target.replace(/\D/g, ''), 10) || 0 },
      { onSuccess: onClose }
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 32, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="w-full max-w-sm bg-[#1a1a1a] rounded-3xl border border-white/[0.08] p-6 space-y-5 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-base font-black text-white tracking-tight">Editar Reserva</p>
          <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Emoji picker */}
        <div className="flex justify-center">
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>

        {/* Name */}
        <input
          type="text" placeholder="Nome da reserva"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-white placeholder:text-white/25 outline-none focus:border-white/25 transition-colors"
        />

        {/* Color */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2.5">Cor</p>
          <div className="flex gap-2.5 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={cn(
                  'w-8 h-8 rounded-full transition-all',
                  c.dot,
                  color === c.id ? `ring-2 ring-offset-2 ring-offset-[#1a1a1a] ${c.ring}` : 'opacity-60 hover:opacity-100'
                )}
              />
            ))}
          </div>
        </div>

        {/* Target */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] focus-within:border-white/20 transition-colors">
          <Target size={14} className="text-white/30 shrink-0" />
          <span className="text-sm text-white/30 font-semibold shrink-0">Meta R$</span>
          <input
            type="text" inputMode="numeric" placeholder="Sem meta"
            value={target}
            onChange={e => setTarget(e.target.value.replace(/\D/g, ''))}
            className="flex-1 bg-transparent text-sm font-bold text-white outline-none min-w-0 placeholder:text-white/20"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/[0.08] text-sm text-white/40 hover:text-white/70 transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className={cn(
              'flex-1 py-3 rounded-2xl bg-white text-black text-sm font-black transition-all hover:bg-white/90',
              (isPending || !name.trim()) && 'opacity-40 cursor-not-allowed'
            )}
          >
            {isPending ? '...' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Reserve card ─────────────────────────────────────────────────────────────

function ReserveCard({ reserve }: { reserve: Reserve }) {
  const [panel, setPanel] = useState<'none' | 'transact' | 'history'>('none')
  const [editing, setEditing] = useState(false)
  const { mutate: deleteReserve, isPending: deleting } = useDeleteReserve()
  const col = colorById(reserve.color)

  const pct = reserve.target > 0 ? Math.min(100, Math.round((reserve.balance / reserve.target) * 100)) : null
  const isGoalMet = pct !== null && pct >= 100

  function confirmDelete() {
    if (window.confirm(`Excluir "${reserve.name}"? Todas as movimentações serão apagadas.`)) {
      deleteReserve(reserve.id)
    }
  }

  const RING_SIZE = 72

  return (
    <>
      <AnimatePresence>
        {editing && <EditModal key="edit" reserve={reserve} onClose={() => setEditing(false)} />}
      </AnimatePresence>

      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-overlay)] rounded-3xl border border-white/[0.06] p-5 hover:border-white/[0.10] transition-colors"
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Ring + emoji */}
          <div className="relative flex-shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
            {pct !== null && (
              <ProgressRing pct={pct} stroke={col.stroke} size={RING_SIZE} thickness={5} />
            )}
            <div className={cn(
              'absolute inset-[6px] rounded-full flex items-center justify-center text-2xl',
              col.bg
            )}>
              {reserve.emoji}
            </div>
            {isGoalMet && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check size={10} className="text-white" strokeWidth={3} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-black text-white leading-tight truncate">{reserve.name}</p>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className={cn('text-2xl font-black tabular-nums', col.text)}>
                {fmtBRL(reserve.balance, true)}
              </span>
              {reserve.target > 0 && (
                <span className="text-xs text-white/30 font-medium">/ {fmtBRL(reserve.target, true)}</span>
              )}
            </div>

            {pct !== null && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: col.stroke }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
                <span className="text-[10px] font-black text-white/30 tabular-nums shrink-0">{pct}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Faltam badge */}
        {reserve.target > 0 && !isGoalMet && (
          <p className="text-[11px] text-white/30 mt-3 pl-1">
            Faltam <span className="font-bold text-white/50">{fmtBRL(reserve.target - reserve.balance, true)}</span> para a meta
          </p>
        )}
        {isGoalMet && (
          <p className="text-[11px] font-bold text-emerald-400 mt-3 pl-1">✓ Meta atingida!</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setPanel(p => p === 'transact' ? 'none' : 'transact')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold border uppercase tracking-wide transition-all',
              panel === 'transact'
                ? 'bg-white/[0.08] border-white/20 text-white'
                : 'border-white/[0.08] text-white/40 hover:text-white hover:border-white/20'
            )}
          >
            <TrendingUp size={12} /> Movimentar
          </button>
          <button
            onClick={() => setPanel(p => p === 'history' ? 'none' : 'history')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold border uppercase tracking-wide transition-all',
              panel === 'history'
                ? 'bg-white/[0.08] border-white/20 text-white'
                : 'border-white/[0.08] text-white/40 hover:text-white hover:border-white/20'
            )}
          >
            <Clock size={12} /> Histórico
          </button>
        </div>

        <AnimatePresence mode="wait">
          {panel === 'transact' && (
            <TransactPanel key="transact" reserve={reserve} onClose={() => setPanel('none')} />
          )}
          {panel === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <TxList reserveId={reserve.id} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateForm({ onDone }: { onDone: () => void }) {
  const { mutate: create, isPending } = useCreateReserve()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI)
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [target, setTarget] = useState('')

  function handleCreate() {
    if (!name.trim()) return
    create(
      { name: name.trim(), emoji, color, target: parseInt(target.replace(/\D/g, ''), 10) || 0 },
      { onSuccess: onDone }
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="bg-[var(--bg-overlay)] rounded-3xl border border-white/[0.08] p-5 space-y-4"
    >
      <p className="text-sm font-black text-white tracking-tight">Nova Reserva</p>

      {/* Emoji picker */}
      <div className="flex justify-center">
        <EmojiPicker value={emoji} onChange={setEmoji} />
      </div>

      {/* Name */}
      <input
        type="text" placeholder="Nome da reserva"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
        autoFocus
        className="w-full px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm font-bold text-white placeholder:text-white/25 outline-none focus:border-white/25 transition-colors"
      />

      {/* Color */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2.5">Cor</p>
        <div className="flex gap-2.5 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setColor(c.id)}
              className={cn(
                'w-8 h-8 rounded-full transition-all',
                c.dot,
                color === c.id ? `ring-2 ring-offset-2 ring-offset-[var(--bg-overlay)] ${c.ring}` : 'opacity-60 hover:opacity-100'
              )}
            />
          ))}
        </div>
      </div>

      {/* Target */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] focus-within:border-white/20 transition-colors">
        <Target size={14} className="text-white/30 shrink-0" />
        <span className="text-sm text-white/30 font-semibold shrink-0">Meta R$</span>
        <input
          type="text" inputMode="numeric" placeholder="Opcional"
          value={target}
          onChange={e => setTarget(e.target.value.replace(/\D/g, ''))}
          className="flex-1 bg-transparent text-sm font-bold text-white outline-none min-w-0 placeholder:text-white/20"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 py-3 rounded-2xl border border-white/[0.08] text-sm text-white/40 hover:text-white/70 transition-all">
          Cancelar
        </button>
        <button
          onClick={handleCreate}
          disabled={isPending || !name.trim()}
          className={cn(
            'flex-1 py-3 rounded-2xl bg-white text-black text-sm font-black transition-all hover:bg-white/90 active:scale-95',
            (isPending || !name.trim()) && 'opacity-40 cursor-not-allowed'
          )}
        >
          {isPending ? '...' : 'Criar'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReservasPage() {
  const router = useRouter()
  const { data: reserves = [], isLoading } = useReserves()
  const [creating, setCreating] = useState(false)

  const sorted = useMemo(() => [...reserves].sort((a, b) => b.balance - a.balance), [reserves])

  const totalBalance = useMemo(() => reserves.reduce((s, r) => s + r.balance, 0), [reserves])
  const totalTarget  = useMemo(() => reserves.filter(r => r.target > 0).reduce((s, r) => s + r.target, 0), [reserves])
  const goalsHit     = reserves.filter(r => r.target > 0 && r.balance >= r.target).length
  const totalPct     = totalTarget > 0 ? Math.min(100, Math.round((totalBalance / totalTarget) * 100)) : null

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 pb-24 lg:pb-8 max-w-xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => router.push('/dashboard/aposentadoria')}
          className="p-2.5 rounded-2xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-white tracking-tight">Reservas</h1>
          <p className="text-sm text-white/35 mt-0.5">Fundos separados por objetivo</p>
        </div>
        <button
          onClick={() => setCreating(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95',
            creating
              ? 'bg-white/[0.08] text-white/60 border border-white/[0.08]'
              : 'bg-white text-black hover:bg-white/90'
          )}
        >
          <Plus size={15} />
          Nova
        </button>
      </div>

      {/* Summary hero */}
      {reserves.length > 0 && (
        <div className="bg-[var(--bg-overlay)] rounded-3xl border border-white/[0.06] p-5">
          <div className="flex items-center gap-5">
            {/* Big ring */}
            <div className="relative shrink-0" style={{ width: 88, height: 88 }}>
              {totalPct !== null
                ? <ProgressRing pct={totalPct} stroke="#3b82f6" size={88} thickness={6} />
                : (
                  <svg width={88} height={88} className="absolute inset-0">
                    <circle cx={44} cy={44} r={41} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
                  </svg>
                )
              }
              <div className="absolute inset-[7px] rounded-full bg-white/[0.04] flex items-center justify-center">
                <Wallet size={24} className="text-white/50" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35 mb-1">Total em Reservas</p>
              <p className="text-3xl font-black text-white tabular-nums leading-none">{fmtBRL(totalBalance)}</p>
              {totalTarget > 0 && (
                <p className="text-xs text-white/35 mt-1.5">
                  {totalPct}% de {fmtBRL(totalTarget, true)} em metas
                </p>
              )}
            </div>

            <div className="text-right shrink-0 space-y-1">
              <p className="text-xs text-white/35">{reserves.length} {reserves.length === 1 ? 'reserva' : 'reservas'}</p>
              {goalsHit > 0 && (
                <p className="text-xs font-bold text-emerald-400">{goalsHit} meta{goalsHit > 1 ? 's' : ''} ✓</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {creating && <CreateForm key="create" onDone={() => setCreating(false)} />}
      </AnimatePresence>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-white/30 text-sm">Carregando...</div>
      ) : sorted.length === 0 && !creating ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 py-20 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-4xl">
            🏦
          </div>
          <div>
            <p className="text-base font-black text-white mb-1">Nenhuma reserva ainda</p>
            <p className="text-sm text-white/35 max-w-xs leading-relaxed">
              Crie reservas separadas para cada objetivo — emergência, viagem, carro, imóvel...
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="px-6 py-3 rounded-2xl bg-white text-black text-sm font-black hover:bg-white/90 transition-all active:scale-95"
          >
            Criar primeira reserva
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {sorted.map(r => <ReserveCard key={r.id} reserve={r} />)}
        </div>
      )}
    </div>
  )
}
