'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR, enUS } from 'date-fns/locale'
import { useSettings } from '@/lib/hooks/useSettings'

export function RealTimeClock() {
  const { data: settings } = useSettings()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const locale = settings?.dateFormat === 'US' ? enUS : ptBR
  const timeFormat = settings?.timeFormat === '12h' ? 'hh:mm:ss a' : 'HH:mm:ss'
  const dateFormat = settings?.dateFormat === 'US' ? 'MM/dd/yyyy' : 'dd/MM/yyyy'

  // Timezone handling can be complex, for now we reflect the browser local time 
  // which matches "Horário de Brasília" if the user is in Brazil.
  // Advanced timezone logic can be added via date-fns-tz if needed.

  return (
    <div className="flex flex-col items-end">
      <span className="text-[32px] font-black tracking-tighter tabular-nums leading-none text-[var(--text-primary)]">
        {format(time, timeFormat)}
      </span>
      <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1">
        {format(time, "EEEE", { locale }).toUpperCase()} • {format(time, dateFormat)}
      </span>
    </div>
  )
}
