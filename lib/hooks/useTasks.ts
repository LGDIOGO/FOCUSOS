import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  updateDoc, 
  doc, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore'
import { format } from 'date-fns'
import { Task } from '@/types'

export function useTasksToday(selectedDate: Date = new Date()) {
  const user = auth.currentUser

  return useQuery({
    queryKey: ['tasks', 'date', format(selectedDate, 'yyyy-MM-dd'), user?.uid],
    queryFn: async () => {
      if (!user) return []

      const targetDay = format(selectedDate, 'yyyy-MM-dd')
      
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('user_id', '==', user.uid)
      )
      
      const tasksSnap = await getDocs(tasksQuery)
      const tasks = tasksSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        done: d.data().status === 'done'
      })) as any[]

      // Filter by due_date in memory (Firestore OR is complex)
      const filtered = tasks.filter(t => !t.due_date || t.due_date === targetDay) as Task[]
      
      // Sort chronologically by due_time. Items without time go to the end.
      return filtered.sort((a, b) => {
        if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time)
        if (a.due_time) return -1
        if (b.due_time) return 1
        return 0
      })
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

export function useAddTask() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'done' | 'status'>) => {
      if (!user) throw new Error('Not authenticated')
      
      await addDoc(collection(db, 'tasks'), {
        ...task,
        user_id: user.uid,
        status: 'todo',
        done: false,
        created_at: new Date().toISOString()
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async ({ id, status, completed_at }: Partial<Task> & { id: string }) => {
      if (!user) throw new Error('Not authenticated')
      
      const taskRef = doc(db, 'tasks', id)
      await updateDoc(taskRef, {
        status,
        completed_at: completed_at || null,
        updated_at: Timestamp.now()
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}
export function useDeleteTask() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated')
      
      const taskRef = doc(db, 'tasks', id)
      const { deleteDoc } = await import('firebase/firestore')
      await deleteDoc(taskRef)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}
export function useTasks() {
  const user = auth.currentUser

  return useQuery({
    queryKey: ['tasks', 'all', user?.uid],
    queryFn: async () => {
      if (!user) return []

      const q = query(
        collection(db, 'tasks'),
        where('user_id', '==', user.uid)
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        done: d.data().status === 'done'
      })) as Task[]
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}
