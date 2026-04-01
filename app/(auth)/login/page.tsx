'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase/config'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Login Error Code:', err.code)
      console.error('Login Error Message:', err.message)
      
      if (err.message.includes('API key')) {
        setError('Erro de Configuração: Verifique suas chaves do Firebase no .env.local')
      } else if (err.code === 'auth/user-not-found') {
        setError('Usuário não encontrado. Verifique o e-mail ou cadastre-se.')
      } else if (err.code === 'auth/wrong-password') {
        setError('Senha incorreta. Tente novamente.')
      } else {
        setError(`Erro de acesso (${err.code || 'unkn'}). Verifique seus dados.`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if profile exists, if not create it
      const profileRef = doc(db, 'profiles', user.uid)
      const profileSnap = await getDoc(profileRef)

      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          id: user.uid,
          full_name: user.displayName,
          email: user.email,
          avatar_url: user.photoURL,
          created_at: new Date().toISOString(),
        })
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[380px] space-y-10"
      >
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-white text-black mb-4 relative group overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            <div className="w-8 h-8 bg-black rounded-[8px] rotate-45 transition-transform group-hover:rotate-[135deg] duration-700" />
          </Link>
          <h1 className="text-4xl font-black tracking-tightest">Entrar</h1>
          <p className="text-white/40 text-[15px] font-medium leading-relaxed">Bem-vindo de volta ao seu centro de comando.</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all font-bold group"
          >
            <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-black text-[12px] font-black group-hover:scale-110 transition-transform">G</span>
            Acessar com Google Cloud
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[12px] uppercase tracking-widest font-black"><span className="bg-black px-4 text-white/60">ou e-mail</span></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[12px] uppercase tracking-widest font-black text-white/30 px-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                placeholder="seu@exemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] uppercase tracking-widest font-black text-white/30 px-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[#e02020] text-sm text-center font-bold bg-[#b80000]/10 py-3 rounded-xl border border-[#b80000]/20"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-50 text-[15px]"
            >
              {loading ? 'Acessando...' : 'Entrar no FocusOS'}
            </button>
          </form>
        </div>

        <p className="text-center text-[15px] text-white/40 font-medium">
          Ainda não tem conta?
          <Link href="/signup" className="ml-2 text-white hover:underline font-bold">
            Cadastre-se grátis
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
