import JSZip from 'jszip'
import { uid, todayStr } from './helpers'

const getSQL = () => {
  if (!getSQL.p) {
    getSQL.p = import('sql.js').then((m) => {
      const initSqlJs = m.default
      // في المتصفح/الأندرويد: الملف من public/؛ في Node (اختبارات): المسار الافتراضي من الحزمة
      return typeof document !== 'undefined' ? initSqlJs({ locateFile: () => '/sql-wasm.wasm' }) : initSqlJs()
    })
  }
  return getSQL.p
}

const norm = (k) => String(k ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

const pick = (row, names) => {
  for (const n of names) {
    const target = norm(n)
    for (const k of Object.keys(row)) {
      if (norm(k) === target) {
        const v = row[k]
        if (v !== null && v !== undefined && v !== '') return v
      }
    }
  }
  return null
}

/* استيراد نسخة احتياطية قديمة من تطبيق Flutter: zip يحتوي database/*.sqlite + student_photos/ + manifest.json */
export async function importLegacyZip(file, currentDb) {
  const zip = await JSZip.loadAsync(file)
  const names = Object.keys(zip.files)
  const sqliteName =
    names.find((n) => /(^|\/)database\/[^/]*\.sqlite3?$/i.test(n)) ||
    names.find((n) => /\.sqlite3?$/i.test(n)) ||
    names.find((n) => /\.db$/i.test(n))
  if (!sqliteName) throw new Error('لا يوجد ملف قاعدة بيانات (sqlite/.db) داخل الملف المضغوط')

  const buf = await zip.file(sqliteName).async('uint8array')
  const SQL = await getSQL()
  const sqldb = new SQL.Database(buf)
  const tableRows = sqldb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'android_%' AND name NOT LIKE 'room_%'")
  const tables = tableRows.length ? tableRows[0].values.flat() : []
  const read = (t) => {
    const res = sqldb.exec(`SELECT * FROM "${t.replace(/"/g, '""')}"`)
    if (!res.length) return []
    return res[0].values.map((vals) => Object.fromEntries(res[0].columns.map((c, i) => [c, vals[i]])))
  }
  const data = {}
  tables.forEach((t) => { data[t] = read(t) })
  sqldb.close()

  const photoNames = names.filter((n) => /student_photos\//i.test(n))
  const photoUrl = async (ref) => {
    if (!ref) return ''
    const base = String(ref).split('/').pop()
    const hit = photoNames.find((f) => f.split('/').pop() === base) || photoNames.find((f) => f.toLowerCase().endsWith(base.toLowerCase()))
    if (!hit) return ''
    const b64 = await zip.file(hit).async('base64')
    const mime = /\.png$/i.test(base) ? 'image/png' : /\.webp$/i.test(base) ? 'image/webp' : 'image/jpeg'
    return `data:${mime};base64,${b64}`
  }

  const findTable = (...cands) =>
    tables.find((t) => cands.some((c) => norm(t) === norm(c))) ||
    tables.find((t) => cands.some((c) => norm(t).includes(norm(c))))

  const out = { students: [], circles: [], attendance: [], recitations: [], exams: [] }
  const studentMap = {}
  const circleMap = {}

  const tStu = findTable('students', 'pupils', 'talib')
  if (tStu) {
    for (const r of data[tStu]) {
      const oldId = String(pick(r, ['id']) ?? 'row-' + uid())
      const id = 'stu-' + uid().slice(3, 10)
      studentMap[oldId] = id
      const photoRef = pick(r, ['photo', 'photo_url', 'image', 'avatar', 'picture', 'image_path'])
      out.students.push({
        id,
        userId: 'usr-' + id,
        name: String(pick(r, ['name', 'fullname', 'full_name', 'studentname', 'student_name']) || 'طالب'),
        birthDate: String(pick(r, ['birthdate', 'birth_date', 'dob', 'birthday']) || ''),
        circleId: null,
        teacherId: null,
        parentId: null,
        parentPhone: String(pick(r, ['parentphone', 'parent_phone', 'guardianphone', 'guardian_phone', 'phone']) || ''),
        address: String(pick(r, ['address', 'addr', 'city']) || ''),
        notes: String(pick(r, ['notes', 'note', 'remarks', 'description']) || ''),
        qrCode: `KAND-${id.toUpperCase()}`,
        photo: await photoUrl(photoRef),
        joinedAt: todayStr(),
        createdAt: new Date().toISOString(),
      })
    }
  }

  const tCir = findTable('circles', 'classes', 'groups', 'halqat')
  if (tCir) {
    for (const r of data[tCir]) {
      const oldId = String(pick(r, ['id']) ?? 'row-' + uid())
      const id = 'cir-' + uid().slice(3, 9)
      circleMap[oldId] = id
      let schedule = []
      const rawSched = pick(r, ['schedule', 'days'])
      if (typeof rawSched === 'string' && rawSched.trim().startsWith('[')) {
        try { schedule = JSON.parse(rawSched) } catch (e) { schedule = [] }
      } else if (rawSched) {
        const days = String(rawSched).split(/[,،;]/).map((x) => x.trim()).filter(Boolean)
        const time = String(pick(r, ['time', 'starttime', 'start_time', 'start']) || '09:00')
        const end = String(pick(r, ['end', 'endtime', 'end_time']) || '')
        schedule = days.map((d) => ({ day: d, time, end }))
      }
      out.circles.push({
        id,
        name: String(pick(r, ['name', 'title', 'classname', 'class_name', 'groupname']) || 'حلقة'),
        teacherId: null,
        schedule,
        ageGroup: String(pick(r, ['agegroup', 'age_group', 'age']) || ''),
        level: String(pick(r, ['level', 'stage']) || 'حفظ'),
        room: String(pick(r, ['room', 'hall', 'place']) || ''),
        start: schedule[0]?.time || '',
        end: schedule[0]?.end || '',
        createdAt: new Date().toISOString(),
      })
    }
  }

  if (tStu && tCir) {
    for (const r of data[tStu]) {
      const oldStu = String(pick(r, ['id']) ?? '')
      const oldCir = pick(r, ['circleid', 'circle_id', 'classid', 'class_id', 'groupid', 'group_id'])
      if (oldCir && studentMap[oldStu] && circleMap[String(oldCir)]) {
        const st = out.students.find((s) => s.id === studentMap[oldStu])
        if (st) st.circleId = circleMap[String(oldCir)]
      }
    }
  }

  const tAtt = findTable('attendance', 'attendances', 'hudur', 'presence')
  if (tAtt) {
    for (const r of data[tAtt]) {
      const oldStu = String(pick(r, ['studentid', 'student_id', 'pupilid', 'pupil_id']) ?? '')
      out.attendance.push({
        id: 'att-' + uid().slice(3, 10),
        studentId: studentMap[oldStu] || null,
        circleId: circleMap[String(pick(r, ['circleid', 'circle_id', 'classid', 'class_id']) ?? '')] || null,
        date: String(pick(r, ['date', 'day', 'createdat', 'created_at']) || todayStr()).slice(0, 10),
        status: String(pick(r, ['status', 'state']) || (pick(r, ['present']) ? 'present' : 'present')),
        createdAt: new Date().toISOString(),
      })
    }
  }

  const tRec = findTable('recitations', 'evaluations', 'tasmi', 'tilawa')
  if (tRec) {
    for (const r of data[tRec]) {
      const oldStu = String(pick(r, ['studentid', 'student_id', 'pupilid']) ?? '')
      out.recitations.push({
        id: 'rec-' + uid().slice(3, 10),
        studentId: studentMap[oldStu] || null,
        circleId: circleMap[String(pick(r, ['circleid', 'circle_id', 'classid']) ?? '')] || null,
        teacherId: null,
        date: String(pick(r, ['date', 'day', 'createdat', 'created_at']) || todayStr()).slice(0, 10),
        type: String(pick(r, ['type', 'kind', 'mode']) || 'حفظ جديد'),
        surah: Number(pick(r, ['surah', 'surah_id', 'surahindex', 'surah_index']) || 1),
        fromAyah: Number(pick(r, ['fromayah', 'from_ayah', 'from']) || 1),
        toAyah: Number(pick(r, ['toayah', 'to_ayah', 'to']) || 1),
        lines: Number(pick(r, ['lines', 'linecount', 'line_count']) || 0),
        pages: Number(pick(r, ['pages', 'pagecount', 'page_count', 'wajh']) || 0),
        score: Number(pick(r, ['score', 'mark', 'grade', 'evaluation', 'rate']) || 0),
        notes: String(pick(r, ['notes', 'note', 'remarks']) || ''),
        createdAt: new Date().toISOString(),
      })
    }
  }

  const tExa = findTable('exams', 'tests', 'quiz')
  if (tExa) {
    for (const r of data[tExa]) {
      out.exams.push({
        id: 'exa-' + uid().slice(3, 10),
        title: String(pick(r, ['title', 'name', 'examname', 'exam_name']) || 'اختبار'),
        type: String(pick(r, ['type', 'kind']) || 'شهري'),
        circleId: circleMap[String(pick(r, ['circleid', 'circle_id', 'classid']) ?? '')] || null,
        date: String(pick(r, ['date', 'day', 'createdat']) || todayStr()).slice(0, 10),
        createdBy: null,
        results: [],
        createdAt: new Date().toISOString(),
      })
    }
  }

  const summary = {
    students: out.students.length,
    circles: out.circles.length,
    attendance: out.attendance.length,
    recitations: out.recitations.length,
    exams: out.exams.length,
  }
  return { ...out, summary }
}
