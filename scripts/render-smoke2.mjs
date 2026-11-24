import { loadApp, sleep, text, clickByText, clickByTitle, setInput, db } from './setup.mjs'

loadApp()
await sleep(1200)

const results = []
const check = (name, ok) => { results.push([name, !!ok]); console.log(ok ? 'PASS' : 'FAIL', '-', name) }

// wrong password error
setInput(document.querySelector('input[type="email"]'), 'admin@kand.school')
setInput(document.querySelector('input[type="password"]'), 'wrong')
clickByText('تسجيل الدخول')
await sleep(600)
check('رسالة خطأ كلمة المرور', text().includes('غير صحيحة'))

// correct login
setInput(document.querySelector('input[type="password"]'), '123456')
clickByText('تسجيل الدخول')
await sleep(1200)
check('دخول المدير', text().includes('إجمالي الطلاب'))

// theme toggle to light
clickByTitle('الوضع النهاري')
await sleep(400)
check('الوضع النهاري مفعّل', document.documentElement.classList.contains('light'))
clickByTitle('الوضع الليلي')
await sleep(300)

// add a circle
clickByText('الحلقات والطلاب')
await sleep(700)
clickByText('إضافة حلقة')
await sleep(500)
const nameInput = [...document.querySelectorAll('input')].find((i) => i.placeholder.includes('مثال'))
setInput(nameInput, 'حلقة Test تجريبية')
const sel = [...document.querySelectorAll('select')].find((x) => x.querySelector('option[value="usr-t1"]'))
const selSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
selSetter.call(sel, 'usr-t1')
sel.dispatchEvent(new window.Event('change', { bubbles: true }))
await sleep(300)
clickByText('حفظ الحلقة')
await sleep(700)
check('إضافة حلقة جديدة', text().includes('حلقة Test تجريبية'))
check('الحلقة في قاعدة البيانات', db().circles.some((c) => c.name === 'حلقة Test تجريبية'))

// register a student
clickByText('الطلاب (')
await sleep(500)
clickByText('تسجيل طالب جديد')
await sleep(500)
const sName = [...document.querySelectorAll('input')].find((i) => i.placeholder === 'الاسم الكامل')
setInput(sName, 'اختبار Erik Student')
clickByText('تسجيل الطالب')
await sleep(700)
check('تسجيل طالب + QR', db().students.some((s) => s.name === 'اختبار Erik Student' && s.qrCode.startsWith('KAND-')))
check('الطالب في الجدول', text().includes('اختبار Erik Student'))

// soft delete student -> archive
const row = [...document.querySelectorAll('tr')].find((r) => r.textContent.includes('اختبار Erik Student'))
const delBtn = row?.querySelector('button[title^="حذف"]')
delBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
await sleep(500)
clickByText('اضغط مرة أخرى للتأكيد النهائي')
await sleep(300)
clickByText('نقل إلى الأرشيف')
await sleep(700)
check('نقل إلى الأرشيف', db().archive.some((a) => a.kind === 'student' && a.record.name === 'اختبار Erik Student'))
check('أُزيل من القائمة', !text().includes('اختبار Erik Student'))
// restore from archive tab
clickByText('الأرشيف المؤقت')
await sleep(500)
clickByText('استعادة')
await sleep(700)
check('استعادة من الأرشيف', db().students.some((s) => s.name === 'اختبار Erik Student') && !db().archive.some((a) => a.record?.name === 'اختبار Erik Student'))

// attendance QR manual scan
clickByText('الحضور والغياب')
await sleep(700)
clickByText('مسح QR لتسجيل الحضور')
await sleep(600)
clickByText('إدخال الكود')
await sleep(400)
const codeInput = document.querySelector('input[dir="ltr"]')
setInput(codeInput, 'KAND-STU-001')
await sleep(300)
clickByText('تسجيل الحضور بالكود')
await sleep(800)
const today = new Date().toISOString().slice(0, 10)
check('تسجيل حضور عبر QR', db().attendance.some((a) => a.studentId === 'stu-001' && a.date === today && a.status === 'present' && a.method === 'qr'))
check('إشعار نجاح', text().includes('تم تسجيل حضور'))

// mark absent manually
clickByText('غائب', )
await sleep(500)

// exam results save as teacher
clickByTitle('تسجيل الخروج')
await sleep(700)
clickByText('معلم القرآن')
await sleep(1200)
clickByText('الاختبارات')
await sleep(700)
clickByText('تسجيل / تعديل النتائج')
await sleep(600)
const scoreInputs = document.querySelectorAll('input[type="number"]')
check('محرر نتائج الاختبارات', scoreInputs.length >= 3)
clickByText('حفظ النتائج وحساب المعدل')
await sleep(800)
const ex = db().exams.find((e) => e.results.length && typeof e.results[0].total === 'number' && !!e.results[0].grade)
check('احتساب المعدل والتقدير', !!ex)

// backup + delete-to-archive + restore
clickByTitle('تسجيل الخروج')
await sleep(700)
clickByText('مدير المدرسة')
await sleep(1200)
clickByText('الإعدادات والنسخ الاحتياطي')
await sleep(700)
const before = db().backups.length
clickByText('نسخة احتياطية الآن')
await sleep(800)
check('إنشاء نسخة احتياطية', db().backups.length === before + 1)
clickByTitle('حذف (ينتقل إلى الأرشيف)')
await sleep(500)
clickByText('اضغط مرة أخرى للتأكيد النهائي')
await sleep(300)
clickByText('نقل إلى الأرشيف')
await sleep(700)
check('حذف النسخة إلى الأرشيف', db().archive.some((a) => a.kind === 'backup'))
clickByText('استعادة')
await sleep(700)
check('استعادة النسخة', db().backups.length === before + 1 && !db().archive.some((a) => a.kind === 'backup'))

// export JSON link exists
check('تصدير JSON', !!clickByText('تصدير البيانات الحالية'))

console.log('\nwindow errors:', window.__errors?.length ? window.__errors : 'none')
const fails = results.filter(([, ok]) => !ok)
console.log(`${results.length - fails.length}/${results.length} checks passed`)
process.exit(fails.length ? 1 : 0)
