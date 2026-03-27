'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Calendar, RefreshCcw, CheckCircle2 } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { useEvents } from '@/lib/hooks/useEvents'
import { useHabitsToday } from '@/lib/hooks/useHabits'
import { useTasksToday } from '@/lib/hooks/useTasks'
import { format, parse, isAfter, isBefore, addMinutes, subMinutes } from 'date-fns'
import { cn } from '@/lib/utils/cn'

interface Notification {
  id: string
  title: string
  body: string
  type: 'agenda' | 'habits' | 'drafts'
  time: string
}

export function NotificationSystem() {
  const { data: settings } = useSettings()
  const { data: events } = useEvents()
  const { data: habits } = useHabitsToday(new Date())
  const { data: tasks } = useTasksToday(new Date())
  
  const [activeNotifications, setActiveNotifications] = useState<Notification[]>([])
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set())

  const playSound = useCallback(() => {
    if (settings?.notifications?.sound === 'apple') {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') // Simple pleasant ping
      audio.volume = 0.4
      audio.play().catch(e => console.log('Audio play blocked:', e))
    }
  }, [settings?.notifications?.sound])

  const notify = useCallback((item: Notification) => {
    if (notifiedIds.has(item.id)) return
    
    setActiveNotifications(prev => [...prev, item])
    setNotifiedIds(prev => new Set(prev).add(item.id))
    playSound()

    // Auto-remove after 6 seconds
    setTimeout(() => {
      setActiveNotifications(prev => prev.filter(n => n.id !== item.id))
    }, 6000)
  }, [notifiedIds, playSound])

  useEffect(() => {
    if (!settings?.notifications?.enabled) return

    const checkNotifications = () => {
      const now = new Date()
      const leadTime = settings.notifications.leadTimeMinutes || 5

      // 1. Check Agenda
      if (settings.notifications.agenda && events) {
        events.forEach(event => {
          if (event.status !== 'todo' || !event.time) return
          const eventTime = parse(event.time, 'HH:mm', now)
          const notifyTime = subMinutes(eventTime, leadTime)
          
          if (isAfter(now, notifyTime) && isBefore(now, addMinutes(notifyTime, 2))) {
            notify({
              id: `agenda-${event.id}`,
              title: event.title,
              body: `Compromisso em ${leadTime} minutos`,
              type: 'agenda',
              time: event.time
            })
          }
        })
      }

      // 2. Check Habits
      if (settings.notifications.habits && habits) {
        habits.forEach(habit => {
          if (habit.status !== 'none' || !habit.time) return
          const habitTime = parse(habit.time, 'HH:mm', now)
          const notifyTime = subMinutes(habitTime, leadTime)

          if (isAfter(now, notifyTime) && isBefore(now, addMinutes(notifyTime, 2))) {
            notify({
              id: `habit-${habit.id}`,
              title: habit.name,
              body: `Hora do seu hábito (${habit.time})`,
              type: 'habits',
              time: habit.time
            })
          }
        })
      }
    }

    const interval = setInterval(checkNotifications, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [settings, events, habits, notify])

  return (
    <div className="fixed top-6 right-6 z-[2000] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {activeNotifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="pointer-events-auto w-80 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[24px] p-4 flex items-start gap-4 shadow-2xl relative overflow-hidden group"
          >
            {/* Apple Glossy Effect */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full -mr-12 -mt-12" />
            
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              notif.type === 'agenda' ? "bg-red-600/20 text-red-400" :
              notif.type === 'habits' ? "bg-orange-600/20 text-orange-400" :
              "bg-red-500/20 text-red-400"
            )}>
              {notif.type === 'agenda' && <Calendar size={20} />}
              {notif.type === 'habits' && <RefreshCcw size={20} />}
              {notif.type === 'drafts' && <CheckCircle2 size={20} />}
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <h4 className="font-bold text-sm text-white truncate">{notif.title}</h4>
              <p className="text-xs text-white/50 line-clamp-2 mt-0.5">{notif.body}</p>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-2 block italic">{notif.time}</span>
            </div>

            <button 
              onClick={() => setActiveNotifications(prev => prev.filter(n => n.id !== notif.id))}
              className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
            
            <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full">
               <motion.div 
                 initial={{ width: '100%' }}
                 animate={{ width: 0 }}
                 transition={{ duration: 6, ease: 'linear' }}
                 className="h-full bg-white/30"
               />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
