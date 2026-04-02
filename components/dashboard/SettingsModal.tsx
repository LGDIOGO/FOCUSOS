'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Settings, Tag, User, Bell, Shield, Moon, Trash2, Plus, 
  ChevronRight, Sparkles, Check, Info, BookOpen, Play
} from 'lucide-react'
import { TutorialModal } from '@/components/dashboard/TutorialModal'
import { useCategories, useAddCategory, useDeleteCategory } from '@/lib/hooks/useCategories'
import { useSettings, useUpdateSettings } from '@/lib/hooks/useSettings'
import { useProfile, useUpdateProfile } from '@/lib/hooks/useProfile'
import { EmojiPicker } from '@/components/dashboard/EmojiPicker'
import { cn } from '@/lib/utils/cn'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'categories' | 'notifications' | 'profile' | 'system' | 'tutorials'

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('categories')
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false)
  const { data: categories, isLoading } = useCategories()
  const { data: settings } = useSettings()
  const { data: profile } = useProfile()
  const updateSettings = useUpdateSettings()
  const updateProfile = useUpdateProfile()
  const addCategory = useAddCategory()
  const deleteCategory = useDeleteCategory()

  const [newCat, setNewCat] = useState({ name: '', icon: '🏷️', color: '#0A84FF', type: 'habits' as any })
  const [showAddForm, setShowAddForm] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)

  const handleAddCategory = () => {
    if (!newCat.name) return
    addCategory.mutate(newCat, {
      onSuccess: () => {
        setNewCat({ name: '', icon: '🏷️', color: '#0A84FF', type: newCat.type })
        setShowAddForm(false)
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-[var(--bg-workspace)] border border-[var(--border-subtle)] rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] max-h-[800px]"
      >
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 border-r border-white/5 bg-white/[0.02] p-6 flex flex-col gap-8">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-[var(--bg-overlay)] rounded-xl flex items-center justify-center border border-[var(--border-subtle)]">
              <Settings className="text-[var(--text-primary)] w-5 h-5" />
            </div>
            <h2 className="text-xl font-black tracking-tightest text-[var(--text-primary)]">Ajustes</h2>
          </div>

          <nav className="flex flex-col gap-1.5">
            {[
              { id: 'categories', label: 'Categorias', icon: Tag },
              { id: 'notifications', label: 'Notificações', icon: Bell },
              { id: 'profile', label: 'Meu Perfil', icon: User },
              { id: 'system', label: 'Sistema', icon: Shield },
              { id: 'tutorials', label: 'Tutoriais & Guias', icon: BookOpen },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm",
                  activeTab === tab.id 
                    ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg" 
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4 bg-white/5 rounded-[24px] border border-white/5 transition-all">
             <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Seu Plano</p>
             <div className={cn(
               "flex items-center gap-2",
               profile?.is_paid ? "text-red-500" : "text-white/30"
             )}>
               <Shield size={14} />
               <span className="text-xs font-bold uppercase tracking-tight">
                 {profile?.is_paid 
                   ? `FocusOS (${profile?.subscription_plan || 'Pro'})` 
                   : 'Focus OS Free'}
               </span>
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 md:p-8 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <h3 className="text-2xl font-black tracking-tightest text-[var(--text-primary)]">
              {activeTab === 'categories' && 'Gestão de Categorias'}
              {activeTab === 'notifications' && 'Avisos e Lembretes'}
              {activeTab === 'profile' && 'Perfil do Usuário'}
              {activeTab === 'system' && 'Preferências do Sistema'}
              {activeTab === 'tutorials' && 'Tutoriais & Guias'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-overlay)] rounded-xl transition-all">
              <X className="text-[var(--text-muted)]" size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            {activeTab === 'categories' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/50 font-medium max-w-sm">
                    Personalize suas etiquetas para organizar melhor seus hábitos, compromissos e metas estratégicas.
                  </p>
                  <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-white text-black px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-neutral-200 transition-all"
                  >
                    {showAddForm ? <X size={14} /> : <Plus size={14} />}
                    {showAddForm ? 'Cancelar' : 'Nova Categoria'}
                  </button>
                </div>

                <AnimatePresence>
                  {showAddForm && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Nome</label>
                            <input 
                              value={newCat.name}
                              onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-red-500/50 transition-all"
                              placeholder="Ex: Treino, Trabalho..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Tipo de Aplicação</label>
                            <div className="flex gap-2">
                              {['habits', 'agenda', 'goals'].map((type) => (
                                <button
                                  key={type}
                                  onClick={() => setNewCat({ ...newCat, type: type as any })}
                                  className={cn(
                                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                    newCat.type === type ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/5"
                                  )}
                                >
                                  {type === 'habits' ? 'Hábitos' : type === 'agenda' ? 'Agenda' : 'Metas'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Ícone</label>
                            <EmojiPicker value={newCat.icon} onChange={icon => setNewCat({ ...newCat, icon })} />
                          </div>
                          <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Cor de Destaque</label>
                            <div className="flex gap-3">
                              {['#0A84FF', '#32D74B', '#FFD60A', '#FF9F0A', '#FF453A', '#BF5AF2'].map(color => (
                                <button
                                  key={color}
                                  onClick={() => setNewCat({ ...newCat, color })}
                                  className={cn(
                                    "w-8 h-8 rounded-full border-2 transition-all",
                                    newCat.color === color ? "border-white scale-110 shadow-lg" : "border-transparent opacity-40 hover:opacity-100"
                                  )}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                         <button 
                          onClick={handleAddCategory}
                          className="w-full bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-500 transition-all active:scale-95 shadow-xl shadow-red-500/10"
                        >
                          Salvar Categoria
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isLoading ? (
                    [1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/5 rounded-3xl animate-pulse" />)
                  ) : categories?.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[32px]">
                      <p className="text-white/20 font-bold">Nenhuma categoria criada ainda.</p>
                    </div>
                  ) : categories?.map(cat => (
                    <div 
                      key={cat.id}
                      className="group flex items-center gap-4 p-5 bg-white/[0.03] border border-white/10 rounded-[28px] hover:bg-white/[0.05] transition-all"
                    >
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner"
                        style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                      >
                        {cat.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white">{cat.name}</h4>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20">
                          {cat.type === 'habits' ? 'Hábitos' : cat.type === 'agenda' ? 'Agenda' : 'Metas'}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          if (confirm('Excluir esta categoria?')) deleteCategory.mutate(cat.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-3 text-white/20 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-8 max-w-2xl">
                <div className="bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-bold">Ativar Notificações</h4>
                      <p className="text-sm text-white/40 font-medium">Receber avisos sonoros e visuais no FocusOS.</p>
                    </div>
                      <button 
                        onClick={() => updateSettings.mutate({ 
                          notifications: { ...settings?.notifications!, enabled: !settings?.notifications?.enabled } 
                        })}
                        className={cn(
                          "w-14 h-8 rounded-full p-1 transition-all duration-300",
                          settings?.notifications?.enabled ? "bg-red-600" : "bg-white/10"
                        )}
                      >
                      <motion.div 
                        animate={{ x: settings?.notifications?.enabled ? 24 : 0 }}
                        className="w-6 h-6 bg-white rounded-full shadow-lg" 
                      />
                    </button>
                  </div>

                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'habits', label: 'Hábitos', sub: 'Lembretes diários' },
                        { id: 'agenda', label: 'Agenda', sub: 'Compromissos' },
                        { id: 'drafts', label: 'Rascunhos', sub: 'Tarefas rápidas' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => updateSettings.mutate({
                            notifications: { 
                              ...settings?.notifications!, 
                              [item.id]: !((settings?.notifications as any)?.[item.id]) 
                            }
                          })}
                          className={cn(
                            "flex flex-col gap-2 p-5 rounded-2xl border transition-all text-left",
                            (settings?.notifications as any)?.[item.id] 
                              ? "bg-white/5 border-white/20" 
                              : "bg-transparent border-white/5 opacity-40 hover:opacity-60"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            (settings?.notifications as any)?.[item.id] ? "bg-red-600/20 text-red-500" : "bg-white/5 text-white/20"
                          )}>
                             <Check size={14} className={cn("transition-opacity", (settings?.notifications as any)?.[item.id] ? "opacity-100" : "opacity-0")} />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{item.label}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-black leading-tight">{item.sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Antecedência Padrão</label>
                          <div className="flex gap-2">
                             {[5, 15, 30].map((min) => (
                               <button
                                 key={min}
                                 onClick={() => updateSettings.mutate({
                                   notifications: { ...settings?.notifications!, leadTimeMinutes: min }
                                 })}
                                 className={cn(
                                   "flex-1 py-3 rounded-xl border font-bold text-sm transition-all",
                                   settings?.notifications?.leadTimeMinutes === min 
                                     ? "bg-white text-black border-white" 
                                     : "bg-white/5 text-white/40 border-white/5"
                                 )}
                               >
                                 {min} min
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Som de Alerta</label>
                          <div className="flex gap-2 relative">
                             {['focus', 'none'].map((s) => (
                               <button
                                 key={s}
                                 onClick={() => updateSettings.mutate({
                                   notifications: { ...settings?.notifications!, sound: s as any }
                                 })}
                                 className={cn(
                                   "flex-1 h-12 rounded-xl border font-bold text-xs flex items-center justify-center transition-all capitalize",
                                   settings?.notifications?.sound === s 
                                     ? "bg-white text-black border-white" 
                                     : "bg-white/5 text-white/40 border-white/5"
                                 )}
                               >
                                 {s === 'focus' ? (
                                   <div className="flex items-center gap-2">
                                     <Bell size={14} className="text-red-500" />
                                     <span>Focus Style</span>
                                   </div>
                                 ) : 'Mudo'}
                               </button>
                             ))}
                             
                             {settings?.notifications?.sound === 'focus' && (
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation()
                                   const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
                                   audio.volume = 0.5
                                   audio.play()
                                 }}
                                 className="flex-shrink-0 w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-xl"
                                 title="Testar Som"
                               >
                                 <Play size={16} fill="currentColor" />
                               </button>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-500/5 border border-red-500/10 rounded-[28px] p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                     <Info className="text-red-400" size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-red-400">Dica de Notificações</h5>
                    <p className="text-sm text-white/50 leading-relaxed mt-1">
                      As notificações do FocusOS funcionam melhor quando o navegador está aberto. Certifique-se de permitir o envio de avisos quando solicitado.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-8 max-w-sm">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-4xl group relative overflow-hidden">
                    👤
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Plus className="text-white" size={24} />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">{profile?.full_name || 'Usuário Focus'}</h4>
                    <p className="text-sm text-white/40 font-medium">{profile?.email || 'focus@example.com'}</p>
                    <button className="mt-2 text-[10px] font-black uppercase tracking-widest text-blue-400">Alterar Foto</button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Fuso Horário</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-red-500/50 transition-all appearance-none cursor-pointer"
                      value={profile?.timezone || 'Brasília (GMT-3)'}
                      onChange={(e) => updateProfile.mutate({ timezone: e.target.value })}
                    >
                      <option className="bg-black text-white">Brasília (GMT-3)</option>
                      <option className="bg-black text-white">Lisboa (GMT+0)</option>
                      <option className="bg-black text-white">New York (GMT-5)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Meta Diária Padrão</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" min="50" max="95" step="5"
                        className="flex-1 accent-red-500 bg-white/5 h-2 rounded-full appearance-none cursor-pointer"
                        value={profile?.daily_goal || 80}
                        onChange={(e) => updateProfile.mutate({ daily_goal: parseInt(e.target.value) })}
                      />
                      <span className="text-sm font-black text-white min-w-[40px]">{profile?.daily_goal || 80}%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Idioma</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-red-500/50 transition-all appearance-none cursor-pointer"
                      value={profile?.language || 'Português'}
                      onChange={(e) => updateProfile.mutate({ language: e.target.value })}
                    >
                      <option className="bg-black text-white">Português</option>
                      <option className="bg-black text-white">English</option>
                      <option className="bg-black text-white">Español</option>
                    </select>
                  </div>

                  <div className="h-px bg-white/5 my-6" />

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Gerenciar Assinatura</h5>
                    <div className="grid grid-cols-1 gap-3">
                      {profile?.is_paid && (
                        <button 
                          className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-3 rounded-xl text-xs hover:bg-red-500 hover:text-white transition-all active:scale-95"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja cancelar seu plano? Para processamento imediato, entre em contato com o suporte.')) {
                              window.open('https://wa.me/seu_numero', '_blank')
                            }
                          }}
                        >
                          Cancelar meu plano
                        </button>
                      )}
                      <button 
                        disabled={isUpgrading}
                        onClick={() => window.location.href = '/plans'}
                        className="w-full bg-white text-black font-black py-4 rounded-xl text-xs hover:bg-neutral-200 transition-all active:scale-95 shadow-xl"
                      >
                        {isUpgrading ? 'Aguarde...' : 'Escolher meu plano'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-[32px] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-lg text-[var(--text-primary)]">Tema do Sistema</h4>
                      <p className="text-sm text-[var(--text-secondary)] font-medium">Modo claro disponível em breve.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] border border-[var(--border-subtle)] px-2 py-1 rounded-lg opacity-70">Em Breve</span>
                      <div className="w-14 h-8 rounded-full bg-red-600 p-1 relative opacity-50 cursor-not-allowed">
                        <div className="w-6 h-6 bg-white rounded-full shadow-lg translate-x-6" />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-[var(--border-subtle)]" />

                  <div className="flex items-center justify-between opacity-50 pointer-events-none">
                    <div>
                      <h4 className="font-black text-lg text-[var(--text-primary)]">Notificações Inteligentes</h4>
                      <p className="text-sm text-[var(--text-secondary)] font-medium">Gerenciadas na aba de Notificações.</p>
                    </div>
                    <div className="w-12 h-6 bg-red-600 rounded-full p-1 relative">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1" />
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-red-400/5 border border-red-400/10 rounded-[32px] flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-lg text-red-400">Zona de Perigo</h4>
                    <p className="text-sm text-white/30 font-medium">Limpar todo o histórico e reiniciar o seu FocusOS.</p>
                  </div>
                  <button className="px-6 py-3 bg-red-400 text-white font-black rounded-2xl hover:bg-red-500 transition-all text-xs">
                    Resetar Sistema
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'tutorials' && (
              <div className="space-y-6">
                 <div className="flex flex-col md:flex-row gap-6">
                    <div 
                      className="group relative flex-1 bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-white/5 hover:border-white/20 rounded-[32px] overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-[1.02]"
                      onClick={() => setIsTutorialModalOpen(true)}
                    >
                       <div className="h-40 w-full bg-white/5 relative flex items-center justify-center overflow-hidden">
                           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,0,0,0.1),rgba(0,0,0,0))]" />
                           <BookOpen size={48} className="text-white/20 group-hover:text-white/40 transition-colors" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                              <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl pl-1">
                                <Play size={20} className="fill-current" />
                              </div>
                           </div>
                       </div>
                       <div className="p-6">
                          <h4 className="text-lg font-black text-white group-hover:text-red-400 transition-colors">Guia Rápido: Onboarding</h4>
                          <p className="text-sm font-medium text-white/40 mt-1">Relembre as funcionalidades essenciais, arraste, status e modo de seleção do FocusOS.</p>
                       </div>
                    </div>
                    <div className="flex-1 border border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center p-8 text-center bg-white/[0.01]">
                       <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-4">
                         <Sparkles size={20} />
                       </div>
                       <h4 className="text-md font-bold text-white/60">Em Breve</h4>
                       <p className="text-xs text-white/30 font-medium mt-1">Mais guias e truques avançados estão sendo produzidos.</p>
                    </div>
                 </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
               <Info size={12} />
               FocusOS Build 2026.04.01
            </div>
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-white text-black font-black rounded-2xl hover:bg-neutral-200 transition-all active:scale-95 shadow-xl"
            >
              OK
            </button>
          </div>
        </div>
      </motion.div>

      <TutorialModal 
        isOpen={isTutorialModalOpen} 
        onClose={() => setIsTutorialModalOpen(false)} 
      />
    </div>
  )
}
