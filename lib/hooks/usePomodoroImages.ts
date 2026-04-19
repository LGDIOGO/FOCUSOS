'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface PomodoroImage {
  id: string
  url: string
  name: string
  created_at: string
}

interface StoredImage {
  id: string
  blob: Blob
  name: string
  created_at: string
}

const DB_NAME = 'focusos-pomodoro'
const STORE_NAME = 'images'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

function idbGetAll<T>(db: IDBDatabase): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
  })
}

function idbPut(db: IDBDatabase, value: StoredImage): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

function idbDelete(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

export function usePomodoroImages() {
  const [images, setImages] = useState<PomodoroImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const objectUrlsRef = useRef<string[]>([])

  const loadImages = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      const db = await openDB()
      const stored: StoredImage[] = await idbGetAll(db)
      stored.sort((a, b) => b.created_at.localeCompare(a.created_at))

      objectUrlsRef.current.forEach(u => URL.revokeObjectURL(u))
      objectUrlsRef.current = []

      const imgs: PomodoroImage[] = stored.map(s => {
        const url = URL.createObjectURL(s.blob)
        objectUrlsRef.current.push(url)
        return { id: s.id, url, name: s.name, created_at: s.created_at }
      })
      setImages(imgs)
    } catch (e) {
      console.error('Failed to load images from IndexedDB:', e)
    }
  }, [])

  useEffect(() => {
    loadImages()
    return () => { objectUrlsRef.current.forEach(u => URL.revokeObjectURL(u)) }
  }, [loadImages])

  const uploadImage = useCallback(async (file: File) => {
    setUploading(true)
    setUploadProgress(30)
    try {
      const db = await openDB()
      setUploadProgress(70)
      await idbPut(db, {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        blob: file,
        name: file.name,
        created_at: new Date().toISOString(),
      })
      setUploadProgress(100)
      await loadImages()
    } catch (e) {
      console.error('Upload error:', e)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [loadImages])

  const deleteImage = useCallback(async (image: PomodoroImage) => {
    try {
      const db = await openDB()
      await idbDelete(db, image.id)
      URL.revokeObjectURL(image.url)
      objectUrlsRef.current = objectUrlsRef.current.filter(u => u !== image.url)
      setImages(prev => prev.filter(i => i.id !== image.id))
    } catch (e) {
      console.error('Delete error:', e)
    }
  }, [])

  return { images, uploading, uploadProgress, uploadImage, deleteImage }
}
