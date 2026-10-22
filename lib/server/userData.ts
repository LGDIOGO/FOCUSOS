/**
 * Dados do usuario (LGPD art. 18): lista unica de colecoes + exportacao e
 * exclusao com o Admin SDK injetado (testavel sem Firebase).
 *
 * Toda colecao nova com `user_id` DEVE entrar aqui; um teste varre lib/hooks e
 * falha se faltar alguma.
 */

/** Colecoes cujos docs trazem `user_id` (ver firestore.rules). */
export const USER_COLLECTIONS = [
  'habits',
  'habit_logs',
  'events',
  'event_logs',
  'tasks',
  'work_items',
  'work_logs',
  'work_notes',
  'goals',
  'notifications',
  'categories',
  'finance_entries',
  'finance_transactions',
  'finance_recurring_costs',
  'finance_potes',
  'finance_roadmap',
  'books',
  'study_entries',
  'retirement_tracking',
  'reserves',
  'reserve_transactions',
  'api_keys',
] as const

/** Colecoes em que o doc tem id = uid. */
export const USER_DOC_COLLECTIONS = ['profiles', 'settings', 'user_integrations'] as const

/** Colecoes filtradas por um campo `uid` (nao `user_id`). */
export const USER_UID_FIELD_COLLECTIONS = ['oauth_states'] as const

/** Pasta do Storage do usuario (ver storage.rules). */
export const userStoragePrefix = (uid: string) => `work_notes/${uid}/`

export const DELETE_BATCH_SIZE = 400

export interface DocLike {
  id: string
  data(): any
  ref: any
}
export interface QueryLike {
  get(): Promise<{ docs: DocLike[] }>
}
export interface DbLike {
  collection(name: string): {
    where(field: string, op: '==', value: string): QueryLike
    doc(id: string): {
      get(): Promise<{ exists: boolean; id: string; data(): any }>
      delete(): Promise<any>
    }
  }
  batch(): { delete(ref: any): any; commit(): Promise<any> }
}
export interface AdminLike {
  db: DbLike
  auth: { deleteUser(uid: string): Promise<any> }
  /** Apaga os arquivos do uid no Storage. Opcional (sem bucket configurado). */
  deleteStorage?: (uid: string) => Promise<void>
}

const SECRET_KEYS = new Set(['refresh_token', 'access_token', 'key_hash'])

/** Remove segredos (hash de API key, tokens do Google) de qualquer nivel. */
export function stripSecrets(value: any): any {
  if (Array.isArray(value)) return value.map(stripSecrets)
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {}
    Object.keys(value).forEach((k) => {
      if (!SECRET_KEYS.has(k)) out[k] = stripSecrets(value[k])
    })
    return out
  }
  return value
}

export interface ExportResult {
  exported_at: string
  uid: string
  data: Record<string, Array<{ id: string } & Record<string, any>>>
}

export async function exportUserData(admin: AdminLike, uid: string, now: Date = new Date()): Promise<ExportResult> {
  const data: ExportResult['data'] = {}

  for (const name of USER_COLLECTIONS) {
    const snap = await admin.db.collection(name).where('user_id', '==', uid).get()
    data[name] = snap.docs.map((d) => ({ ...stripSecrets(d.data()), id: d.id }))
  }
  for (const name of USER_DOC_COLLECTIONS) {
    const doc = await admin.db.collection(name).doc(uid).get()
    data[name] = doc.exists ? [{ ...stripSecrets(doc.data()), id: doc.id }] : []
  }
  return { exported_at: now.toISOString(), uid, data }
}

export interface DeleteResult {
  ok: boolean
  deleted: Record<string, number>
  failures: string[]
}

async function deleteDocsInBatches(db: DbLike, docs: DocLike[]): Promise<void> {
  for (let i = 0; i < docs.length; i += DELETE_BATCH_SIZE) {
    const batch = db.batch()
    docs.slice(i, i + DELETE_BATCH_SIZE).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

/**
 * Apaga tudo do uid: colecoes, docs por id, oauth_states, Storage e, por
 * ultimo, o usuario no Auth. Se qualquer etapa de dados falhar, NAO apaga o
 * usuario (ele pode tentar de novo) e devolve as falhas.
 */
export async function deleteUserData(admin: AdminLike, uid: string): Promise<DeleteResult> {
  const deleted: Record<string, number> = {}
  const failures: string[] = []

  const run = async (label: string, fn: () => Promise<number>) => {
    try {
      deleted[label] = await fn()
    } catch {
      failures.push(label)
    }
  }

  for (const name of USER_COLLECTIONS) {
    await run(name, async () => {
      const snap = await admin.db.collection(name).where('user_id', '==', uid).get()
      await deleteDocsInBatches(admin.db, snap.docs)
      return snap.docs.length
    })
  }
  for (const name of USER_UID_FIELD_COLLECTIONS) {
    await run(name, async () => {
      const snap = await admin.db.collection(name).where('uid', '==', uid).get()
      await deleteDocsInBatches(admin.db, snap.docs)
      return snap.docs.length
    })
  }
  for (const name of USER_DOC_COLLECTIONS) {
    await run(name, async () => {
      await admin.db.collection(name).doc(uid).delete()
      return 1
    })
  }
  if (admin.deleteStorage) {
    const del = admin.deleteStorage
    await run('storage', async () => {
      await del(uid)
      return 1
    })
  }

  if (failures.length > 0) return { ok: false, deleted, failures }

  try {
    await admin.auth.deleteUser(uid)
  } catch {
    failures.push('auth')
    return { ok: false, deleted, failures }
  }
  return { ok: true, deleted, failures }
}
