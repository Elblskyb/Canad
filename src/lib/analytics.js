import { monthKey, todayStr, avg } from './helpers'

export const studentById = (db, id) => db.students.find((s) => s.id === id)
export const circleById = (db, id) => db.circles.find((c) => c.id === id)
export const userById = (db, id) => db.users.find((u) => u.id === id)
export const parentOf = (db, student) => db.users.find((u) => u.id === student?.parentId)

export function attendanceOf(db, studentId, from, to) {
  return db.attendance.filter((a) => a.studentId === studentId && (!from || a.date >= from) && (!to || a.date <= to))
}

export function attendanceRate(db, studentId, from, to) {
  const list = attendanceOf(db, studentId, from, to)
  if (!list.length) return 0
  const attended = list.filter((a) => a.status === 'present' || a.status === 'late').length
  return Math.round((attended / list.length) * 100)
}

export function recitationsOf(db, studentId, from, to) {
  return db.attendance && db.recitations.filter(
    (r) => r.studentId === studentId && (!from || r.date >= from) && (!to || r.date <= to),
  )
}

export function studentProgress(db, studentId) {
  const recs = db.recitations.filter((r) => r.studentId === studentId)
  const pages = recs.reduce((a, r) => a + (r.pages || 0), 0)
  const ayahs = recs.reduce((a, r) => a + Math.max(0, (r.toAyah || 0) - (r.fromAyah || 0) + 1), 0)
  const avgScore = recs.length ? Math.round(avg(recs.map((r) => r.score))) : 0
  const bySurah = {}
  recs.forEach((r) => {
    bySurah[r.surah] = (bySurah[r.surah] || 0) + (r.pages || 0)
  })
  return { pages, ayahs, avgScore, bySurah, juz: Math.floor(pages / 20), recCount: recs.length }
}

export function lastSessionDate(db, circleId) {
  const dates = db.attendance.filter((a) => a.circleId === circleId).map((a) => a.date)
  return dates.length ? dates.sort().slice(-1)[0] : null
}

export function absenteesOfLastSession(db, circleId) {
  const last = lastSessionDate(db, circleId)
  if (!last) return { date: null, students: [] }
  const students = db.students.filter((s) => s.circleId === circleId)
  const absent = students.filter((s) => {
    const rec = db.attendance.find((a) => a.studentId === s.id && a.circleId === circleId && a.date === last)
    return !rec || rec.status === 'absent'
  })
  return { date: last, students: absent }
}

export function examResultsOf(db, studentId) {
  const out = []
  db.exams.forEach((e) => {
    const r = e.results.find((x) => x.studentId === studentId)
    if (r) out.push({ examId: e.id, title: e.title, date: e.date, ...r })
  })
  return out.sort((a, b) => (a.date < b.date ? -1 : 1))
}

export function monthlySeries(db, studentId, month) {
  const from = month + '-01'
  const to = month + '-31'
  const recs = recitationsOf(db, studentId, from, to).sort((a, b) => (a.date < b.date ? -1 : 1))
  const att = attendanceOf(db, studentId, from, to)
  const byDayScore = recs.map((r) => ({ date: r.date, score: r.score, pages: r.pages }))
  const attByDate = {}
  att.forEach((a) => {
    attByDate[a.date] = a.status === 'present' ? 100 : a.status === 'late' ? 70 : a.status === 'excused' ? 40 : 0
  })
  let cum = 0
  const byDayPages = recs.map((r) => ({ date: r.date, pages: (cum += r.pages || 0) }))
  return { byDayScore, byDayPages, attendanceRate: attendanceRate(db, studentId, from, to), attByDate }
}

export function circleMonthly(db, circleId, month) {
  const from = month + '-01'
  const to = month + '-31'
  const students = db.students.filter((s) => s.circleId === circleId)
  const recs = db.recitations.filter((r) => r.circleId === circleId && r.date >= from && r.date <= to)
  const att = db.attendance.filter((a) => a.circleId === circleId && a.date >= from && a.date <= to)
  const attended = att.filter((a) => a.status === 'present' || a.status === 'late').length
  return {
    students,
    totalPages: recs.reduce((a, r) => a + (r.pages || 0), 0),
    avgScore: recs.length ? Math.round(avg(recs.map((r) => r.score))) : 0,
    attendanceRate: att.length ? Math.round((attended / att.length) * 100) : 0,
    perStudent: students.map((s) => ({
      student: s,
      pages: recs.filter((r) => r.studentId === s.id).reduce((a, r) => a + (r.pages || 0), 0),
      rate: attendanceRate(db, s.id, from, to),
      avgScore: (() => {
        const rs = recs.filter((r) => r.studentId === s.id)
        return rs.length ? Math.round(avg(rs.map((r) => r.score))) : 0
      })(),
    })),
  }
}

function inRange(dateStr, from, to) {
  return (!from || dateStr >= from) && (!to || dateStr <= to)
}

export function computeAwardCandidates(db, { from, to } = {}) {
  const f = from || monthKey(todayStr()) + '-01'
  const t = to || todayStr()
  const students = db.students

  const mem = students
    .map((s) => ({ s, v: recitationsOf(db, s.id, f, t).reduce((a, r) => a + (r.pages || 0), 0) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)

  const dil = students
    .map((s) => ({ s, v: attendanceRate(db, s.id, f, t) }))
    .sort((a, b) => b.v - a.v)

  const imp = students
    .map((s) => {
      const recs = recitationsOf(db, s.id, f, t).sort((a, b) => (a.date < b.date ? -1 : 1))
      const exams = examResultsOf(db, s.id).filter((e) => inRange(e.date, f, t))
      const evals = [
        ...recs.map((r) => ({ d: r.date, v: r.score })),
        ...exams.map((e) => ({ d: e.date, v: e.total })),
      ].sort((a, b) => (a.d < b.d ? -1 : 1))
      if (evals.length < 2) return { s, v: 0, detail: null }
      const half = Math.floor(evals.length / 2)
      const first = avg(evals.slice(0, half).map((e) => e.v))
      const second = avg(evals.slice(half).map((e) => e.v))
      return { s, v: Math.round(second - first), detail: { before: Math.round(first), after: Math.round(second) } }
    })
    .filter((x) => x.detail)
    .sort((a, b) => b.v - a.v)

  const parents = db.users.filter((u) => u.role === 'parent')
  const par = parents
    .map((p) => {
      const kids = students.filter((s) => s.parentId === p.id)
      const logs = db.parentLogs.filter((l) => l.parentId === p.id && inRange(l.reportDate, f, t)).length
      const kidRate = kids.length
        ? Math.round(avg(kids.map((k) => attendanceRate(db, k.id, f, t))))
        : 0
      return { p, kids, v: logs * 10 + kidRate, logs, kidRate }
    })
    .sort((a, b) => b.v - a.v)

  return {
    mostMemorized: mem[0] ? { id: mem[0].s.id, name: mem[0].s.name, metric: mem[0].v, unit: 'صفحة', detail: `${mem[0].v} صفحة محفوظة في الفترة المحددة` } : null,
    mostDiligent: dil[0] && dil[0].v > 0 ? { id: dil[0].s.id, name: dil[0].s.name, metric: dil[0].v, unit: '%', detail: `نسبة حضور ${dil[0].v}%` } : null,
    mostImproved: imp[0] ? { id: imp[0].s.id, name: imp[0].s.name, metric: imp[0].v, unit: 'نقطة', detail: `تحسن بمقدار ${imp[0].v} نقطة (من ${imp[0].detail.before} إلى ${imp[0].detail.after})` } : null,
    mostCarefulParent: par[0] && par[0].v > 0 ? { id: par[0].p.id, name: par[0].p.name, metric: par[0].logs, unit: 'تأكيد', detail: `${par[0].logs} تأكيد متابعة + حضور الأبناء بنسبة ${par[0].kidRate}%`, isParent: true, kids: par[0].kids.map((k) => k.name) } : null,
  }
}
