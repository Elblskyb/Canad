import { createClient } from '@supabase/supabase-js'

/* Zero-config Supabase: القيم الافتراضية مضمّنة — التطبيق يعمل متصلاً بالسحابة
   فور التثبيت بدون أي إعداد يدوي. يمكن تجاوزها عبر .env (VITE_SUPABASE_*). */
const SUPABASE_URL =
  (import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  'https://hdnylwxvjmieuhybnjpk.supabase.co'
const SUPABASE_ANON_KEY =
  (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_In57otFBw63nuOUf62qDvQ_6l74Bnx-'

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 5 } },
      })
    : null

export const cloudEnabled = () => !!supabase

/* آخر خطأ تقني من السحابة — يُعرض في واجهة الإعدادات عند فشل المزامنة */
export const cloudDiag = { lastError: '' }

const errText = (e) => {
  if (!e) return 'خطأ غير معروف'
  const parts = [e.message || String(e)]
  if (e.code) parts.push('code=' + e.code)
  if (e.status) parts.push('status=' + e.status)
  if (e.details) parts.push(String(e.details).slice(0, 200))
  if (e.hint) parts.push(String(e.hint).slice(0, 200))
  return parts.join(' | ')
}

/* ---------- Mapping camelCase ↔ snake_case ---------- */
const TABLES = {
  users: 'users',
  circles: 'circles',
  students: 'students',
  attendance: 'attendance',
  recitations: 'recitations',
  exams: 'exams',
  parentLogs: 'parent_logs',
  certificates: 'certificates',
  notifications: 'notifications',
  backups: 'backups',
  archive: 'archive',
}

const toSnake = (k) =>
  k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())

const toRow = (schoolId, table, obj) => {
  const row = { id: obj.id, school_id: schoolId }
  Object.entries(obj).forEach(([k, v]) => {
    if (k === 'id') return
    row[toSnake(k)] = v
  })
  if (table === 'notifications' && obj.to) {
    row.to_user = obj.to
    delete row.to
  }
  return row
}

const fromRow = (row) => {
  const obj = {}
  Object.entries(row).forEach(([k, v]) => {
    if (k === 'school_id') return
    if (k === 'to_user') {
      obj.to = v
      return
    }
    obj[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v
  })
  return obj
}

/* ---------- Push: رفع db كامل لمدرسة ---------- */
export async function pushSchool(db) {
  if (!supabase || !db?.settings?.schoolId) {
    cloudDiag.lastError = supabase ? 'معرّف المدرسة غير موجود' : 'عميل السحابة غير مهيأ (لا توجد مفاتيح اتصال)'
    return false
  }
  const schoolId = db.settings.schoolId
  try {
    const { error: schoolErr } = await supabase.from('schools').upsert(
      {
        id: schoolId,
        name: db.settings.schoolName,
        code: db.schoolCode || '',
        admin_name: db.settings.adminName || '',
        settings: db.settings,
      },
      { onConflict: 'id' },
    )
    if (schoolErr) throw schoolErr
    for (const [localKey, table] of Object.entries(TABLES)) {
      const rows = (db[localKey] || []).map((o) => toRow(schoolId, table, o))
      if (!rows.length) continue
      const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
      if (error) throw new Error(`جدول ${table}: ${errText(error)}`)
    }
    cloudDiag.lastError = ''
    return true
  } catch (e) {
    cloudDiag.lastError = errText(e)
    return false
  }
}

/* ---------- Pull: سحب بيانات المدرسة من السحابة ---------- */
export async function pullSchool(schoolId) {
  if (!supabase || !schoolId) return null
  try {
    const out = {}
    for (const [localKey, table] of Object.entries(TABLES)) {
      const { data, error } = await supabase.from(table).select('*').eq('school_id', schoolId)
      if (error) throw error
      out[localKey] = (data || []).map(fromRow)
    }
    const { data: schoolRow } = await supabase.from('schools').select('*').eq('id', schoolId).maybeSingle()
    return { ...out, school: schoolRow }
  } catch (e) {
    cloudDiag.lastError = errText(e)
    return null
  }
}

/* ---------- Realtime subscription ---------- */
export function subscribeSchool(schoolId, onChange) {
  if (!supabase || !schoolId) return () => {}
  try {
    const channel = supabase
      .channel(`kand-school-${schoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', filter: `school_id=eq.${schoolId}` },
        () => onChange && onChange(),
      )
      .subscribe()
    return () => {
      try {
        supabase.removeChannel(channel)
      } catch (e) { /* ignore */ }
    }
  } catch (e) {
    return () => {}
  }
}

/* ---------- License check + school creation in cloud ---------- */
export async function cloudValidateLicense(key) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('license_keys')
      .select('key')
      .eq('key', String(key).trim().toUpperCase())
      .eq('active', true)
      .maybeSingle()
    if (error) throw error
    return !!data
  } catch (e) {
    return null
  }
}

export async function cloudCreateSchool({ id, name, code, licenseKey, adminName }) {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('schools').upsert(
      { id, name, code, license_key: licenseKey, admin_name: adminName || '' },
      { onConflict: 'id' },
    )
    if (error) throw error
    return true
  } catch (e) {
    return false
  }
}

export async function cloudFindTeacherByCode(teacherCode) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, school_id, name, teacher_code, circle_id')
      .eq('teacher_code', String(teacherCode).trim().toUpperCase())
      .eq('role', 'teacher')
      .maybeSingle()
    if (error) throw error
    return data
  } catch (e) {
    return null
  }
}

/* البحث عن مستخدم في السحابة بالبريد أو الهاتف (ued login من أي جهاز) */
export async function cloudFindUser(identifier, normPhone) {
  if (!supabase) return null
  try {
    let q = supabase.from('users').select('*').limit(10)
    if (normPhone) q = q.or(`email.eq.${identifier},phone.eq.${normPhone}`)
    else q = q.eq('email', identifier)
    const { data, error } = await q
    if (error) throw error
    return data || []
  } catch (e) {
    return null
  }
}

export async function cloudSchoolByCode(code) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, code')
      .eq('code', String(code).trim().toUpperCase())
      .maybeSingle()
    if (error) throw error
    return data
  } catch (e) {
    return null
  }
}
