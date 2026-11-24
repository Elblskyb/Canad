import initSqlJs from 'sql.js'
import JSZip from 'jszip'
import { importLegacyZip } from '../src/lib/legacy.js'

const SQL = await initSqlJs()
const db = new SQL.Database()
db.run(`create table students (id integer primary key, name text, birth_date text, parent_phone text, address text, notes text, photo text, circle_id integer)`)
db.run(`create table classes (id integer primary key, name text, days text, time text)`)
db.run(`create table attendance (id integer primary key, student_id integer, class_id integer, date text, status text)`)
db.run(`create table evaluations (id integer primary key, student_id integer, surah int, score int, date text)`)
db.run(`insert into students values (1,'أحمد محمد','2012-05-01','0500000001','الجزائر','ملاحظة','ahmed.jpg',1)`)
db.run(`insert into students values (2,'فاطمة علي','2013-02-02','','','','',null)`)
db.run(`insert into classes values (1,'حلقة النخبة','السبت,الأحد','17:00')`)
db.run(`insert into attendance values (1,1,1,'2026-11-20','present')`)
db.run(`insert into evaluations values (1,1,2,9,'2026-11-21')`)
const buf = db.export()

const zip = new JSZip()
zip.file('database/quran_school_manager.sqlite', buf)
zip.file('student_photos/ahmed.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]))
zip.file('manifest.json', JSON.stringify({ app: 'quran_school_manager', version: 1 }))
const out = await zip.generateAsync({ type: 'uint8array' })

const res = await importLegacyZip(out, {})
console.log('summary:', JSON.stringify(res.summary))
console.log('student0:', JSON.stringify({ ...res.students[0], photo: res.students[0].photo.slice(0, 40) + '...' }))
console.log('circle0:', JSON.stringify(res.circles[0]))
console.log('attendance0:', JSON.stringify(res.attendance[0]))
console.log('recitation0:', JSON.stringify(res.recitations[0]))
const ok = res.summary.students === 2 && res.summary.circles === 1 && res.summary.attendance === 1 && res.summary.recitations === 1
  && res.students[0].photo.startsWith('data:image/jpeg;base64,')
  && res.students[0].circleId === res.circles[0].id
  && res.attendance[0].studentId === res.students[0].id
  && res.students[0].parentPhone === '0500000001'
console.log(ok ? 'LEGACY-IMPORT-TEST: PASS' : 'LEGACY-IMPORT-TEST: FAIL')
process.exit(ok ? 0 : 1)
