import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { onAuthStateChanged, User } from 'firebase/auth'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  setDoc,
  orderBy
} from 'firebase/firestore'
import { FinanceTransaction, FinanceRecurringCost, FinancePote, FinanceRoadmap } from '@/types'

function stripUndefinedFields<T extends Record<string, any>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as T
}

// --- Transactions --- //

export function useFinanceTransactions() {
  const [user, setUser] = useState<User | null>(auth.currentUser)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  return useQuery({
    queryKey: ['finance_transactions', user?.uid],
    queryFn: async () => {
      if (!user) return []

      const q = query(
        collection(db, 'finance_transactions'),
        where('user_id', '==', user.uid)
      )
      
      const snap = await getDocs(q)
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FinanceTransaction[]

      return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    },
    enabled: !!user,
  })
}

export function useAddFinanceTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<FinanceTransaction, 'id' | 'user_id' | 'created_at'>) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')
      
      await addDoc(collection(db, 'finance_transactions'), {
        ...stripUndefinedFields(data),
        user_id: user.uid,
        created_at: new Date().toISOString()
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_transactions'] })
    },
  })
}

export function useDeleteFinanceTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'finance_transactions', id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_transactions'] })
    },
  })
}

// --- Recurring Costs --- //

export function useFinanceRecurringCosts() {
  const [user, setUser] = useState<User | null>(auth.currentUser)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  return useQuery({
    queryKey: ['finance_recurring_costs', user?.uid],
    queryFn: async () => {
      if (!user) return []

      const q = query(
        collection(db, 'finance_recurring_costs'),
        where('user_id', '==', user.uid)
      )
      
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as FinanceRecurringCost[]
    },
    enabled: !!user,
  })
}

export function useAddFinanceRecurringCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<FinanceRecurringCost, 'id' | 'user_id' | 'created_at'>) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')
      
      await addDoc(collection(db, 'finance_recurring_costs'), {
        ...stripUndefinedFields(data),
        user_id: user.uid,
        created_at: new Date().toISOString()
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_recurring_costs'] })
    },
  })
}

export function useDeleteFinanceRecurringCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'finance_recurring_costs', id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_recurring_costs'] })
    },
  })
}

export function useUpdateFinanceRecurringCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FinanceRecurringCost> & { id: string }) => {
      await updateDoc(doc(db, 'finance_recurring_costs', id), stripUndefinedFields(updates))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_recurring_costs'] })
    },
  })
}

// --- Potes (Jars) --- //

export function useFinancePotes() {
  const [user, setUser] = useState<User | null>(auth.currentUser)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  return useQuery({
    queryKey: ['finance_potes', user?.uid],
    queryFn: async () => {
      if (!user) return []

      const q = query(
        collection(db, 'finance_potes'),
        where('user_id', '==', user.uid)
      )
      
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as FinancePote[]
    },
    enabled: !!user,
  })
}

export function useAddFinancePote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<FinancePote, 'id' | 'user_id' | 'created_at'>) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')
      
      await addDoc(collection(db, 'finance_potes'), {
        ...stripUndefinedFields(data),
        user_id: user.uid,
        created_at: new Date().toISOString()
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_potes'] })
    },
  })
}

export function useDeleteFinancePote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'finance_potes', id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_potes'] })
    },
  })
}

export function useUpdateFinancePote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FinancePote> & { id: string }) => {
      await updateDoc(doc(db, 'finance_potes', id), stripUndefinedFields(updates))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_potes'] })
    },
  })
}

// --- Roadmap AI --- //

export function useFinanceRoadmap() {
  const [user, setUser] = useState<User | null>(auth.currentUser)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  return useQuery({
    queryKey: ['finance_roadmap', user?.uid],
    queryFn: async () => {
      if (!user) return null

      const q = query(
        collection(db, 'finance_roadmap'),
        where('user_id', '==', user.uid)
      )
      
      const snap = await getDocs(q)
      if (snap.empty) return null
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as FinanceRoadmap
    },
    enabled: !!user,
  })
}

export function useUpdateFinanceRoadmap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (plan_json: string) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')
      
      // Upsert roadmap doc for the user
      const q = query(collection(db, 'finance_roadmap'), where('user_id', '==', user.uid))
      const snap = await getDocs(q)
      
      const updated_at = new Date().toISOString()
      
      if (snap.empty) {
        await addDoc(collection(db, 'finance_roadmap'), {
          user_id: user.uid,
          plan_json,
          updated_at
        })
      } else {
        const id = snap.docs[0].id
        await updateDoc(doc(db, 'finance_roadmap', id), {
          plan_json,
          updated_at
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_roadmap'] })
    },
  })
}
