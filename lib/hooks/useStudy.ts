'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/firebase/config'
import { useCurrentUser } from '@/lib/context/AuthContext'
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc,
} from 'firebase/firestore'
import { StudyEntry } from '@/types'

export function useStudyEntries() {
  const user = useCurrentUser()
  return useQuery({
    queryKey: ['study_entries', user?.uid],
    queryFn: async () => {
      if (!user) return []
      const q = query(collection(db, 'study_entries'), where('user_id', '==', user.uid))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as StudyEntry[]
    },
    enabled: !!user,
    staleTime: 30_000,
  })
}

export function useUpsertStudyEntry() {
  const qc = useQueryClient()
  const user = useCurrentUser()
  return useMutation({
    mutationFn: async ({
      id, date, content, subjects,
    }: {
      id?: string
      date: string
      content: string
      subjects?: string[]
    }) => {
      if (!user) throw new Error('Not authenticated')
      const now = new Date().toISOString()
      if (id) {
        await updateDoc(doc(db, 'study_entries', id), {
          content,
          subjects: subjects ?? [],
          updated_at: now,
        })
        return id
      } else {
        const ref = await addDoc(collection(db, 'study_entries'), {
          user_id: user.uid,
          date,
          content,
          subjects: subjects ?? [],
          created_at: now,
          updated_at: now,
        })
        return ref.id
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study_entries', user?.uid] }),
  })
}
