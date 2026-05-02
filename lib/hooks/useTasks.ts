import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { useCurrentUser } from '@/lib/context/AuthContext'
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
  const user = useCurrentUser()

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

      // Filter tasks for the selected day:
      // - due_date === today → always show (the task belongs to this day)
      // - due_date in the past → show only if not yet completed (overdue)
      // - due_date in the future → never show
      // - no due_date → show only if pending (not done/partial/failed)
      const isCompleted = (t: any) => t.status === 'done' || t.status === 'partial' || t.status === 'failed'
      const filtered = tasks.filter(t => {
        if (!t.due_date) return !isCompleted(t)           // inbox: só pendentes
        if (t.due_date === targetDay) return true          // hoje: sempre mostra
        if (t.due_date < targetDay) return !isCompleted(t) // atrasado: só se pendente
        return false                                        // futuro: nunca mostra
      }) as Task[]
      
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
  const user = useCurrentUser()

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
  const user = useCurrentUser()

  return useMutation<void, unknown, Partial<Task> & { id: string }>({
    onMutate: async (vars) => {
      if (!user) return
      const allKeys = qc.getQueriesData<Task[]>({ queryKey: ['tasks'] })
      await qc.cancelQueries({ queryKey: ['tasks'] })
      allKeys.forEach(([key]) => {
        qc.setQueryData(key, (old: Task[] | undefined) => {
          if (!old) return old
          return old.map(t => t.id === vars.id
            ? { ...t, ...vars, done: vars.status === 'done' }
            : t
          )
        })
      })
      return { allKeys }
    },
    onError: (_err, _vars, context: any) => {
      context?.allKeys?.forEach(([key, data]: [unknown, unknown]) => qc.setQueryData(key as any, data))
    },
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      if (!user) throw new Error('Not authenticated')

      const taskRef = doc(db, 'tasks', id)

      const cleanUpdates: any = {}
      if (updates.status !== undefined) cleanUpdates.status = updates.status
      if (updates.completed_at !== undefined) cleanUpdates.completed_at = updates.completed_at || null
      if (updates.title !== undefined) cleanUpdates.title = updates.title
      if (updates.emoji !== undefined) cleanUpdates.emoji = updates.emoji
      if (updates.description !== undefined) cleanUpdates.description = updates.description
      if (updates.priority !== undefined) cleanUpdates.priority = updates.priority
      if (updates.due_date !== undefined) cleanUpdates.due_date = updates.due_date
      if (updates.due_time !== undefined) cleanUpdates.due_time = updates.due_time
      if (updates.goal_id !== undefined) cleanUpdates.goal_id = updates.goal_id
      if (updates.done !== undefined) cleanUpdates.done = updates.done

      await updateDoc(taskRef, { ...cleanUpdates, updated_at: Timestamp.now() })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}
export function useDeleteTask() {
  const qc = useQueryClient()
  const user = useCurrentUser()

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
  const user = useCurrentUser()

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
