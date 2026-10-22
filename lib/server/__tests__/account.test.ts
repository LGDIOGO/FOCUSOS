import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

let authUid: string | null = 'u1'
vi.mock('@/app/api/v1/_auth', () => ({ authWithFirebaseToken: async () => authUid }))

import { handleExport, handleDelete, DELETE_RATE_LIMIT, EXPORT_RATE_LIMIT } from '../accountHandlers'
import { resetRateLimits } from '../rateLimit'
import {
  USER_COLLECTIONS,
  USER_DOC_COLLECTIONS,
  USER_UID_FIELD_COLLECTIONS,
  DELETE_BATCH_SIZE,
  type AdminLike,
} from '../userData'

type Row = { id: string; [k: string]: any }

/** Firestore falso em memória que registra a ordem das operações. */
function makeAdmin(store: Record<string, Row[]>, opts: { failCollection?: string } = {}) {
  const ops: string[] = []
  const batches: number[] = []
  const rm = (col: string, id: string) => {
    store[col] = (store[col] || []).filter((r) => r.id !== id)
  }
  const admin: AdminLike = {
    db: {
      collection(name: string) {
        return {
          where(field: string, _op: '==', value: string) {
            return {
              async get() {
                if (opts.failCollection === name) throw new Error('boom')
                const rows = (store[name] || []).filter((r) => r[field] === value)
                return {
                  docs: rows.map((r) => ({ id: r.id, data: () => { const { id, ...rest } = r; return rest }, ref: { col: name, id: r.id } })),
                }
              },
            }
          },
          doc(id: string) {
            return {
              async get() {
                const r = (store[name] || []).find((x) => x.id === id)
                return { exists: !!r, id, data: () => { const { id: _i, ...rest } = (r || {}) as Row; return rest } }
              },
              async delete() {
                ops.push(`delete:${name}`)
                rm(name, id)
              },
            }
          },
        }
      },
      batch() {
        const refs: any[] = []
        return {
          delete(ref: any) { refs.push(ref) },
          async commit() {
            batches.push(refs.length)
            refs.forEach((r) => { ops.push(`delete:${r.col}`); rm(r.col, r.id) })
          },
        }
      },
    },
    auth: { async deleteUser(uid: string) { ops.push(`auth:${uid}`) } },
    async deleteStorage(uid: string) { ops.push(`storage:${uid}`) },
  }
  return { admin, ops, batches }
}

function req(method: string, body?: any) {
  return new Request('http://x/api/account', {
    method,
    headers: { authorization: 'Bearer t' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function seed(): Record<string, Row[]> {
  return {
    habits: [{ id: 'h1', user_id: 'u1', name: 'meu' }, { id: 'h2', user_id: 'u2', name: 'alheio' }],
    tasks: [{ id: 't1', user_id: 'u2' }],
    api_keys: [{ id: 'k1', user_id: 'u1', key_hash: 'SEGREDO', key_preview: 'fos_...' }],
    profiles: [{ id: 'u1', name: 'Eu' }, { id: 'u2', name: 'Outro' }],
    settings: [{ id: 'u1', x: 1 }],
    user_integrations: [{ id: 'u1', google_calendar: { refresh_token: 'RT', email: 'a@b.c' } }],
    oauth_states: [{ id: 's1', uid: 'u1' }, { id: 's2', uid: 'u2' }],
  }
}

beforeEach(() => {
  authUid = 'u1'
  resetRateLimits()
})

describe('USER_COLLECTIONS', () => {
  it('cobre toda colecao usada em lib/hooks', () => {
    const dir = path.resolve(__dirname, '../../hooks')
    const known = new Set<string>([...USER_COLLECTIONS, ...USER_DOC_COLLECTIONS] as string[])
    const used = new Set<string>()
    readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .forEach((f) => {
        const src = readFileSync(path.join(dir, f), 'utf8')
        const re = /(?:collection|doc)\(\s*db\s*,\s*'([a-z_]+)'/g
        let m: RegExpExecArray | null
        while ((m = re.exec(src))) used.add(m[1])
      })
    expect(used.size).toBeGreaterThan(10)
    const missing = Array.from(used).filter((c) => !known.has(c))
    expect(missing).toEqual([])
  })

  it('cobre toda colecao com regra em firestore.rules', () => {
    const rules = readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8')
    const known = new Set<string>([...USER_COLLECTIONS, ...USER_DOC_COLLECTIONS] as string[])
    const re = /match \/([a-z_]+)\/\{/g
    let m: RegExpExecArray | null
    const missing: string[] = []
    while ((m = re.exec(rules))) if (m[1] !== 'databases' && !known.has(m[1])) missing.push(m[1])
    expect(missing).toEqual([])
  })
})

describe('GET export', () => {
  it('REGRESSAO: sem token valido = 401', async () => {
    authUid = null
    const { admin } = makeAdmin(seed())
    expect((await handleExport(req('GET'), admin)).status).toBe(401)
  })

  it('REGRESSAO: devolve so docs do uid do token e sem segredos', async () => {
    const { admin } = makeAdmin(seed())
    const res = await handleExport(req('GET'), admin)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toContain('attachment')
    const text = await res.text()
    const json = JSON.parse(text)
    expect(json.uid).toBe('u1')
    expect(json.data.habits.map((r: any) => r.id)).toEqual(['h1'])
    expect(json.data.tasks).toEqual([])
    expect(json.data.profiles.map((r: any) => r.id)).toEqual(['u1'])
    expect(text).not.toContain('alheio')
    expect(text).not.toContain('Outro')
    expect(text).not.toContain('SEGREDO')
    expect(text).not.toContain('"RT"')
    expect(json.data.user_integrations[0].google_calendar.email).toBe('a@b.c')
  })

  it('429 acima do limite', async () => {
    const { admin } = makeAdmin(seed())
    for (let i = 0; i < EXPORT_RATE_LIMIT; i++) expect((await handleExport(req('GET'), admin)).status).toBe(200)
    const res = await handleExport(req('GET'), admin)
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBeTruthy()
  })

  it('erro interno e generico (500 sem detalhe)', async () => {
    const { admin } = makeAdmin(seed(), { failCollection: 'habits' })
    const res = await handleExport(req('GET'), admin)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom')
  })
})

describe('POST delete', () => {
  it('REGRESSAO: sem token = 401 e nada e apagado', async () => {
    authUid = null
    const store = seed()
    const { admin, ops } = makeAdmin(store)
    expect((await handleDelete(req('POST', { confirm: 'APAGAR' }), admin)).status).toBe(401)
    expect(ops).toEqual([])
  })

  it('REGRESSAO: sem confirm correto = 400 e nada e apagado', async () => {
    for (const body of [undefined, {}, { confirm: 'apagar' }, { confirm: 'EXCLUIR' }]) {
      resetRateLimits()
      const { admin, ops } = makeAdmin(seed())
      const res = await handleDelete(req('POST', body), admin)
      expect(res.status).toBe(400)
      expect(ops).toEqual([])
    }
  })

  it('apaga so o uid do token, todas as colecoes, e deleteUser por ultimo', async () => {
    const store = seed()
    const { admin, ops } = makeAdmin(store)
    const res = await handleDelete(req('POST', { confirm: 'APAGAR' }), admin)
    expect(res.status).toBe(200)

    expect(store.habits.map((r) => r.id)).toEqual(['h2'])
    expect(store.tasks.map((r) => r.id)).toEqual(['t1'])
    expect(store.api_keys).toEqual([])
    expect(store.profiles.map((r) => r.id)).toEqual(['u2'])
    expect(store.settings).toEqual([])
    expect(store.user_integrations).toEqual([])
    expect(store.oauth_states.map((r) => r.id)).toEqual(['s2'])

    expect(ops[ops.length - 1]).toBe('auth:u1')
    expect(ops.filter((o) => o.startsWith('auth:'))).toHaveLength(1)
    expect(ops.indexOf('storage:u1')).toBeGreaterThan(-1)
    expect(ops.indexOf('storage:u1')).toBeLessThan(ops.indexOf('auth:u1'))
    expect(ops.indexOf('delete:habits')).toBeLessThan(ops.indexOf('delete:profiles'))
  })

  it('consulta todas as colecoes da lista', async () => {
    const seen: string[] = []
    const { admin } = makeAdmin({})
    const orig = admin.db.collection.bind(admin.db)
    admin.db.collection = (n: string) => { seen.push(n); return orig(n) }
    await handleDelete(req('POST', { confirm: 'APAGAR' }), admin)
    const all = [...USER_COLLECTIONS, ...USER_UID_FIELD_COLLECTIONS, ...USER_DOC_COLLECTIONS] as string[]
    all.forEach((c) => expect(seen).toContain(c))
  })

  it('apaga em lotes', async () => {
    const many: Row[] = []
    for (let i = 0; i < DELETE_BATCH_SIZE * 2 + 5; i++) many.push({ id: `h${i}`, user_id: 'u1' })
    const store: Record<string, Row[]> = { habits: many }
    const { admin, batches } = makeAdmin(store)
    await handleDelete(req('POST', { confirm: 'APAGAR' }), admin)
    expect(store.habits).toEqual([])
    expect(batches.filter((n) => n > 0)).toEqual([DELETE_BATCH_SIZE, DELETE_BATCH_SIZE, 5])
  })

  it('se uma colecao falha, NAO apaga o usuario do Auth e responde 500 generico', async () => {
    const { admin, ops } = makeAdmin(seed(), { failCollection: 'tasks' })
    const res = await handleDelete(req('POST', { confirm: 'APAGAR' }), admin)
    expect(res.status).toBe(500)
    expect(ops.some((o) => o.startsWith('auth:'))).toBe(false)
    expect(JSON.stringify(await res.json())).not.toContain('boom')
  })

  it('429 acima do limite', async () => {
    for (let i = 0; i < DELETE_RATE_LIMIT; i++) {
      const { admin } = makeAdmin({})
      expect((await handleDelete(req('POST', { confirm: 'APAGAR' }), admin)).status).toBe(200)
    }
    const { admin } = makeAdmin({})
    expect((await handleDelete(req('POST', { confirm: 'APAGAR' }), admin)).status).toBe(429)
  })
})
