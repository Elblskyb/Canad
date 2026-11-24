/* License keys: only these codes can create a school.
   لتوليد كود جديد: KAND-YYYY-XXXX (4 أحرف/أرقام عشوائية)، وأضفه في supabase_schema.sql
   أو في جدول license_keys في Supabase. */
export const LICENSE_KEYS = ['KAND-2026-MASTER', 'KAND-2026-DEMO1', 'KAND-2026-DEMO2']

export const isValidLicenseKey = (key) => LICENSE_KEYS.includes(String(key || '').trim().toUpperCase())

export const newTeacherCode = () =>
  'TCH-' + String(1000 + Math.floor(Math.random() * 9000))
