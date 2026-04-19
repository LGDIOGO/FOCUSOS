'use client'

import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db, app } from '@/lib/firebase/config'
import { collection, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'

export interface PomodoroImage {
  id: string
  url: string
  name: string
  storage_path: string
  created_at: string
}

export function usePomodoroImages() {
  const [images, setImages] = useState<PomodoroImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) return
    const unsub = onAuthStateChanged(auth, u => setUserId(u?.uid ?? null))
    return unsub
  }, [])

  useEffect(() => {
    if (!userId || !db) return
    const q = query(
      collection(db, 'pomodoro_images'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setImages(snap.docs.map(d => ({ id: d.id, ...d.data() } as PomodoroImage)))
    }, () => {})
    return unsub
  }, [userId])

  const uploadImage = useCallback(async (file: File) => {
    if (!userId || !app || !db) return
    setUploading(true)
    setUploadProgress(0)
    try {
      const storage = getStorage(app)
      const path = `pomodoro/${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const storageRef = ref(storage, path)
      const task = uploadBytesResumable(storageRef, file)
      await new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref)
            await addDoc(collection(db, 'pomodoro_images'), {
              user_id: userId,
              url,
              name: file.name,
              storage_path: path,
              created_at: new Date().toISOString(),
            })
            resolve()
          }
        )
      })
    } catch (e) {
      console.error('Upload error:', e)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [userId])

  const deleteImage = useCallback(async (image: PomodoroImage) => {
    if (!app || !db) return
    try {
      if (image.storage_path) {
        const storage = getStorage(app)
        await deleteObject(ref(storage, image.storage_path))
      }
      await deleteDoc(doc(db, 'pomodoro_images', image.id))
    } catch (e) {
      console.error('Delete error:', e)
    }
  }, [])

  return { images, uploading, uploadProgress, uploadImage, deleteImage }
}
