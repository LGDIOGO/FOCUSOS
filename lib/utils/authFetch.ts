import { auth } from '@/lib/firebase/config'

/** fetch para as rotas /api do próprio app, com o ID token do usuário logado. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
