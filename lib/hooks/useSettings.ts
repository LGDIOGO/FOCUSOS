import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { 
  doc, 
  getDoc, 
  setDoc,
  Timestamp 
} from 'firebase/firestore'
import { UserSettings } from '@/types'

const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'user_id' | 'updated_at'> = {
  timezone: 'America/Sao_Paulo',
  dateFormat: 'BR',
  timeFormat: '24h',
  notifications: {
    enabled: true,
    habits: true,
    agenda: true,
    drafts: true,
    leadTimeMinutes: 5,
    sound: 'apple'
  },
  theme: 'dark'
}

export function useSettings() {
  const user = auth.currentUser

  return useQuery({
    queryKey: ['settings', user?.uid],
    queryFn: async () => {
      if (!user) return null
      
      const settingsRef = doc(db, 'settings', user.uid)
      const snap = await getDoc(settingsRef)
      
      if (!snap.exists()) {
        const initial = {
          ...DEFAULT_SETTINGS,
          user_id: user.uid,
          updated_at: new Date().toISOString()
        }
        await setDoc(settingsRef, initial)
        return { id: user.uid, ...initial } as UserSettings
      }
      
      return { id: snap.id, ...snap.data() } as UserSettings
    },
    enabled: !!user,
    staleTime: Infinity, // Settings don't change often
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!user) throw new Error('Not authenticated')
      
      const settingsRef = doc(db, 'settings', user.uid)
      await setDoc(settingsRef, {
        ...updates,
        updated_at: new Date().toISOString()
      }, { merge: true })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', user?.uid] })
    },
  })
}
