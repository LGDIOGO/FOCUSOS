import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { getStorage } from 'firebase-admin/storage'
import { userStoragePrefix, type AdminLike } from '@/lib/server/userData'

/** Admin SDK real, no formato esperado por userData.ts. */
export function realAdmin(): AdminLike {
  return {
    db: adminDb as any,
    auth: adminAuth,
    deleteStorage: async (uid: string) => {
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      if (!bucketName) {
        console.warn('[account/delete] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ausente: arquivos do Storage não foram apagados')
        return
      }
      await getStorage().bucket(bucketName).deleteFiles({ prefix: userStoragePrefix(uid) })
    },
  }
}
