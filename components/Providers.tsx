'use client'

import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '@/lib/context/AuthContext'

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error: any, query: any) => {
        console.error('[FocusOS] Firestore query error — key:', JSON.stringify(query.queryKey), '— error:', error?.code || error?.message || error)
      },
    }),
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 5_000,
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
