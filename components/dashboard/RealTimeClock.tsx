'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR, enUS } from 'date-fns/locale'
import { useSettings } from '@/lib/hooks/useSettings'
import { useProfile } from '@/lib/hooks/useProfile'

export function RealTimeClock() {
  const { data: settings } = useSettings()
  const { data: profile } = useProfile()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Mapeamento de fusos amigáveis para IANA
  const tzMap: Record<string, string> = {
    'Brasília (GMT-3)': 'America/Sao_Paulo',
    'Lisboa (GMT+0)': 'Europe/Lisbon',
    'New York (GMT-5)': 'America/New_York'
  }

  const selectedTz = tzMap[profile?.timezone || 'Brasília (GMT-3)'] || 'America/Sao_Paulo'
  const selectedLang = profile?.language === 'English' ? 'en-US' : profile?.language === 'Español' ? 'es-ES' : 'pt-BR'

  return (
    <div className="flex flex-col items-end">
      <span className="text-[32px] font-black tracking-tighter tabular-nums leading-none text-[var(--text-primary)]">
        {time.toLocaleTimeString(selectedLang, { 
          timeZone: selectedTz,
          hour12: settings?.timeFormat === '12h',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}
      </span>
      <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1">
        {time.toLocaleDateString(selectedLang, { 
          timeZone: selectedTz,
          weekday: 'long'
        }).toUpperCase()} • {time.toLocaleDateString(selectedLang, { 
          timeZone: selectedTz,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })}
      </span>
    </div>
  )
}
