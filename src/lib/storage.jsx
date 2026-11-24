import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { buildSeed } from './seed'
import { uid, todayStr } from './helpers'

const LS_KEY = 'kand_db_v1'
const SESSION_KEY = 'kand_session_v1'

const readLocal = () => {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* corrupted storage → reseed */
  }
  const seeded = buildSeed()
  localStorage.setItem(LS_KEY, JSON.stringify(seeded))
  return seeded
}

const writeLocal = (db) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db))
  } catch (e) {
    /* quota */
  }
}

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ])

export const StorageService = {
  load: readLocal,
  save(db) {
    writeLocal(db)
    const gasUrl = db?.settings?.gasUrl
    if (gasUrl) {
      this.pushRemote(gasUrl, db).catch(() => {})
    }
  },
  reset() {
    localStorage.removeItem(LS_KEY)
    const seeded = buildSeed()
    writeLocal(seeded)
    return seeded
  },
  async fetchRemote(gasUrl) {
    const res = await withTimeout(
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getAll' }),
      }),
      6000,
    )
    const json = await res.json()
    if (!json || !json.ok || !json.data) throw new Error(json?.error || 'استجابة غير صالحة')
    return json.data
  },
  async pushRemote(gasUrl, db) {
    const res = await withTimeout(
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveAll', data: db }),
      }),
      8000,
    )
    const json = await res.json()
    if (!json || !json.ok) throw new Error(json?.error || 'فشل الدفع')
    return json
  },
  async callRemote(gasUrl, action, payload = {}) {
    const res = await withTimeout(
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload }),
      }),
      15000,
    )
    const json = await res.json()
    if (!json || !json.ok) throw new Error(json?.error || 'فشل الطلب')
    return json
  },
}

export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch (e) {
    return null
  }
}
export const setSession = (s) => {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else localStorage.removeItem(SESSION_KEY)
}

const StoreContext = createContext(null)
const AuthContext = createContext(null)

export function StoreProvider({ children }) {
  const [db, setDb] = useState(() => StorageService.load())
  const [remoteStatus, setRemoteStatus] = useState('idle')

  const update = useCallback((mutator) => {
    setDb((prev) => {
      const next = structuredClone(prev)
      mutator(next)
      StorageService.save(next)
      return next
    })
  }, [])

  const reload = useCallback(() => setDb(StorageService.load()), [])

  useEffect(() => {
    const gasUrl = db.settings?.gasUrl
    if (!gasUrl) {
      setRemoteStatus('local')
      return
    }
    setRemoteStatus('syncing')
    StorageService.fetchRemote(gasUrl)
      .then((remote) => {
        setDb((prev) => {
          const merged = { ...remote, settings: { ...remote.settings, gasUrl } }
          writeLocal(merged)
          return merged
        })
        setRemoteStatus('gas')
      })
      .catch(() => setRemoteStatus('local-fallback'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.settings?.gasUrl])

  const mode = db.settings?.gasUrl ? 'gas' : 'local'

  const value = useMemo(
    () => ({
      db,
      update,
      reload,
      mode,
      remoteStatus,
      setGasUrl(url) {
        update((d) => {
          d.settings.gasUrl = url.trim()
        })
      },
      testConnection: async (url) => {
        try {
          await StorageService.fetchRemote(url)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e.message }
        }
      },
      backupNow: async () => {
        const snapshot = structuredClone(db)
        const entry = {
          id: uid(),
          name: `نسخة احتياطية — ${todayStr()}`,
          createdAt: new Date().toISOString(),
          source: 'local',
          data: snapshot,
        }
        if (db.settings?.gasUrl) {
          try {
            const res = await StorageService.callRemote(db.settings.gasUrl, 'backup', {
              name: entry.name,
              data: snapshot,
            })
            entry.driveFileId = res.fileId || null
            entry.source = 'drive'
          } catch (e) {
            entry.source = 'local'
            entry.error = e.message
          }
        }
        update((d) => {
          d.backups.unshift(entry)
        })
        return entry
      },
      listRemoteBackups: async () => {
        if (!db.settings?.gasUrl) return []
        const res = await StorageService.callRemote(db.settings.gasUrl, 'listBackups')
        return res.files || []
      },
      restoreRemoteBackup: async (fileId) => {
        const res = await StorageService.callRemote(db.settings.gasUrl, 'restoreBackup', { fileId })
        const data = res.data
        setDb((prev) => {
          const merged = { ...data, settings: { ...data.settings, gasUrl: prev.settings.gasUrl } }
          writeLocal(merged)
          return merged
        })
        return res
      },
      deleteBackup: (backupId) => {
        update((d) => {
          const idx = d.backups.findIndex((b) => b.id === backupId)
          if (idx >= 0) {
            const [b] = d.backups.splice(idx, 1)
            d.archive.push({ kind: 'backup', id: uid(), deletedAt: new Date().toISOString(), record: b })
          }
        })
      },
      restoreArchived: (archiveId) => {
        update((d) => {
          const idx = d.archive.findIndex((a) => a.id === archiveId)
          if (idx < 0) return
          const [a] = d.archive.splice(idx, 1)
          if (a.kind === 'backup') d.backups.unshift(a.record)
          else if (a.kind === 'student') d.students.push(a.record)
          else if (a.kind === 'circle') d.circles.push(a.record)
          else if (a.kind === 'recitation') d.recitations.push(a.record)
        })
      },
      deleteRecord: (kind, record) => {
        update((d) => {
          d.archive.push({ kind, id: uid(), deletedAt: new Date().toISOString(), record })
          if (kind === 'student') {
            d.students = d.students.filter((s) => s.id !== record.id)
            d.attendance = d.attendance.filter((a) => a.studentId !== record.id)
            d.recitations = d.recitations.filter((r) => r.studentId !== record.id)
            d.exams.forEach((e) => {
              e.results = e.results.filter((r) => r.studentId !== record.id)
            })
            d.parentLogs = d.parentLogs.filter((p) => p.studentId !== record.id)
          }
          if (kind === 'circle') {
            d.circles = d.circles.filter((c) => c.id !== record.id)
            d.students.forEach((s) => {
              if (s.circleId === record.id) s.circleId = null
            })
          }
          if (kind === 'recitation') d.recitations = d.recitations.filter((r) => r.id !== record.id)
        })
      },
      importJSON: (json) => {
        const data = typeof json === 'string' ? JSON.parse(json) : json
        if (!data || !Array.isArray(data.students) || !Array.isArray(data.users)) {
          throw new Error('ملف غير صالح: البنية غير متوقعة')
        }
        setDb((prev) => {
          const merged = { ...data, settings: { ...data.settings, gasUrl: prev.settings?.gasUrl || '' } }
          writeLocal(merged)
          return merged
        })
      },
    }),
    [db, update, reload, mode, remoteStatus],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const { db } = useStore()
  const [session, setSessionState] = useState(getSession())

  const user = useMemo(() => {
    if (!session) return null
    return db.users.find((u) => u.id === session.userId) || null
  }, [session, db.users])

  const login = useCallback(
    (email, password) => {
      const u = db.users.find(
        (x) => x.email.toLowerCase() === String(email).trim().toLowerCase() && x.password === password,
      )
      if (!u) return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }
      const s = { userId: u.id, at: new Date().toISOString() }
      setSession(s)
      setSessionState(s)
      return { ok: true }
    },
    [db.users],
  )

  const quickLogin = useCallback(
    (role) => {
      const order = { admin: 0, teacher: 0, parent: 0, student: 0 }
      const u = db.users.find((x) => x.role === role && (order[role]++, true))
      if (!u) return { ok: false, error: 'لا يوجد حساب تجريبي لهذا الدور' }
      const s = { userId: u.id, at: new Date().toISOString() }
      setSession(s)
      setSessionState(s)
      return { ok: true }
    },
    [db.users],
  )

  const logout = useCallback(() => {
    setSession(null)
    setSessionState(null)
  }, [])

  const value = useMemo(
    () => ({ session, user, login, quickLogin, logout }),
    [session, user, login, quickLogin, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
