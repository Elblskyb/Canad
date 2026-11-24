export const cx = (...args) => args.filter(Boolean).join(' ')

export const uid = () =>
  'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)

export const todayStr = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return todayStr(d)
}

export const fmtDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('ar-SA-u-nu-latn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const fmtDateTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ar-SA-u-nu-latn', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const monthKey = (dateStr) => (dateStr || todayStr()).slice(0, 7)

export const monthLabel = (key) => {
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'long' })
}

export const gradeOf = (score) => {
  if (score >= 95) return { label: 'ممتاز', color: 'text-accent' }
  if (score >= 85) return { label: 'جيد جداً', color: 'text-teal2' }
  if (score >= 70) return { label: 'جيد', color: 'text-bronze' }
  if (score >= 50) return { label: 'مقبول', color: 'text-muted' }
  return { label: 'يحتاج مراجعة', color: 'text-danger' }
}

export const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export const SURAHS = [
  { n: 1, name: 'الفاتحة', ayahs: 7 },
  { n: 2, name: 'البقرة', ayahs: 286 },
  { n: 3, name: 'آل عمران', ayahs: 200 },
  { n: 4, name: 'النساء', ayahs: 176 },
  { n: 5, name: 'المائدة', ayahs: 120 },
  { n: 6, name: 'الأنعام', ayahs: 165 },
  { n: 7, name: 'الأعراف', ayahs: 206 },
  { n: 8, name: 'الأنفال', ayahs: 75 },
  { n: 9, name: 'التوبة', ayahs: 129 },
  { n: 10, name: 'يونس', ayahs: 109 },
  { n: 36, name: 'يس', ayahs: 83 },
  { n: 55, name: 'الرحمن', ayahs: 78 },
  { n: 67, name: 'الملك', ayahs: 30 },
  { n: 78, name: 'النبأ', ayahs: 40 },
  { n: 112, name: 'الإخلاص', ayahs: 4 },
  { n: 113, name: 'الفلق', ayahs: 5 },
  { n: 114, name: 'الناس', ayahs: 6 },
]

export const surahName = (n) => (SURAHS.find((s) => s.n === Number(n)) || {}).name || `سورة رقم ${n}`

export const download = (href, filename) => {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  download(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export const playBeep = (ok = true) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = ok ? 880 : 220
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (ok ? 0.35 : 0.5))
    osc.start()
    osc.stop(ctx.currentTime + (ok ? 0.4 : 0.55))
    setTimeout(() => ctx.close(), 700)
  } catch (e) {
    /* Audio not available */
  }
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/* تطبيع رقم هاتف موحد: حذف المسافات والرموز وتوحيد البداية 0 / +213 */
export const normalizePhone = (p) => {
  let d = String(p || '').replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = '213' + d.slice(1)
  return d
}

export const isPhoneLike = (s) => /^[\d+][\d\s\-()]*$/.test(String(s || '').trim())

export const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

export const arNum = (n) =>
  Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 })
