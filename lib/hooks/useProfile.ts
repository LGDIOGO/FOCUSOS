import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'

export interface UserProfile {
  id: string
  full_name: string
  email: string
  cpf?: string
  trial_started_at: string
  is_paid: boolean
  subscription_plan?: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual' | null
  subscription_expires_at?: string
  daily_goal?: number // 50-95
  timezone?: string
  language?: string
  created_at: string
}

export function useProfile() {
  const user = auth.currentUser

  return useQuery({
    queryKey: ['profile', user?.uid],
    queryFn: async () => {
      if (!user) return null
      const docRef = doc(db, 'profiles', user.uid)
      const snap = await getDoc(docRef)
      if (!snap.exists()) return null
      return snap.data() as UserProfile
    },
    enabled: !!user,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!user) throw new Error('Not authenticated')
      const docRef = doc(db, 'profiles', user.uid)
      await updateDoc(docRef, updates)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', user?.uid] })
    },
  })
}
