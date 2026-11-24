import { loadApp, sleep, text, clickByText, clickByTitle, setInput, setSelect, db, schoolCode, mInput, mPassword, mSelect, loginIdentifier, loginPassword } from './setup.mjs'

loadApp()
await sleep(1200)

const results = []
const check = (name, ok) => { results.push([name, !!ok]); console.log(ok ? 'PASS' : 'FAIL', '-', name) }
const inputByPh = (ph) => [...document.querySelectorAll('input')].find((i) => (i.placeholder || '').includes(ph))

async function registerSchool() {
  clickByText('تسجيل مدرسة قرآنية جديدة')
  await sleep(500)
  setInput(mInput('مدرسة قَنَد'), 'مدرسةSmoke2')
  setInput(mInput('الاسم الكامل'), 'مدير 2')
  setInput(mInput('بريدك الإلكتروني'), 'admin2@test.school')
  setInput(mInput('05000000000'), '0500000010')
  setInput(mInput('KAND-2026-XXXX'), 'KAND-2026-DEMO1')
  setInput(mPassword(), 'pass123')
  clickByText('إنشاء المدرسة')
  await sleep(700)
  clickByText('ابدأ لوحة التحكم')
  await sleep(1000)
}

await registerSchool()
check('تسجيل مدرسة', !!schoolCode())

// add teacher + circle + student
clickByText('الحلقات والمعلمون والطلاب')
await sleep(600)
clickByText('المعلمون (')
await sleep(400)
clickByText('إضافة معلم')
await sleep(400)
setInput(mInput('الاسم الكامل'), 'معلم2')
setInput(mInput('البريد الإلكتروني'), 't2@test.school')
setInput(mPassword(), 't12345')
clickByText('إنشاء حساب المعلم')
await sleep(600)

clickByText('الحلقات (')
await sleep(400)
clickByText('إضافة حلقة')
await sleep(400)
setInput(mInput('مثال: حلقة النخبة'), 'حلقة smoke2')
const tsel = [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.textContent.includes('معلم2')))
if (tsel) setSelect(tsel, tsel.querySelector('option[value^="id-"]')?.value || tsel.options[1]?.value)
await sleep(200)
clickByText('حفظ الحلقة')
await sleep(600)
check('حفظ حلقة مع تعيين معلم', db().circles.length === 1 && !!db().circles[0].teacherId)

clickByText('الطلاب (')
await sleep(400)
clickByText('تسجيل طالب جديد')
await sleep(400)
setInput(mInput('الاسم الكامل'), 'طالب smoke2')
const csel = [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.textContent.includes('حلقة smoke2')))
if (csel) setSelect(csel, csel.options[1]?.value)
await sleep(200)
clickByText('تسجيل الطالب')
await sleep(600)
check('تسجيل طالب في الحلقة', db().students.length === 1 && !!db().students[0].circleId)

// teacher login -> recitation add/edit/delete
clickByTitle('تسجيل الخروج')
await sleep(600)
setInput(loginIdentifier(), 't2@test.school')
setInput(loginPassword(), 't12345')
clickByText('دخول')
await sleep(1200)
check('دخول المعلم', text().includes('طلابي في حلقاتي'))

clickByText('التسميع اليومي')
await sleep(600)
clickByText('تسجيل تسميع جديد')
await sleep(500)
const ssel = mSelect()
setSelect(ssel, ssel.options[1]?.value)
await sleep(200)
clickByText('حفظ الجلسة')
await sleep(600)
check('إضافة تسميع', db().recitations.length === 1)

// edit recitation
clickByTitle('تعديل')
await sleep(400)
const scoreInput = [...document.querySelectorAll('input[type="number"]')].find((i) => i.max === '10' || i.getAttribute('max') === '10')
if (scoreInput) setInput(scoreInput, '9')
clickByText('حفظ الجلسة')
await sleep(600)
check('تعديل جلسة التسميع', db().recitations.length === 1 && db().recitations[0].score === 9)

// delete to archive + restore
clickByTitle('حذف (ينتقل إلى الأرشيف)')
await sleep(400)
clickByText('اضغط مرة أخرى للتأكيد النهائي')
await sleep(300)
clickByText('نقل إلى الأرشيف')
await sleep(600)
check('حذف تسميع إلى الأرشيف', db().recitations.length === 0 && db().archive.some((a) => a.kind === 'recitation'))

// exam create + results
clickByText('الاختبارات')
await sleep(600)
clickByText('إعداد اختبار جديد')
await sleep(400)
setInput(mInput('مثال: اختبار الجزء'), 'اختبار smoke2')
clickByText('إنشاء الاختبار')
await sleep(600)
clickByText('تسجيل / تعديل النتائج')
await sleep(500)
clickByText('حفظ النتائج وحساب المعدل')
await sleep(700)
const ex = db().exams.find((e) => e.results.length)
check('حساب المعدل والتقدير تلقائياً', !!ex && typeof ex.results[0].total === 'number' && !!ex.results[0].grade)

// certificate issue (teacher)
clickByText('التكريمات')
await sleep(600)
{
  const cardSelects = [...document.querySelectorAll('select')].slice(1)
  if (cardSelects[0] && db().students[0]) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
    setter.call(cardSelects[0], db().students[0].id)
    cardSelects[0].dispatchEvent(new window.Event('change', { bubbles: true }))
    await sleep(300)
  }
}
clickByText('معاينة الشهادة')
await sleep(700)
check('canvas الشهادة', document.querySelectorAll('canvas').length > 0)
clickByText('إصدار الشهادة')
await sleep(600)
check('إصدار شهادة في السجل', db().certificates.length === 1)

// teacher profile page
clickByText('ملفي الشخصي')
await sleep(700)
check('صفحة ملف المعلم', text().includes('عدد طلابي') && text().includes('حضور حلقاتي'))

// safe reset: backup + admin notification + clear
clickByText('لوحة المعلم')
await sleep(600)
clickByText('تهيئة البيانات (Safe Reset)')
await sleep(500)
clickByText('اضغط مرة أخرى للتأكيد النهائي')
await sleep(300)
clickByText('حفظ صامت ثم تهيئة')
await sleep(1500)
const d2 = db()
check('Safe Reset: نسخة احتياطية صامتة', d2.backups.length >= 1)
check('Safe Reset: إشعار للمدير', d2.notifications.some((n) => n.type === 'reset'))
check('Safe Reset: تصفير بيانات حلقات المعلم', d2.recitations.length === 0 && d2.exams.length === 0)

// student login -> notification gate modal
clickByTitle('تسجيل الخروج')
await sleep(600)
setInput(loginIdentifier(), schoolCode()) // use school code path
// register student first
clickByText('إنشاء حساب طالب جديد')
await sleep(500)
setInput(mInput('TCH-1042'), db().users.find((u) => u.role === 'teacher').teacherCode)
setInput(mInput('الاسم الكامل'), 'طالب إشعارات')
setInput(mInput('05000000000'), '0500000077')
setInput(mPassword(), 's12345')
clickByText('إنشاء الحساب')
await sleep(700)
// create absence notification for this student via admin later; here just login
clickByText('الذهاب لتسجيل الدخول')
await sleep(500)
setInput(loginIdentifier(), '0500000077')
setInput(loginPassword(), 's12345')
clickByText('دخول')
await sleep(1500)
check('دخول الطالب/ولي الأمر (ملف موحد)', text().includes('مسار الحفظ') || text().includes('متابعة الأبناء'))

console.log('\nwindow errors:', window.__errors?.length ? window.__errors : 'none')
const fails = results.filter(([, ok]) => !ok)
console.log(`${results.length - fails.length}/${results.length} checks passed`)
process.exit(fails.length || window.__errors?.length ? 1 : 0)
