'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LegalFooterLinks } from '@/components/legal/LegalShell'
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase/config'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { validateCPF, formatCPF } from '@/lib/utils/subscription'
import { friendlyAuthError } from '@/lib/utils/authErrors'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let cleanCPF = ''
      if (cpf) {
        // 1. Validate CPF locally
        cleanCPF = cpf.replace(/\D/g, '')
        if (!validateCPF(cleanCPF)) {
          throw new Error('CPF inválido. Verifique os números.')
        }

        // 2. Check CPF uniqueness in Firestore. A coleção `cpfs` não tem regra de leitura
        // para quem ainda não está logado (e o cadastro roda antes do login), então a
        // consulta dá permission-denied. Não pode bloquear o cadastro: segue sem a checagem
        // (unicidade de CPF precisa de verificação no servidor; ver backlog).
        try {
          const cpfDoc = await getDoc(doc(db, 'cpfs', cleanCPF))
          if (cpfDoc.exists()) {
            throw new Error('Este CPF já está vinculado a outra conta.')
          }
        } catch (cpfErr: any) {
          if (!cpfErr?.code) throw cpfErr // erro nosso (CPF já usado): mostra
          // erro do Firestore (ex.: permission-denied): ignora e segue
        }
      }

      // 3. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const user = userCredential.user

      // Update name
      await updateProfile(user, { displayName: fullName })

      // 4. Create profile and lock CPF (if provided)
      const profileData: any = {
        id: user.uid,
        full_name: fullName,
        email: email,
        created_at: new Date().toISOString(),
        trial_started_at: new Date().toISOString(),
        is_paid: false,
        subscription_plan: null,
      }

      const promises = [
        setDoc(doc(db, 'profiles', user.uid), profileData)
      ]

      if (cleanCPF) {
        profileData.cpf = cleanCPF
        // O registro em `cpfs` não pode derrubar o cadastro (a coleção não tem regra de
        // escrita para o cliente): falha aqui é ignorada, o CPF fica no perfil.
        promises.push(
          setDoc(doc(db, 'cpfs', cleanCPF), {
            uid: user.uid,
            created_at: new Date().toISOString()
          }).catch(() => undefined) as Promise<void>
        )
      }

      await Promise.all(promises)

      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err: any) {
      console.error('Signup Error Code:', err?.code)
      if (err?.code?.startsWith?.('auth/')) {
        setError(friendlyAuthError(err) || null)
      } else if (err?.code) {
        setError('Não foi possível criar a conta agora. Tente novamente.')
      } else {
        setError(err?.message || 'Não foi possível criar a conta agora. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    setError(null)
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      
      // 4. Create/Update profile safely
      const profileRef = doc(db, 'profiles', user.uid)
      const profileSnap = await getDoc(profileRef)
      
      const profileData: any = {
        id: user.uid,
        full_name: user.displayName,
        email: user.email,
        avatar_url: user.photoURL,
        updated_at: new Date().toISOString(),
      }

      // Only set trial_started_at if this is a NEW user or field is missing
      if (!profileSnap.exists() || !profileSnap.data()?.trial_started_at) {
        profileData.trial_started_at = new Date().toISOString()
        profileData.is_paid = false
      }

      await setDoc(profileRef, profileData, { merge: true })

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Google Signup Error Code:', err?.code)
      // '' = o usuário só fechou a janela do Google: não mostra erro
      setError(friendlyAuthError(err) || null)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    // min-h-dvh e sem overflow-hidden: no Safari/Chrome mobile a barra do navegador e o
    // teclado reduzem a área visível; a página precisa rolar para o botão não ficar cortado.
    <div className="min-h-dvh bg-black flex items-center justify-center px-6 py-10 text-white overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[380px] space-y-8"
      >
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-white text-black mb-4 relative group overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            <div className="w-8 h-8 bg-black rounded-[8px] rotate-45 transition-transform group-hover:rotate-[135deg] duration-700" />
          </Link>
          <h1 className="text-4xl font-black tracking-tightest">Criar Conta</h1>
          <p className="text-white/60 text-[15px] font-medium leading-relaxed">Sua jornada rumo ao foco absoluto começa aqui.</p>
        </div>

        <div className="space-y-6">
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 min-h-[56px] rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all font-bold group disabled:opacity-60"
          >
            <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-black text-[12px] font-black group-hover:scale-110 transition-transform">G</span>
            {googleLoading ? 'Abrindo o Google...' : 'Continuar com Google'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[12px] uppercase tracking-widest font-black"><span className="bg-black px-4 text-white/60">ou e-mail</span></div>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="signup-name" className="block text-xs uppercase tracking-widest font-black text-white/60 px-1">Nome Completo</label>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                placeholder="Seu Nome"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-cpf" className="block text-xs uppercase tracking-widest font-black text-white/60 px-1">CPF (opcional)</label>
              <input
                id="signup-cpf"
                name="cpf"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="next"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="signup-email" className="block text-xs uppercase tracking-widest font-black text-white/60 px-1">E-mail</label>
              <input
                id="signup-email"
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
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                placeholder="seu@exemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-password" className="block text-xs uppercase tracking-widest font-black text-white/60 px-1">Senha (mínimo 6 caracteres)</label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                enterKeyHint="go"
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
              {success && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-green-400 text-xs text-center font-bold bg-green-500/10 py-3 rounded-xl border border-green-500/20"
                >
                  Conta criada! Verifique seu app.
                </motion.p>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-black min-h-[56px] rounded-2xl hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-50 text-[15px]"
            >
              {loading ? 'Criando...' : 'Criar minha conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-[15px] text-white/60 font-medium">
          Já tem conta?
          <Link href="/login" className="ml-2 inline-block py-2 text-white hover:underline font-bold">
            Entrar
          </Link>
        </p>
        <LegalFooterLinks />
      </motion.div>
    </div>
  )
}
