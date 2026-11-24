import * as XLSX from 'xlsx'
import { downloadBlob, uid, todayStr } from './helpers'

const sheet = (wb, name, rows) => {
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, name)
}

const saveWb = (wb, filename) => {
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}

export function exportAll(db) {
  const wb = XLSX.utils.book_new()
  sheet(wb, 'الطلاب', db.students.map((s) => ({
    'الاسم': s.name, 'تاريخ الميلاد': s.birthDate || '', 'الحلقة': db.circles.find((c) => c.id === s.circleId)?.name || '', 'ولي الأمر': db.users.find((u) => u.id === s.parentId)?.name || '', 'هاتف ولي الأمر': db.users.find((u) => u.id === s.parentId)?.phone || '', 'رمز البطاقة': s.qrCode, 'تاريخ التسجيل': s.joinedAt,
  })))
  sheet(wb, 'الحلقات', db.circles.map((c) => ({
    'اسم الحلقة': c.name, 'المعلم': db.users.find((u) => u.id === c.teacherId)?.name || '', 'المواعيد': (c.schedule || []).map((s) => `${s.day} ${s.time}`).join('، '), 'الفئة العمرية': c.ageGroup || '', 'المستوى': c.level || '', 'القاعة': c.room || '',
  })))
  sheet(wb, 'الحضور', db.attendance.map((a) => ({
    'التاريخ': a.date, 'الطالب': db.students.find((s) => s.id === a.studentId)?.name || a.studentId, 'الحلقة': db.circles.find((c) => c.id === a.circleId)?.name || '', 'الحالة': a.status, 'الطريقة': a.method || '', 'وقت المسح': a.scannedAt || '',
  })))
  sheet(wb, 'الحفظ', db.recitations.map((r) => ({
    'التاريخ': r.date, 'الطالب': db.students.find((s) => s.id === r.studentId)?.name || r.studentId, 'النوع': r.type === 'hifz' ? 'حفظ جديد' : 'مراجعة', 'السورة': r.surah, 'من آية': r.fromAyah, 'إلى آية': r.toAyah, 'الصفحات': r.pages, 'التقييم': r.score, 'ملاحظات': r.notes || '',
  })))
  sheet(wb, 'الاختبارات', db.exams.flatMap((e) => e.results.map((r) => ({
    'عنوان الاختبار': e.title, 'التاريخ': e.date, 'الطالب': db.students.find((s) => s.id === r.studentId)?.name || r.studentId, 'الحفظ': r.memorization, 'التجويد': r.tajweed, 'الأداء الصوتي': r.voice, 'المجموع': r.total, 'التقدير': r.grade,
  }))))
  saveWb(wb, `kand-export-all-${todayStr()}.xlsx`)
}

export function exportStudents(db) {
  const wb = XLSX.utils.book_new()
  sheet(wb, 'الطلاب', db.students.map((s) => ({ 'الاسم': s.name, 'تاريخ الميلاد': s.birthDate || '', 'الحلقة': db.circles.find((c) => c.id === s.circleId)?.name || '', 'ولي الأمر': db.users.find((u) => u.id === s.parentId)?.name || '', 'هاتف ولي الأمر': db.users.find((u) => u.id === s.parentId)?.phone || '', 'رمز البطاقة': s.qrCode })))
  saveWb(wb, `students-${todayStr()}.xlsx`)
}

export function exportCircles(db) {
  const wb = XLSX.utils.book_new()
  sheet(wb, 'الحلقات', db.circles.map((c) => ({ 'اسم الحلقة': c.name, 'المعلم': db.users.find((u) => u.id === c.teacherId)?.name || '', 'المواعيد': (c.schedule || []).map((s) => `${s.day} ${s.time}`).join('، '), 'الفئة العمرية': c.ageGroup || '', 'المستوى': c.level || '' })))
  saveWb(wb, `circles-${todayStr()}.xlsx`)
}

export function exportAttendance(db) {
  const wb = XLSX.utils.book_new()
  sheet(wb, 'الحضور', db.attendance.map((a) => ({ 'التاريخ': a.date, 'الطالب': db.students.find((s) => s.id === a.studentId)?.name || '', 'الحالة': a.status })))
  saveWb(wb, `attendance-${todayStr()}.xlsx`)
}

export function exportRecitations(db) {
  const wb = XLSX.utils.book_new()
  sheet(wb, 'الحفظ', db.recitations.map((r) => ({ 'التاريخ': r.date, 'الطالب': db.students.find((s) => s.id === r.studentId)?.name || '', 'النوع': r.type, 'السورة': r.surah, 'من': r.fromAyah, 'إلى': r.toAyah, 'الصفحات': r.pages, 'التقييم': r.score })))
  saveWb(wb, `recitations-${todayStr()}.xlsx`)
}

export function studentTemplate() {
  const wb = XLSX.utils.book_new()
  sheet(wb, 'قالب الطلاب', [
    { 'الاسم': '', 'تاريخ الميلاد': 'YYYY-MM-DD', 'اسم الحلقة': '', 'اسم ولي الأمر': '', 'هاتف ولي الأمر': '' },
  ])
  saveWb(wb, 'student-template.xlsx')
}

export async function importStudentsFromFile(file, db, createCircle) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws)
  const added = []
  const newCircles = []
  rows.forEach((row, i) => {
    const name = String(row['الاسم'] || row['name'] || '').trim()
    if (!name) return
    const circleName = String(row['اسم الحلقة'] || row['circle'] || '').trim()
    let circleId = null
    if (circleName) {
      let c = db.circles.find((x) => x.name === circleName)
      if (!c) {
        c = { id: 'cir-' + uid().slice(3, 9), name: circleName, teacherId: db.users.find((u) => u.role === 'teacher')?.id || null, schedule: [{ day: 'السبت', time: '09:00' }], ageGroup: '', level: 'حفظ', room: '', createdAt: new Date().toISOString() }
        newCircles.push(c)
        db.circles.push(c)
      }
      circleId = c.id
    }
    const parentName = String(row['اسم ولي الأمر'] || row['parent'] || '').trim()
    const parentPhone = String(row['هاتف ولي الأمر'] || row['phone'] || '').trim()
    let parent = db.users.find((u) => u.role === 'parent' && u.phone && parentPhone && u.phone.replace(/\D/g, '') === parentPhone.replace(/\D/g, ''))
    if (!parent && parentName) {
      parent = { id: uid(), name: parentName, email: '', phone: parentPhone, password: '123456', role: 'parent', status: 'active', photo: '', createdAt: new Date().toISOString() }
      db.users.push(parent)
    }
    const sid = 'stu-' + uid().slice(3, 10)
    db.users.push({ id: 'usr-' + sid, name, email: '', phone: '', password: '123456', role: 'student', status: 'active', studentId: sid, photo: '', createdAt: new Date().toISOString() })
    const student = { id: sid, userId: 'usr-' + sid, name, birthDate: String(row['تاريخ الميلاد'] || '').slice(0, 10), circleId, parentId: parent?.id || null, qrCode: `KAND-${sid.toUpperCase()}`, photo: '', joinedAt: todayStr(), createdAt: new Date().toISOString() }
    db.students.push(student)
    added.push(student)
    if (i === 0 && createCircle) createCircle()
  })
  return { added, newCircles }
}
