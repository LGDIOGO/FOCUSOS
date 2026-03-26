'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles, Plus, Check, Loader2, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { auth, db } from '@/lib/firebase/config'
import { useQueryClient } from '@tanstack/react-query'
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { EmojiPicker } from '@/components/dashboard/EmojiPicker'
import { CustomDateTimePicker } from '@/components/dashboard/CustomDateTimePicker'

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

interface Message {
  role: 'user' | 'ai'
  content: string
  suggestions?: {
    habits: any[]
    events: any[]
    goals?: any[]
  }
  applied?: string[] // IDs of applied suggestions (e.g. 'habit-0', 'event-1', 'goal-2')
}

export default function AIChatOnboarding({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Olá! Sou o FocusOS Concierge. Vamos organizar sua rotina!\n\nComo é o seu dia a dia atualmente? (Horários, trabalho, exercícios...)' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingItem, setEditingItem] = useState<{ msgIndex: number; itemIndex: number; type: 'habit' | 'event'; data: any } | null>(null)
  const [removedSuggestions, setRemovedSuggestions] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const parseSuggestions = (text: string) => {
    if (!text) return { cleanText: '', suggestions: null }
    const match = text.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/)
    if (match) {
      try {
        const json = JSON.parse(match[1])
        return {
          cleanText: text.replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/, '').trim(),
          suggestions: json
        }
      } catch (e) {
        console.error('Failed to parse suggestions:', e)
      }
    }
    return { cleanText: text, suggestions: null }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const resp = await fetch('/api/ai/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      })

      const data = await resp.json()

      if (!resp.ok) {
        throw new Error(data.error || 'Falha na resposta do servidor')
      }

      const { cleanText, suggestions } = parseSuggestions(data.message)
      
      setMessages(prev => [...prev, { role: 'ai', content: cleanText || 'Desculpe, não entendi muito bem. Pode repetir?', suggestions: suggestions || undefined }])
    } catch (err: any) {
      console.error('AIChatOnboarding Error:', err)
      const errorMsg = err.message?.includes('API Key') 
        ? 'Chave de API não configurada corretamente.' 
        : 'Desculpe, tive um problema técnico. Vamos tentar novamente?'
      setMessages(prev => [...prev, { role: 'ai', content: errorMsg }])
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveSuggestion = (type: 'habit' | 'event', msgIndex: number, itemIndex: number) => {
    setRemovedSuggestions(prev => [...prev, `${msgIndex}-${type}-${itemIndex}`])
  }

  const handleUpdateItem = (field: string, value: any) => {
    if (!editingItem) return
    setEditingItem({
      ...editingItem,
      data: { ...editingItem.data, [field]: value }
    })
  }

  const toggleDay = (day: number) => {
    if (!editingItem) return
    const current = editingItem.data.recurrence?.days_of_week || []
    const next = current.includes(day) 
      ? current.filter((d: number) => d !== day)
      : [...current, day].sort()
    
    setEditingItem({
      ...editingItem,
      data: { 
        ...editingItem.data, 
        recurrence: { ...editingItem.data.recurrence, frequency: 'specific_days', days_of_week: next } 
      }
    })
  }

  const saveEditedItem = async () => {
    if (!editingItem) return
    const { msgIndex, itemIndex, type, data } = editingItem
    
    // Auto-apply if it's a new version
    await handleApplySuggestion(type, data, msgIndex, itemIndex)
    
    setMessages(prev => prev.map((msg, i) => {
      if (i === msgIndex && msg.suggestions) {
        const newSuggestions = { ...msg.suggestions }
        if (type === 'habit') {
          newSuggestions.habits[itemIndex] = data
        } else if (type === 'event') {
          newSuggestions.events[itemIndex] = data
        }
        return { ...msg, suggestions: newSuggestions }
      }
      return msg
    }))
    setEditingItem(null)
  }


  const handleApplySuggestion = async (type: 'habit' | 'event' | 'goal', item: any, msgIndex: number, itemIndex: number) => {
    const user = auth.currentUser
    if (!user) {
      alert('Você precisa estar logado para salvar itens.')
      return
    }

    const suggestionId = `${type}-${itemIndex}`
    console.log(`Applying ${type}:`, item)
    
    try {
      let docRef
      const msg = messages[msgIndex]
      const existingPersistentId = msg.applied?.find(aid => aid.split(':')[0] === suggestionId)
      const existingDocId = existingPersistentId?.split(':')[1]

      if (existingDocId) {
        // UPDATE existing document
        console.log(`Updating existing ${type}:`, existingDocId)
        let collectionName = type === 'habit' ? 'habits' : type === 'event' ? 'events' : 'goals'
        
        const ref = doc(db, collectionName, existingDocId)
        
        if (type === 'habit') {
          await updateDoc(ref, {
            name: item.name,
            emoji: item.emoji || '✨',
            description: item.description || '',
            time: item.time || '08:00',
            recurrence: item.recurrence || { frequency: 'daily', days_of_week: [0,1,2,3,4,5,6] },
            updated_at: new Date().toISOString()
          })
        } else if (type === 'event') {
          await updateDoc(ref, {
            title: item.title,
            emoji: item.emoji || '📅',
            description: item.description || '',
            time: item.time || '08:00',
            updated_at: new Date().toISOString()
          })
        } else if (type === 'goal') {
          await updateDoc(ref, {
            title: item.title,
            target_value: item.target_value,
            unit: item.unit || 'vezes',
            emoji: item.emoji || '🎯',
            description: item.description || '',
            color: item.color || '#0A84FF',
            priority: item.priority || 'medium',
            updated_at: new Date().toISOString()
          })
        }
      } else {
        // CREATE new document
        if (type === 'habit') {
          const habitData = {
            name: item.name || 'Novo Hábito',
            type: item.type || 'positive',
            emoji: item.emoji || '✨',
            description: item.description || '',
            time: item.time || '08:00',
            recurrence: item.recurrence || { frequency: 'daily', days_of_week: [0,1,2,3,4,5,6] },
            user_id: user.uid,
            start_date: format(new Date(), 'yyyy-MM-dd'),
            status: 'none',
            streak: 0,
            is_archived: false,
            created_at: new Date().toISOString()
          }
          docRef = await addDoc(collection(db, 'habits'), habitData)
        } else if (type === 'event') {
          const eventData = {
            title: item.title || 'Novo Evento',
            time: item.time || '08:00',
            type: item.type || 'task',
            emoji: item.emoji || '📅',
            description: item.description || '',
            user_id: user.uid,
            date: format(new Date(), 'yyyy-MM-dd'),
            created_at: new Date().toISOString()
          }
          docRef = await addDoc(collection(db, 'events'), eventData)
        } else if (type === 'goal') {
          const goalData = {
            title: item.title || 'Nova Meta',
            user_id: user.uid,
            emoji: item.emoji || '🎯',
            description: item.description || '',
            color: item.color || '#0A84FF',
            priority: item.priority || 'medium',
            status: 'active',
            current_value: 0,
            target_value: item.target_value || 100,
            initial_value: 0,
            progress_pct: 0,
            unit: item.unit || 'vezes',
            term: item.term || 'annual',
            start_date: format(new Date(), 'yyyy-MM-dd'),
            end_date: item.end_date || '2026-12-31',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          docRef = await addDoc(collection(db, 'goals'), goalData)
        }
        
        if (docRef) {
          console.log(`${type} saved with ID:`, docRef.id)
          const persistentId = `${suggestionId}:${docRef.id}`
          
          setMessages(prev => prev.map((msg, i) => {
            if (i === msgIndex) {
              const alreadyApplied = msg.applied || []
              if (!alreadyApplied.some(id => id.startsWith(suggestionId))) {
                return { ...msg, applied: [...alreadyApplied, persistentId] }
              }
            }
            return msg
          }))
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['scores'] })
    } catch (err: any) {
      console.error('FAILED TO SAVE TO FIREBASE:', err)
      alert(`Erro ao salvar: ${err.message}`)
    }
  }

  const handleUnapplySuggestion = async (type: 'habit' | 'event' | 'goal', msgIndex: number, itemIndex: number) => {
    const user = auth.currentUser
    if (!user) return

    const suggestionId = `${type}-${itemIndex}`
    const msg = messages[msgIndex]
    const persistentId = msg.applied?.find(id => id.startsWith(suggestionId))
    
    if (persistentId) {
      const docId = persistentId.split(':')[1]
      try {
        let collectionName = type === 'habit' ? 'habits' : type === 'event' ? 'events' : 'goals'
        
        await deleteDoc(doc(db, collectionName, docId))
        console.log(`Deleted ${type} from Firebase:`, docId)
      } catch (err) {
        console.error('Error deleting document:', err)
      }
    }
    
    setMessages(prev => prev.map((msg, i) => {
      if (i === msgIndex) {
        return { ...msg, applied: (msg.applied || []).filter(id => !id.startsWith(suggestionId)) }
      }
      return msg
    }))
    
    queryClient.invalidateQueries({ queryKey: ['habits'] })
    queryClient.invalidateQueries({ queryKey: ['events'] })
    queryClient.invalidateQueries({ queryKey: ['goals'] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['scores'] })
  }

  const formatMessageContent = (content: string) => {
    // Enhanced Markdown Parser for Headers, **bold** and bullet points
    const lines = content.split('\n')
    return lines.map((line, i) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return <div key={i} className="h-2" />
      
      const boldRegex = /\*\*(.*?)\*\*/g
      
      // Helper to process bold text within any line
      const processBold = (text: string) => {
        const parts = text.split(boldRegex)
        return parts.map((part, j) => (
          j % 2 === 1 ? <strong key={j} className="text-white font-black">{part}</strong> : part
        ))
      }

      // Headers
      if (trimmedLine.startsWith('### ')) {
        return <h3 key={i} className="text-sm font-black text-white/40 uppercase tracking-widest mt-6 mb-3 first:mt-0">{processBold(trimmedLine.substring(4))}</h3>
      }
      if (trimmedLine.startsWith('## ')) {
        return <h2 key={i} className="text-base font-black text-white/60 uppercase tracking-widest mt-6 mb-3 first:mt-0">{processBold(trimmedLine.substring(3))}</h2>
      }
      if (trimmedLine.startsWith('# ')) {
        return <h1 key={i} className="text-lg font-black text-white uppercase tracking-tight mt-6 mb-3 first:mt-0">{processBold(trimmedLine.substring(2))}</h1>
      }

      // Bullet points
      if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
        return (
          <div key={i} className="flex gap-2 mb-2 pl-2 group">
            <span className="text-white/40 mt-1.5 group-hover:text-white/60 transition-colors">•</span>
            <p className="flex-1 opacity-80 group-hover:opacity-100 transition-opacity leading-relaxed">{processBold(trimmedLine.substring(2))}</p>
          </div>
        )
      }

      return <p key={i} className={cn("mb-3 opacity-80 last:mb-0 leading-relaxed")}>{processBold(line)}</p>
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[80vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-lg tracking-tightest">Gemini Concierge</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Onboarding Inteligente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <X className="text-white/40" />
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col gap-3", msg.role === 'user' ? "items-end" : "items-start")}>
              <div className={cn(
                "max-w-[80%] p-4 rounded-[24px] text-sm md:text-base font-medium",
                msg.role === 'user' ? "bg-white text-black" : "bg-white/5 text-white/90 border border-white/10"
              )}>
                {formatMessageContent(msg.content)}
              </div>

              {msg.suggestions && (
                <div className="w-full space-y-3 mt-2">
                  {msg.suggestions.habits && msg.suggestions.habits.length > 0 && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 px-2 mt-4">Hábitos Recomendados:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {msg.suggestions.habits.map((h, idx) => {
                          const id = `${i}-habit-${idx}`
                          if (removedSuggestions.includes(id)) return null
                          const isApplied = msg.applied?.some(aid => aid.split(':')[0] === `habit-${idx}`)
                          
                          return (
                            <div key={id} className={cn(
                              "bg-white/[0.03] border p-4 rounded-2xl flex flex-col gap-3 group transition-all",
                              h.type === 'negative' ? "border-red-500/20 hover:border-red-500/40" : "border-white/10 hover:border-white/20"
                            )}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{h.emoji}</span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-sm text-white">{h.name}</p>
                                      {h.type === 'negative' && (
                                        <span className="text-[8px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Evitar</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-white/40">{h.time} • {h.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!isApplied && (
                                    <>
                                      <button 
                                        onClick={() => setEditingItem({ msgIndex: i, itemIndex: idx, type: 'habit', data: h })}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleRemoveSuggestion('habit', i, idx)}
                                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-white/40 hover:text-red-400"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                  <button 
                                    onClick={() => isApplied ? handleUnapplySuggestion('habit', i, idx) : handleApplySuggestion('habit', h, i, idx)}
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                      isApplied ? "bg-green-500 text-white hover:bg-red-500" : "bg-white text-black hover:scale-110"
                                    )}
                                  >
                                    {isApplied ? <Check size={16} /> : <Plus size={16} />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {msg.suggestions.events && msg.suggestions.events.length > 0 && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 px-2 mt-6">Compromissos da Agenda:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {msg.suggestions.events.map((e, idx) => {
                          const id = `${i}-event-${idx}`
                          if (removedSuggestions.includes(id)) return null
                          const isApplied = msg.applied?.some(aid => aid.split(':')[0] === `event-${idx}`)
                          
                          return (
                            <div key={id} className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl flex flex-col gap-3 group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{e.emoji}</span>
                                  <div>
                                    <p className="font-bold text-sm text-white">{e.title}</p>
                                    <p className="text-[10px] text-white/40">{e.time} • {e.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!isApplied && (
                                    <>
                                      <button 
                                        onClick={() => setEditingItem({ msgIndex: i, itemIndex: idx, type: 'event', data: e })}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleRemoveSuggestion('event', i, idx)}
                                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-white/40 hover:text-red-400"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                  <button 
                                    onClick={() => isApplied ? handleUnapplySuggestion('event', i, idx) : handleApplySuggestion('event', e, i, idx)}
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                      isApplied ? "bg-green-500 text-white hover:bg-red-500" : "bg-white text-black hover:scale-110"
                                    )}
                                  >
                                    {isApplied ? <Check size={16} /> : <Plus size={16} />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {msg.suggestions.goals && msg.suggestions.goals.length > 0 && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 px-2 mt-6">Metas Estratégicas Sugeridas:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {msg.suggestions.goals.map((g, idx) => {
                          const id = `${i}-goal-${idx}`
                          if (removedSuggestions.includes(id)) return null
                          const isApplied = msg.applied?.some(aid => aid.split(':')[0] === `goal-${idx}`)
                          
                          return (
                            <div key={id} className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl flex flex-col gap-3 group hover:border-white/30 transition-all border-dashed">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{g.emoji}</span>
                                  <div>
                                    <p className="font-bold text-sm text-white">{g.title}</p>
                                    <p className="text-[10px] text-white/40">Alvo: {g.target_value} {g.unit} • {g.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => isApplied ? handleUnapplySuggestion('goal', i, idx) : handleApplySuggestion('goal', g, i, idx)}
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                      isApplied ? "bg-blue-500 text-white hover:bg-red-500" : "bg-white text-black hover:scale-110"
                                    )}
                                  >
                                    {isApplied ? <Check size={16} /> : <Plus size={16} />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-white/40 text-xs px-2">
              <Loader2 className="animate-spin w-3 h-3" /> Gemini está pensando...
            </div>
          )}
        </div>

        {/* Edition Overlay */}
        <AnimatePresence>
          {editingItem && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="absolute inset-x-0 bottom-[108px] bg-[#0F0F0F] border-t border-white/10 p-6 z-20 space-y-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowLeft onClick={() => setEditingItem(null)} className="w-5 h-5 text-white/40 cursor-pointer hover:text-white" />
                  <h3 className="text-white font-bold">Personalizar Sugestão</h3>
                </div>
                <button 
                  onClick={saveEditedItem}
                  className="bg-white text-black px-4 py-1.5 rounded-full text-[10px] font-black hover:bg-neutral-200 transition-all uppercase tracking-tighter"
                >
                  Confirmar e Adicionar
                </button>
              </div>
              
              <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-black text-white/30 px-1">Nome / Título</p>
                    <input 
                      value={editingItem.type === 'habit' ? editingItem.data.name : editingItem.data.title}
                      onChange={(e) => handleUpdateItem(editingItem.type === 'habit' ? 'name' : 'title', e.target.value)}
                      placeholder="Ex: Meditação"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-white text-lg font-bold focus:outline-none focus:border-white/30 transition-all shadow-inner"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-black text-white/30 px-1">Personalização</p>
                    <div className="flex items-center gap-4">
                      <EmojiPicker 
                        value={editingItem.data.emoji || ''} 
                        onChange={emoji => handleUpdateItem('emoji', emoji)} 
                      />
                      <div className="flex-1">
                        <CustomDateTimePicker 
                          label="Horário" 
                          type="time" 
                          value={editingItem.data.time || '08:00'} 
                          onChange={val => handleUpdateItem('time', val)} 
                          align="right"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-widest font-black text-white/30 px-1">Frequência</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'daily', label: 'Diário' },
                      { id: 'weekly', label: 'Semanal' },
                      { id: 'monthly', label: 'Mensal' },
                      { id: 'specific_days', label: 'Personalizado' }
                    ].map(freq => (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => handleUpdateItem('recurrence', { 
                          ...editingItem.data.recurrence, 
                          frequency: freq.id,
                          days_of_week: freq.id === 'specific_days' ? (editingItem.data.recurrence?.days_of_week?.length > 0 ? editingItem.data.recurrence.days_of_week : [1,2,3,4,5]) : [0,1,2,3,4,5,6]
                        })}
                        className={cn(
                          "py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all",
                          editingItem.data.recurrence?.frequency === freq.id
                            ? "bg-white text-black border-white shadow-lg" 
                            : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                        )}
                      >
                        {freq.label}
                      </button>
                    ))}
                  </div>

                  {editingItem.data.recurrence?.frequency === 'specific_days' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 bg-white/[0.03] border border-white/10 p-5 rounded-[32px] mt-2"
                    >
                      <div className="flex justify-between gap-1">
                        {DAYS.map((day, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleDay(i)}
                            className={cn(
                              "w-10 h-10 rounded-xl font-black text-base transition-all flex items-center justify-center",
                              editingItem.data.recurrence?.days_of_week?.includes(i) 
                                ? "bg-white text-black shadow-lg" 
                                : "text-white/20 hover:bg-white/5 border border-white/5"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-black text-white/30 px-1">Descrição</p>
                  <textarea 
                    value={editingItem.data.description}
                    onChange={(e) => handleUpdateItem('description', e.target.value)}
                    placeholder="Adicionar detalhes..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-white text-sm focus:outline-none h-24 resize-none focus:border-white/30 transition-all font-medium"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-6 border-t border-white/5 bg-[#050505]">
          <div className="relative">
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Descreva sua rotina..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30 transition-all pr-14"
            />
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 top-2 bottom-2 w-10 bg-white text-black rounded-xl flex items-center justify-center hover:bg-neutral-200 transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
