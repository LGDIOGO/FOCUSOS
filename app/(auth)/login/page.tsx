'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { LegalFooterLinks } from '@/components/legal/LegalShell'
import { useRouter } from 'next/navigation'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase/config'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { friendlyAuthError } from '@/lib/utils/authErrors'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Login Error Code:', err?.code)
      setError(friendlyAuthError(err) || null)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError(null)
    setInfo(null)
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
      console.error('Google Login Error Code:', err?.code)
      // '' = o usuário só fechou a janela do Google: não mostra erro
      setError(friendlyAuthError(err) || null)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setError(null)
    setInfo(null)
    if (!email.trim()) {
      setError('Digite seu e-mail acima e toque em "Esqueci minha senha" de novo.')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email.trim())
    } catch (err: any) {
      // Não revela se o e-mail existe: só mostra erro de rede/formato.
      if (err?.code === 'auth/invalid-email' || err?.code === 'auth/network-request-failed') {
        setError(friendlyAuthError(err))
        return
      }
    }
    setInfo('Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira também o spam.')
  }

  return (
    // min-h-dvh (não min-h-screen) e sem overflow-hidden: no Safari/Chrome mobile a barra
    // do navegador e o teclado diminuem a área visível, e a página precisa poder rolar
    // para o botão "Entrar" nunca ficar cortado.
    <div className="min-h-dvh bg-black flex items-center justify-center px-6 py-10 text-white overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[380px] space-y-8"
      >
        <div className="text-center space-y-3">
          <Link href="/" aria-label="Voltar para o início" className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-white text-black mb-2 relative group overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            <div className="w-7 h-7 bg-black rounded-[8px] rotate-45 transition-transform group-hover:rotate-[135deg] duration-700" />
          </Link>
          <h1 className="text-4xl font-black tracking-tightest">Entrar</h1>
          <p className="text-white/60 text-[15px] font-medium leading-relaxed">Bem-vindo de volta ao seu centro de comando.</p>
        </div>

        <div className="space-y-6">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 min-h-[56px] rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all font-bold group disabled:opacity-60"
          >
            <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-black text-[12px] font-black group-hover:scale-110 transition-transform">G</span>
            {googleLoading ? 'Abrindo o Google...' : 'Continuar com Google'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-black"><span className="bg-black px-4 text-white/60">ou e-mail</span></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="login-email" className="block text-xs uppercase tracking-widest font-black text-white/60 px-1">E-mail</label>
              <input
                id="login-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all"
                placeholder="seu@exemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="block text-xs uppercase tracking-widest font-black text-white/60 px-1">Senha</label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all"
                placeholder="••••••••"
                required
              />
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="min-h-[44px] px-1 text-sm font-semibold text-white/70 hover:text-white underline-offset-4 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[#ff6b6b] text-sm text-center font-bold bg-[#b80000]/10 py-3 px-3 rounded-xl border border-[#b80000]/20"
                >
                  {error}
                </motion.p>
              )}
              {info && (
                <motion.p
                  role="status"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-green-400 text-sm text-center font-bold bg-green-500/10 py-3 px-3 rounded-xl border border-green-500/20"
                >
                  {info}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-black min-h-[56px] rounded-2xl hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-50 text-[15px]"
            >
              {loading ? 'Entrando...' : 'Entrar no FocusOS'}
            </button>
          </form>
        </div>

        <p className="text-center text-[15px] text-white/60 font-medium">
          Ainda não tem conta?
          <Link href="/signup" className="ml-2 inline-block py-2 text-white hover:underline font-bold">
            Cadastre-se grátis
          </Link>
        </p>
        <LegalFooterLinks />
      </motion.div>
    </div>
  )
}
