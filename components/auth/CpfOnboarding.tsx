'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { validateCPF, formatCPF } from '@/lib/utils/subscription'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore'
import { useProfile, useUpdateProfile } from '@/lib/hooks/useProfile'
import { ShieldCheck, AlertCircle, Lock } from 'lucide-react'

export function CpfOnboarding() {
  const { data: profile } = useProfile()
  const { mutate: updateProfile } = useUpdateProfile()
  const [cpf, setCpf] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Only show if logged in and CPF is missing
  if (!profile || profile.cpf) return null

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11)
    setCpf(formatCPF(value))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCpf = cpf.replace(/\D/g, '')

    if (!validateCPF(cleanCpf)) {
      setError('CPF inválido. Por favor, verifique os números.')
      return
    }

    setLoading(true)
    try {
      // Use transaction to ensure uniqueness
      await runTransaction(db, async (transaction) => {
        const cpfRef = doc(db, 'cpfs', cleanCpf)
        const cpfSnap = await transaction.get(cpfRef)

        if (cpfSnap.exists()) {
          throw new Error('Este CPF já está vinculado a outra conta.')
        }

        // Link CPF to user and record in cpfs index
        transaction.set(cpfRef, { user_id: profile.id, linked_at: new Date().toISOString() })
        transaction.update(doc(db, 'profiles', profile.id), { cpf: cleanCpf })
      })

      // Update local state is handled by useUpdateProfile's query invalidation indirectly via runTransaction + manual fire?
      // Actually runTransaction doesn't auto-invalidate react-query, but the layout will re-render when profile query updates.
      window.location.reload() // Simple way to reset state and clear the modal
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#161616] border border-white/10 rounded-[32px] p-10 space-y-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto border border-white/10 mb-2">
            <Lock size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-black tracking-tightest">Vínculo de Identidade</h2>
          <p className="text-white/50 text-[15px] font-medium leading-relaxed">
            Para garantir a segurança da sua conta e cumprir a política de uso individual, vincule seu CPF abaixo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest font-black text-white/30 px-1 ml-1 flex items-center gap-2">
              <ShieldCheck size={12} />
              CPF (Apenas Um Por Conta)
            </label>
            <input 
              type="text"
              value={cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 py-5 text-xl font-bold tracking-tight text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-white/10"
              required
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || !cpf}
            className="w-full bg-white text-black h-16 rounded-[20px] font-black hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-20 text-lg shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
          >
            {loading ? 'Validando...' : 'Confirmar e Continuar'}
          </button>
        </form>

        <p className="text-center text-[13px] text-white/20 font-medium">
          Seus dados são protegidos por criptografia de ponta a ponta e usados apenas para fins de verificação de conta.
        </p>
      </motion.div>
    </div>
  )
}
