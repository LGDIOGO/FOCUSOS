'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, Trash2,
  ChevronDown, ChevronUp, Wallet, Target,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  useReserves, useReserveTxs, useCreateReserve,
  useDeleteReserve, useTransact,
  type Reserve, type ReserveTx,
} from '@/lib/hooks/useReserves'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  { id: 'blue',   bg: 'bg-blue-500',   ring: 'ring-blue-500',   text: 'text-blue-400',   bar: '#3b82f6' },
  { id: 'emerald',bg: 'bg-emerald-500',ring: 'ring-emerald-500',text: 'text-emerald-400',bar: '#10b981' },
  { id: 'amber',  bg: 'bg-amber-500',  ring: 'ring-amber-500',  text: 'text-amber-400',  bar: '#f59e0b' },
  { id: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-500', text: 'text-purple-400', bar: '#a855f7' },
  { id: 'red',    bg: 'bg-red-500',    ring: 'ring-red-500',    text: 'text-red-400',    bar: '#ef4444' },
  { id: 'cyan',   bg: 'bg-cyan-500',   ring: 'ring-cyan-500',   text: 'text-cyan-400',   bar: '#06b6d4' },
  { id: 'pink',   bg: 'bg-pink-500',   ring: 'ring-pink-500',   text: 'text-pink-400',   bar: '#ec4899' },
  { id: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-500', text: 'text-orange-400', bar: '#f97316' },
]

const EMOJIS = ['🏦','💰','🚗','✈️','🏠','📚','💻','🏥','💍','🎓','🌊','🌟','🛡️','🎯','🏋️','🎸']

const DEFAULT_COLOR = 'blue'
const DEFAULT_EMOJI = '🏦'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number, compact = false): string {
  if (compact) {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`
    if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`
  }
  return v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  })
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function colorById(id: string) {
  return COLORS.find(c => c.id === id) ?? COLORS[0]
}

// ─── Transaction sub-list ─────────────────────────────────────────────────────

function TxList({ reserveId }: { reserveId: string }) {
  const { data: txs = [], isLoading } = useReserveTxs(reserveId)
  const sorted = useMemo(
    () => [...txs].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [txs]
  )

  if (isLoading) return <p className="text-xs text-[var(--text-muted)] py-2 text-center">Carregando...</p>
  if (sorted.length === 0) return <p className="text-xs text-[var(--text-muted)] py-2 text-center">Nenhuma movimentação ainda.</p>

  return (
    <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
      {sorted.map(tx => (
        <div key={tx.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--border-subtle)]/50 last:border-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn('text-sm shrink-0', tx.type === 'deposit' ? 'text-emerald-400' : 'text-red-400')}>
              {tx.type === 'deposit' ? '↑' : '↓'}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-primary)] truncate">{tx.note || (tx.type === 'deposit' ? 'Depósito' : 'Retirada')}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{fmtDate(tx.date)}</p>
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

function TransactPanel({
  reserve, onClose,
}: {
  reserve: Reserve
  onClose: () => void
}) {
  const { mutate: transact, isPending } = useTransact()
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const col = colorById(reserve.color)

  function handleSubmit() {
    const v = parseInt(amount.replace(/\D/g, ''), 10)
    if (isNaN(v) || v <= 0) return
    transact(
      { reserveId: reserve.id, amount: v, type, note, currentBalance: reserve.balance },
      { onSuccess: onClose },
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-3"
    >
      {/* Type toggle */}
      <div className="flex gap-2">
        {(['deposit', 'withdrawal'] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5',
              type === t && t === 'deposit'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : type === t && t === 'withdrawal'
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            {t === 'deposit' ? <><TrendingUp size={13} /> Depositar</> : <><TrendingDown size={13} /> Retirar</>}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] focus-within:border-[var(--text-muted)] transition-colors">
        <span className="text-sm text-[var(--text-muted)] font-medium shrink-0">R$</span>
        <input
          type="text" inputMode="numeric" placeholder="0"
          value={amount}
          onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          className="flex-1 bg-transparent text-base font-bold text-[var(--text-primary)] outline-none min-w-0"
        />
      </div>

      {/* Note */}
      <input
        type="text" placeholder="Observação (opcional)"
        value={note}
        onChange={e => setNote(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--text-muted)] transition-colors"
      />

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending || !amount}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
            type === 'deposit'
              ? 'bg-emerald-500 text-white hover:bg-emerald-400'
              : 'bg-red-500 text-white hover:bg-red-400',
            (isPending || !amount) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isPending ? '...' : type === 'deposit' ? 'Depositar' : 'Retirar'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Reserve card ─────────────────────────────────────────────────────────────

function ReserveCard({ reserve }: { reserve: Reserve }) {
  const [panel, setPanel] = useState<'none' | 'transact' | 'history'>('none')
  const { mutate: deleteReserve, isPending: deleting } = useDeleteReserve()
  const col = colorById(reserve.color)

  const pct = reserve.target > 0
    ? Math.min(100, Math.round((reserve.balance / reserve.target) * 100))
    : null

  function confirmDelete() {
    if (window.confirm(`Excluir "${reserve.name}"? Todas as movimentações serão apagadas.`)) {
      deleteReserve(reserve.id)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--bg-overlay)] rounded-2xl border border-[var(--border-subtle)] p-4"
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0', `bg-${reserve.color}-500/15`)}>
          {reserve.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{reserve.name}</p>
            <button onClick={confirmDelete} disabled={deleting} className="text-[var(--text-muted)] hover:text-red-400 transition-colors shrink-0 p-1">
              <Trash2 size={13} />
            </button>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className={cn('text-xl font-black tabular-nums', col.text)}>
              {fmtBRL(reserve.balance, true)}
            </span>
            {reserve.target > 0 && (
              <span className="text-xs text-[var(--text-muted)]">/ {fmtBRL(reserve.target, true)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {pct !== null && (
        <div className="mt-3 space-y-1">
          <div className="h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', col.bg)}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
            <span>{pct}% da meta</span>
            <span>Faltam {fmtBRL(Math.max(0, reserve.target - reserve.balance), true)}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setPanel(p => p === 'transact' ? 'none' : 'transact')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all',
            panel === 'transact'
              ? 'bg-[var(--bg-primary)] border-[var(--text-muted)] text-[var(--text-primary)]'
              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
          )}
        >
          <TrendingUp size={12} /> Movimentar
        </button>
        <button
          onClick={() => setPanel(p => p === 'history' ? 'none' : 'history')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all',
            panel === 'history'
              ? 'bg-[var(--bg-primary)] border-[var(--text-muted)] text-[var(--text-primary)]'
              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
          )}
        >
          {panel === 'history' ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Histórico
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
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <TxList reserveId={reserve.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateForm({ onDone }: { onDone: () => void }) {
  const { mutate: create, isPending } = useCreateReserve()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI)
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [target, setTarget] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)

  function handleCreate() {
    if (!name.trim()) return
    create(
      {
        name: name.trim(),
        emoji,
        color,
        target: parseInt(target.replace(/\D/g, ''), 10) || 0,
      },
      { onSuccess: onDone },
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="bg-[var(--bg-overlay)] rounded-2xl border border-[var(--border-subtle)] p-4 space-y-3"
    >
      <p className="text-sm font-bold text-[var(--text-primary)]">Nova reserva</p>

      {/* Emoji + Name */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowEmojis(v => !v)}
          className="w-11 h-11 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xl flex items-center justify-center shrink-0 hover:border-[var(--text-muted)] transition-colors"
        >
          {emoji}
        </button>
        <input
          type="text" placeholder="Nome da reserva"
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--text-muted)] transition-colors font-semibold"
        />
      </div>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmojis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { setEmoji(e); setShowEmojis(false) }}
                  className={cn('w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all hover:bg-[var(--bg-overlay)]', emoji === e && 'bg-[var(--bg-overlay)] ring-1 ring-[var(--text-muted)]')}
                >
                  {e}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color swatches */}
      <div className="flex gap-2 flex-wrap">
        {COLORS.map(c => (
          <button
            key={c.id}
            onClick={() => setColor(c.id)}
            className={cn('w-7 h-7 rounded-full transition-all', c.bg, color === c.id && `ring-2 ring-offset-2 ring-offset-[var(--bg-overlay)] ${c.ring}`)}
          />
        ))}
      </div>

      {/* Target (optional) */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] focus-within:border-[var(--text-muted)] transition-colors">
        <Target size={14} className="text-[var(--text-muted)] shrink-0" />
        <span className="text-sm text-[var(--text-muted)] font-medium shrink-0">Meta R$</span>
        <input
          type="text" inputMode="numeric" placeholder="Opcional"
          value={target}
          onChange={e => setTarget(e.target.value.replace(/\D/g, ''))}
          className="flex-1 bg-transparent text-sm font-bold text-[var(--text-primary)] outline-none min-w-0"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
          Cancelar
        </button>
        <button
          onClick={handleCreate}
          disabled={isPending || !name.trim()}
          className={cn(
            'flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 transition-all',
            (isPending || !name.trim()) && 'opacity-50 cursor-not-allowed'
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

  const sorted = useMemo(
    () => [...reserves].sort((a, b) => b.balance - a.balance),
    [reserves]
  )

  const totalBalance = useMemo(
    () => reserves.reduce((s, r) => s + r.balance, 0),
    [reserves]
  )

  const totalTarget = useMemo(
    () => reserves.filter(r => r.target > 0).reduce((s, r) => s + r.target, 0),
    [reserves]
  )

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 pb-24 lg:pb-6 max-w-xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/aposentadoria')} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">Reservas</h1>
          <p className="text-sm text-[var(--text-muted)]">Seus fundos separados por objetivo</p>
        </div>
        <button
          onClick={() => setCreating(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
            creating
              ? 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
              : 'bg-blue-500 text-white hover:bg-blue-400'
          )}
        >
          <Plus size={15} />
          Nova
        </button>
      </div>

      {/* Total */}
      <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
              <Wallet size={12} /> Total em reservas
            </div>
            <p className="text-3xl font-black text-[var(--text-primary)] tabular-nums">
              {fmtBRL(totalBalance)}
            </p>
            {totalTarget > 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Meta total: {fmtBRL(totalTarget)} ({Math.round((totalBalance / totalTarget) * 100)}%)
              </p>
            )}
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-xs text-[var(--text-muted)]">{reserves.length} {reserves.length === 1 ? 'reserva' : 'reservas'}</p>
            {reserves.filter(r => r.target > 0 && r.balance >= r.target).length > 0 && (
              <p className="text-xs text-emerald-400 font-semibold">
                {reserves.filter(r => r.target > 0 && r.balance >= r.target).length} meta{reserves.filter(r => r.target > 0 && r.balance >= r.target).length > 1 ? 's' : ''} atingida{reserves.filter(r => r.target > 0 && r.balance >= r.target).length > 1 ? 's' : ''} ✓
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {creating && <CreateForm key="create" onDone={() => setCreating(false)} />}
      </AnimatePresence>

      {/* Reserve list */}
      {isLoading ? (
        <div className="text-center py-10 text-[var(--text-muted)] text-sm">Carregando...</div>
      ) : sorted.length === 0 && !creating ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="text-5xl">🏦</div>
          <div>
            <p className="text-base font-bold text-[var(--text-primary)] mb-1">Nenhuma reserva ainda</p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              Crie reservas separadas para cada objetivo: emergência, viagem, carro, imóvel...
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 transition-all"
          >
            Criar primeira reserva
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(r => <ReserveCard key={r.id} reserve={r} />)}
        </div>
      )}
    </div>
  )
}
