import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Only return keys, NEVER values
  const keys = Object.keys(process.env).filter(k => 
    k.startsWith('NEXT_PUBLIC_') || k.startsWith('GOOGLE_') || k.includes('FIREBASE')
  )
  
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    defined_keys: keys,
    count: keys.length
  })
}
