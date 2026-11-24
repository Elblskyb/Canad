import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { buildSchoolDb, loadRegistry, saveRegistry, schoolDbKey, REGISTRY_KEY, SESSION_KEY, newSchoolCode, newSchoolId } from './seed'
import { uid, todayStr, normalizePhone, isPhoneLike } from './helpers'
import { idbGet, idbSet } from './idb'
import { supabase, pushSchool, pullSchool, subscribeSchool, cloudValidateLicense, cloudCreateSchool, cloudFindTeacherByCode, cloudSchoolByCode, cloudFindUser, cloudGetSchool, mapUserFromCloud, mapSchoolFromCloud, cloudDiag } from './cloud'
import { isValidLicenseKey, newTeacherCode } from './license'

/* ---------- GAS fetch: إصلاح Failed to fetch عبر redirect follow + text/plain ---------- */
const gasPost = (url, body) =>
  fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  })

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])

export const StorageService = {
  loadSchoolSync(schoolId) {
    try {
      const raw = localStorage.getItem(schoolDbKey(schoolId))
      if (raw) return JSON.parse(raw)
    } catch (e) { /* reseed */ }
    const reg = loadRegistry()
    const school = reg.schools.find((s) => s.id === schoolId)
    return buildSchoolDb(school || { id: schoolId, name: 'مدرسة' })
  },
  async loadSchool(schoolId) {
    // Offline-first: IndexedDB أولاً، ثم localStorage كاحتياط
    const fromIdb = await idbGet(schoolDbKey(schoolId))
    if (fromIdb) return fromIdb
    try {
      const raw = localStorage.getItem(schoolDbKey(schoolId))
      if (raw) return JSON.parse(raw)
    } catch (e) { /* reseed */ }
    const reg = loadRegistry()
    const school = reg.schools.find((s) => s.id === schoolId)
    const db = buildSchoolDb(school || { id: schoolId, name: 'مدرسة' })
    this.saveSchool(schoolId, db)
    return db
  },
  saveSchool(schoolId, db) {
    idbSet(schoolDbKey(schoolId), db) // IndexedDB primary (no localStorage quota issues)
    try {
      localStorage.setItem(schoolDbKey(schoolId), JSON.stringify(db))
    } catch (e) {
      try { localStorage.removeItem(schoolDbKey(schoolId)) } catch (e2) { /* ignore */ }
    }
    const gasUrl = db?.settings?.gasUrl
    if (gasUrl) this.pushRemote(gasUrl, db).catch(() => {})
  },
  async fetchRemote(gasUrl) {
    const res = await withTimeout(gasPost(gasUrl, { action: 'getAll' }), 8000)
    const json = await res.json()
    if (!json || !json.ok || !json.data) throw new Error(json?.error || 'تعذر الاتصال بالخدمة السحابية')
    return json.data
  },
  async pushRemote(gasUrl, db) {
    const res = await withTimeout(gasPost(gasUrl, { action: 'saveAll', data: db }), 10000)
    const json = await res.json()
    if (!json || !json.ok) throw new Error(json?.error || 'تعذر حفظ البيانات في السحابة')
    return json
  },
  async callRemote(gasUrl, action, payload = {}) {
    const res = await withTimeout(gasPost(gasUrl, { action, ...payload }), 20000)
    const json = await res.json()
    if (!json || !json.ok) throw new Error(json?.error || 'فشل الطلب')
    return json
  },
}

export const getSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch (e) { return null }
}
export const setSessionRaw = (s) => {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else localStorage.removeItem(SESSION_KEY)
}

/* ---------- Session ---------- */
const SessionContext = createContext(null)
export function SessionProvider({ children }) {
  const [session, setSession] = useState(getSession())
  const set = useCallback((s) => { setSessionRaw(s); setSession(s) }, [])
  const value = useMemo(() => ({ session, setSession: set }), [session, set])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
export const useSession = () => useContext(SessionContext)

/* ---------- Store (per school) ---------- */
const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const { session } = useSession()
  const schoolId = session?.schoolId || null
  const [db, setDb] = useState(null)
  const [remoteStatus, setRemoteStatus] = useState('local')
  const pushTimer = useRef(null)
  const unsubRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    if (!schoolId) {
      setDb(null)
      return
    }
    // Offline-first: load local instantly, then pull cloud + subscribe realtime
    StorageService.loadSchool(schoolId).then((local) => {
      if (cancelled) return
      setDb(local)
      if (supabase) {
        setRemoteStatus('syncing')
        pullSchool(schoolId).then((cloud) => {
          if (cancelled || !cloud) {
            setRemoteStatus('cloud')
            return
          }
          setDb((prev) => {
            const merged = { ...prev, ...cloud }
            for (const k of ['users', 'circles', 'students', 'attendance', 'recitations', 'exams', 'parentLogs', 'certificates', 'notifications', 'backups', 'archive']) {
              if (Array.isArray(cloud[k]) && cloud[k].length === 0 && Array.isArray(prev?.[k]) && prev[k].length > 0) merged[k] = prev[k]
            }
            merged.settings = { ...cloud.settings, ...prev?.settings, schoolId, gasUrl: prev?.settings?.gasUrl || '' }
            StorageService.saveSchool(schoolId, merged)
            return merged
          })
          setRemoteStatus('cloud')
        })
        unsubRef.current = subscribeSchool(schoolId, () => {
          pullSchool(schoolId).then((cloud) => {
            if (cloud) {
              setDb((prev) => {
                if (!prev) return prev
                const merged = { ...prev, ...cloud }
                for (const k of ['users', 'circles', 'students', 'attendance', 'recitations', 'exams', 'parentLogs', 'certificates', 'notifications', 'backups', 'archive']) {
                  if (Array.isArray(cloud[k]) && cloud[k].length === 0 && Array.isArray(prev[k]) && prev[k].length > 0) merged[k] = prev[k]
                }
                merged.settings = { ...cloud.settings, ...prev.settings, schoolId }
                return merged
              })
            }
          })
        })
      } else {
        setRemoteStatus('local')
      }
    })
    return () => {
      cancelled = true
      if (unsubRef.current) unsubRef.current()
    }
  }, [schoolId])

  // Auto-sync to cloud (debounced) after every local update
  useEffect(() => {
    if (!db || !supabase) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      pushSchool(db).then((ok) => setRemoteStatus(ok ? 'cloud' : 'local-fallback'))
    }, 800)
    return () => clearTimeout(pushTimer.current)
  }, [db])

  const update = useCallback(
    (mutator) => {
      setDb((prev) => {
        if (!prev || !schoolId) return prev
        const next = structuredClone(prev)
        mutator(next)
        StorageService.saveSchool(schoolId, next)
        return next
      })
    },
    [schoolId],
  )

  useEffect(() => {
    const gasUrl = db?.settings?.gasUrl
    if (!gasUrl || !schoolId) {
      setRemoteStatus('local')
      return
    }
    setRemoteStatus('syncing')
    StorageService.fetchRemote(gasUrl)
      .then((remote) => {
        setDb((prev) => {
          const merged = { ...remote, settings: { ...remote.settings, gasUrl, schoolId } }
          StorageService.saveSchool(schoolId, merged)
          return merged
        })
        setRemoteStatus('gas')
      })
      .catch(() => setRemoteStatus('local-fallback'))
  }, [db?.settings?.gasUrl, schoolId])

  const value = useMemo(() => {
    if (!db) return { db: null, update: () => {}, ready: false }
    return {
      db,
      ready: true,
      update,
      mode: db.settings?.gasUrl ? 'gas' : 'local',
      remoteStatus,
      setGasUrl(url) {
        update((d) => { d.settings.gasUrl = url.trim() })
      },
      testConnection: async (url) => {
        try {
          await StorageService.fetchRemote(url.trim())
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e.message }
        }
      },
      backupNow: async () => {
        const snapshot = structuredClone(db)
        const entry = { id: uid(), name: `نسخة احتياطية — ${todayStr()}`, createdAt: new Date().toISOString(), source: 'local', data: snapshot }
        if (db.settings?.gasUrl) {
          try {
            const res = await StorageService.callRemote(db.settings.gasUrl, 'backup', { name: entry.name, data: snapshot })
            entry.driveFileId = res.fileId || null
            entry.source = 'drive'
          } catch (e) {
            entry.source = 'local'
            entry.error = e.message
          }
        }
        update((d) => { d.backups.unshift(entry) })
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
        setDb(() => {
          const merged = { ...data, settings: { ...data.settings, gasUrl: db.settings.gasUrl, schoolId } }
          StorageService.saveSchool(schoolId, merged)
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
            d.exams.forEach((e) => { e.results = e.results.filter((r) => r.studentId !== record.id) })
            d.parentLogs = d.parentLogs.filter((p) => p.studentId !== record.id)
          }
          if (kind === 'circle') {
            d.circles = d.circles.filter((c) => c.id !== record.id)
            d.students.forEach((s) => { if (s.circleId === record.id) s.circleId = null })
          }
          if (kind === 'recitation') d.recitations = d.recitations.filter((r) => r.id !== record.id)
          if (kind === 'attendance') d.attendance = d.attendance.filter((a) => a.id !== record.id)
        })
      },
      notify: (toUserIds, type, title, body) => {
        update((d) => {
          ;[].concat(toUserIds).forEach((uid2) => {
            d.notifications.push({ id: uid(), to: uid2, type, title, body, createdAt: new Date().toISOString(), read: false })
          })
        })
      },
      markNotificationsRead: (userId) => {
        update((d) => {
          d.notifications.forEach((n) => { if (n.to === userId) n.read = true })
        })
      },
      importJSON: (json) => {
        const data = typeof json === 'string' ? JSON.parse(json) : json
        if (!data || !Array.isArray(data.students) || !Array.isArray(data.users)) throw new Error('ملف غير صالح: البنية غير متوقعة')
        setDb(() => {
          const merged = { ...data, settings: { ...data.settings, gasUrl: db.settings?.gasUrl || '', schoolId } }
          StorageService.saveSchool(schoolId, merged)
          return merged
        })
      },
    }
  }, [db, update, schoolId, remoteStatus])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore within StoreProvider')
  return ctx
}

/* ---------- Auth ---------- */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { db } = useStore()
  const { session, setSession } = useSession()

  const user = useMemo(() => {
    if (!session || !db) return null
    return db.users.find((u) => u.id === session.userId) || null
  }, [session, db])

  const login = useCallback(
    async (identifier, password) => {
      const raw = String(identifier).trim()
      const id = raw.toLowerCase()
      const norm = isPhoneLike(raw) ? normalizePhone(raw) : null
      const reg = loadRegistry()
      let entry = reg.users.find(
        (u) => (u.identifier && u.identifier.toLowerCase() === id) || (norm && u.phone && normalizePhone(u.phone) === norm),
      )
      let schoolDb = entry ? StorageService.loadSchoolSync(entry.schoolId) : null
      let u = schoolDb?.users.find((x) => x.id === entry?.userId)
        || schoolDb?.users.find((x) => (x.email && String(x.email).toLowerCase() === id) || (norm && x.phone && normalizePhone(x.phone) === norm))
      // إذا لم يُ found محلياً → استعلام مباشر من public.users (دخول من أي جهاز جديد)
      if ((!entry || !u) && supabase) {
        const remoteUsers = await cloudFindUser(id, norm)
        const match = (remoteUsers || []).find((x) => x.password === password) || (remoteUsers || [])[0]
        const schoolId = match && (match.schoolId || match.school_id)
        if (match && schoolId) {
          entry = { schoolId, userId: match.id }
          // احفظ صف المدرسة + المستخدم في التخزين المحلي فوراً قبل الدخول للوحة التحكم
          const schoolRow = await cloudGetSchool(schoolId)
          const school = schoolRow || mapSchoolFromCloud({ id: schoolId, name: reg.schools.find((s) => s.id === schoolId)?.name || 'مدرسة' })
          const cloud = await pullSchool(schoolId)
          if (!reg.schools.some((s) => s.id === schoolId)) {
            reg.schools.push({ id: schoolId, name: school.name || 'مدرسة', code: school.code || '', createdAt: school.createdAt || new Date().toISOString() })
          }
          if (!reg.users.some((x) => x.userId === match.id && x.schoolId === schoolId)) {
            reg.users.push({ schoolId, userId: match.id, identifier: match.email || id, phone: match.phone || '', role: match.role || 'student', name: match.name || '' })
          }
          const local = StorageService.loadSchoolSync(schoolId)
          const merged = { ...local, ...(cloud || {}), schoolCode: school.code || local.schoolCode, settings: { ...local.settings, ...(cloud?.settings || {}), schoolId, gasUrl: local.settings?.gasUrl || '' } }
          merged.users = Array.isArray(cloud?.users) && cloud.users.length ? cloud.users : local.users
          const mapped = mapUserFromCloud(match)
          if (!merged.users.some((x) => x.id === mapped.id)) merged.users = [...merged.users, mapped]
          StorageService.saveSchool(schoolId, merged)
          saveRegistry(reg)
          schoolDb = merged
          u = merged.users.find((x) => x.id === entry.userId)
        }
      }
      if (!entry) return { ok: false, error: 'لا يوجد حساب بهذا البريد الإلكتروني أو رقم الهاتف — تأكد من التسجيل أولاً' }
      if (!u) return { ok: false, error: 'تعذر تحميل بيانات الحساب — أعد المحاولة' + (cloudDiag.lastError ? ` (${cloudDiag.lastError})` : '') }
      if (u.password !== password) return { ok: false, error: 'كلمة المرور غير صحيحة' }
      if (u.status === 'suspended') return { ok: false, error: 'تم إيقاف هذا الحساب — تواصل مع مدير المدرسة' }
      setSession({ userId: u.id, schoolId: entry.schoolId, at: new Date().toISOString() })
      return { ok: true }
    },
    [setSession],
  )

  const registerSchool = useCallback(
    async ({ schoolName, adminName, identifier, phone, password, licenseKey }) => {
      const key = String(licenseKey || '').trim().toUpperCase()
      if (!isValidLicenseKey(key)) {
        return { ok: false, error: 'كود التفعيل غير صالح — اطلب كود التفعيل من صاحب التطبيق' }
      }
      const reg = loadRegistry()
      const id = String(identifier).trim().toLowerCase()
      if (reg.users.some((u) => u.identifier?.toLowerCase() === id)) return { ok: false, error: 'هذا البريد مسجّل مسبقاً' }
      const school = { id: newSchoolId(), name: schoolName.trim(), code: newSchoolCode(), licenseKey: key, createdAt: new Date().toISOString(), adminName: adminName.trim() }
      const schoolDb = buildSchoolDb(school)
      const userId = uid()
      schoolDb.users.push({ id: userId, name: adminName.trim(), email: id, phone: phone || '', password, role: 'admin', status: 'active', photo: '', createdAt: new Date().toISOString() })
      reg.schools.push(school)
      reg.users.push({ schoolId: school.id, userId, identifier: id, phone: phone || '', role: 'admin', name: adminName.trim() })
      saveRegistry(reg)
      StorageService.saveSchool(school.id, schoolDb)
      cloudCreateSchool({ id: school.id, name: school.name, code: school.code, licenseKey: key, adminName: school.adminName }).then((ok) => {
        if (ok) pushSchool(schoolDb)
      })
      setSession({ userId, schoolId: school.id, at: new Date().toISOString() })
      return { ok: true, school }
    },
    [setSession],
  )

  const registerStudent = useCallback(
    async ({ code, name, birthDate, parentName, parentPhone, password, photo }) => {
      const reg = loadRegistry()
      const input = String(code || '').trim().toUpperCase()
      // Accept teacher code (TCH-XXXX) or school code
      let school = reg.schools.find((s) => s.code === input)
      let circleId = null
      if (!school && input.startsWith('TCH-')) {
        for (const s of reg.schools) {
          const d = StorageService.loadSchoolSync(s.id)
          const t = d.users.find((u) => u.role === 'teacher' && u.teacherCode === input)
          if (t) {
            school = s
            circleId = d.circles.find((c) => c.teacherId === t.id)?.id || null
            break
          }
        }
      }
      if (!school) return { ok: false, error: 'الكود غير صحيح — أدخل كود المعلم (TCH-XXXX) أو كود المدرسة' }
      const schoolDb = StorageService.loadSchoolSync(school.id)
      const phoneDigits = normalizePhone(parentPhone)
      let parent = schoolDb.users.find((u) => u.role === 'parent' && u.phone && normalizePhone(u.phone) === phoneDigits)
      let parentId
      if (parent) {
        parentId = parent.id
      } else {
        parentId = uid()
        schoolDb.users.push({ id: parentId, name: parentName.trim(), email: '', phone: phoneDigits, password, role: 'parent', status: 'active', photo: '', createdAt: new Date().toISOString() })
        reg.users.push({ schoolId: school.id, userId: parentId, identifier: '', phone: phoneDigits, role: 'parent', name: parentName.trim() })
      }
      const sid = 'stu-' + uid().slice(3, 10)
      const userId = 'usr-' + sid
      schoolDb.users.push({ id: userId, name: name.trim(), email: '', phone: phoneDigits, password, role: 'student', status: 'active', studentId: sid, photo: photo || '', createdAt: new Date().toISOString() })
      reg.users.push({ schoolId: school.id, userId, identifier: '', phone: phoneDigits, role: 'student', name: name.trim() })
      // ربط بأول حلقة متاحة للمعلم أو للمدرسة تلقائياً
      if (!circleId) {
        circleId = schoolDb.circles.find((c) => c.teacherId && schoolDb.users.find((u) => u.id === c.teacherId && u.teacherCode === input))?.id
          || schoolDb.circles[0]?.id || null
      }
      schoolDb.students.push({ id: sid, userId, name: name.trim(), birthDate: birthDate || '', circleId, parentId, qrCode: `KAND-${sid.toUpperCase()}`, photo: photo || '', joinedAt: todayStr(), createdAt: new Date().toISOString() })
      saveRegistry(reg)
      StorageService.saveSchool(school.id, schoolDb)
      await pushSchool(schoolDb)
      return { ok: true, school }
    },
    [],
  )

  const logout = useCallback(() => setSession(null), [setSession])

  const value = useMemo(
    () => ({ session, user, login, registerSchool, registerStudent, logout }),
    [session, user, login, registerSchool, registerStudent, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth within AuthProvider')
  return ctx
}
