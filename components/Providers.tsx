'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '@/lib/context/AuthContext'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Only retry once — avoids long loading states when Firestore queries fail
        retry: 1,
        // Data is fresh for 5s by default (hooks can override)
        staleTime: 5_000,
        // Refetch on reconnect so data stays fresh after offline
        refetchOnWindowFocus: false,
      },
    },
  })
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}
