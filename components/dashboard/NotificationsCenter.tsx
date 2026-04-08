'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Trash2, Calendar, RefreshCcw, Brain, Info, Check } from 'lucide-react'
import { useNotifications, useDeleteNotification, useClearAllNotifications, useMarkAsRead } from '@/lib/hooks/useNotifications'
import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'

interface NotificationsCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsCenter({ isOpen, onClose }: NotificationsCenterProps) {
  const { data: notifications, isLoading } = useNotifications()
  const { mutate: deleteNotif } = useDeleteNotification()
  const { mutate: markRead } = useMarkAsRead()
  const { mutate: clearAll } = useClearAllNotifications()

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  const todayNotifs = notifications?.filter(n => isToday(new Date(n.created_at))) || []
  const olderNotifs = notifications?.filter(n => !isToday(new Date(n.created_at))) || []

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'agenda': return { icon: Calendar, color: 'text-red-400', bg: 'bg-red-400/10' }
      case 'habit': return { icon: RefreshCcw, color: 'text-orange-400', bg: 'bg-orange-400/10' }
      case 'insight': return { icon: Brain, color: 'text-blue-400', bg: 'bg-blue-400/10' }
      default: return { icon: Info, color: 'text-gray-400', bg: 'bg-gray-400/10' }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full md:w-[400px] bg-[var(--bg-primary)]/80 backdrop-blur-3xl border-l border-white/[0.08] z-[2001] flex flex-col shadow-2xl"
          >
            {/* Glossy top detail */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 pt-8 border-b border-white/[0.05] relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--bg-overlay)] border border-white/10 flex items-center justify-center text-[var(--text-primary)]">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Notificações</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-0.5">
                    {unreadCount > 0 ? `${unreadCount} novas mensagens` : 'Centro de Insights'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-4">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-xs text-[var(--text-muted)] font-medium">Sincronizando insights...</p>
                </div>
              ) : notifications?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-30">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                     <Bell size={32} />
                  </div>
                  <h3 className="text-lg font-bold">Tudo limpo por aqui</h3>
                  <p className="text-sm mt-2 max-w-[200px]">Sua caixa está vazia. Novos insights aparecerão aqui.</p>
                </div>
              ) : (
                <>
                  {/* Today Section */}
                  {todayNotifs.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Hoje</h3>
                        <button 
                          onClick={() => clearAll(notifications?.map(n => n.id) || [])}
                          className="text-[10px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors"
                        >
                          Limpar tudo
                        </button>
                      </div>
                      <div className="grid gap-3">
                        {todayNotifs.map(n => (
                          <NotificationItem 
                            key={n.id} 
                            notif={n} 
                            onDelete={() => deleteNotif(n.id)} 
                            onMarkRead={() => markRead(n.id)}
                            styles={getTypeStyles(n.type)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Older Section */}
                  {olderNotifs.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Anteriores</h3>
                      <div className="grid gap-3">
                        {olderNotifs.map(n => (
                          <NotificationItem 
                            key={n.id} 
                            notif={n} 
                            onDelete={() => deleteNotif(n.id)} 
                            onMarkRead={() => markRead(n.id)}
                            styles={getTypeStyles(n.type)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/[0.05] bg-black/20">
               <p className="text-[10px] text-center text-[var(--text-muted)] font-medium italic">
                 Dica: Insights da IA ajudam a manter sua consistência diária.
               </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function NotificationItem({ notif, onDelete, onMarkRead, styles }: any) {
  const Icon = styles.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onClick={() => !notif.is_read && onMarkRead()}
      className={cn(
        "group relative p-4 rounded-2xl border transition-all cursor-pointer",
        notif.is_read 
          ? "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]" 
          : "bg-white/[0.05] border-white/10 hover:bg-white/[0.08] shadow-lg shadow-black/20"
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", styles.bg, styles.color)}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={cn("font-bold text-sm truncate", notif.is_read ? "text-[var(--text-secondary)]" : "text-white")}>
              {notif.title}
            </h4>
            {!notif.is_read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">
            {notif.body}
          </p>
          <span className="text-[9px] font-bold text-white/10 mt-3 block uppercase tracking-widest">
            {format(new Date(notif.created_at), 'HH:mm • dd MMM', { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}
