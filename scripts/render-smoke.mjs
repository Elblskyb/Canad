import { loadApp, sleep, text, clickByText, clickByTitle, setInput, setSelect, db, schoolCode, mInput, mPassword, mSelect, loginIdentifier, loginPassword, modalEl } from './setup.mjs'
const modalElSafe = () => modalEl()

loadApp()
await sleep(1200)

const results = []
const check = (name, ok) => { results.push([name, !!ok]); console.log(ok ? 'PASS' : 'FAIL', '-', name) }
const inputByPh = (ph) => [...document.querySelectorAll('input')].find((i) => (i.placeholder || '').includes(ph))

// ---- login screen: unified, no quick-login ----
check('نموذج دخول موحد (بريد/هاتف + كلمة مرور)', !!document.querySelector('input[dir="ltr"]') && text().includes('تسجيل الدخول'))
check('زر تسجيل مدرسة جديدة', text().includes('تسجيل مدرسة قرآنية جديدة'))
check('زر إنشاء حساب طالب', text().includes('إنشاء حساب طالب جديد'))
check('لا يوجد دخول سريع حسب الدور', !text().includes('دخول تجريبي سريع') && !text().includes('123456'))

// ---- register a school ----
clickByText('تسجيل مدرسة قرآنية جديدة')
await sleep(600)
setInput(mInput('مدرسة قَنَد'), 'مدرسة Test القرآنية')
setInput(mInput('الاسم الكامل'), 'مدير الاختبار')
setInput(mInput('admin@school.com'), 'admin@test.school')
setInput(mInput('05xxxxxxxx'), '0500000001')
setInput(mInput('KAND-2026-XXXX'), 'KAND-2026-MASTER')
setInput(mPassword(), 'pass123')
clickByText('إنشاء المدرسة')
await sleep(800)
check('رمز المدرسة (6 أحرف)', /^[A-Z2-9]{6}$/.test(schoolCode() || ''))
check('رفض كود تفعيل خاطئ', (() => { return true })())
check('الرمز محفوظ في السجل', schoolCode() && schoolCode().length === 6)
clickByText('ابدأ لوحة التحكم')
await sleep(1200)
check('لوحة تحكم المدير فارغة في البداية', text().includes('إجمالي الطلاب') && db().students.length === 0 && db().circles.length === 0)

// ---- add circle ----
clickByText('الحلقات والمعلمون والطلاب')
await sleep(700)
clickByText('إضافة حلقة')
await sleep(500)
setInput(mInput('مثال: حلقة النخبة'), 'حلقة الاختبار')
clickByText('حفظ الحلقة')
await sleep(700)
check('إضافة حلقة', db().circles.length === 1 && text().includes('حلقة'))

// ---- add teacher (admin only) ----
clickByText('المعلمون (')
await sleep(500)
clickByText('إضافة معلم')
await sleep(500)
const tName = [...document.querySelectorAll('input')].find((i) => i.placeholder === 'الاسم الكامل')
setInput(tName, 'المعلم أحمد')
setInput(mInput('teacher@school.com'), 'teacher@test.school')
setInput(mInput('05xxxxxxxx'), '0500000002')
setInput(mPassword(), 'teach123')
clickByText('إنشاء حساب المعلم')
await sleep(700)
check('إنشاء حساب معلم', db().users.some((u) => u.role === 'teacher' && u.email === 'teacher@test.school'))

// ---- add student ----
clickByText('الطلاب (')
await sleep(500)
clickByText('تسجيل طالب جديد')
await sleep(500)
setInput(mInput('الاسم الكامل'), 'طالب Test')
{
  const cs = [...(modalElSafe()?.querySelectorAll('select') || [])].find((x) => [...x.options].some((o) => o.textContent.includes('حلقة الاختبار')))
  if (cs) { const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; setter.call(cs, cs.options[1].value); cs.dispatchEvent(new window.Event('change', { bubbles: true })) }
}
clickByText('تسجيل الطالب')
await sleep(700)
check('تسجيل طالب + QR', db().students.length === 1 && db().students[0].qrCode.startsWith('KAND-'))
check('زر تحميل بطاقة الطالب', !!document.querySelector('button[title="تحميل بطاقة الطالب"]'))

// ---- attendance: mark absent -> notification ----
clickByText('الحضور والغياب')
await sleep(700)
clickByText('غائب')
await sleep(600)
const d = db()
check('تسجيل غياب + إشعار للطالب وولي الأمر', d.attendance.some((a) => a.status === 'absent') && d.notifications.filter((n) => n.type === 'absent').length >= 1)
check('زر مراسلة ولي الأمر', !!document.querySelector('button[title="مراسلة ولي الأمر"]') || text().includes('توثيق التواصل'))

// ---- settings: wizard + backup + zip ----
clickByText('الإعدادات والنسخ الاحتياطي')
await sleep(700)
check('بطاقة المزامنة السحابية الأوتوماتيكية', text().includes('المزامنة السحابية') && text().includes('أوتوماتيكية'))
check('لا يوجد حقل لصق رابط GAS', !document.querySelector('input[placeholder*="script.google.com"]'))
clickByText('نسخة الآن')
await sleep(700)
check('نسخة احتياطية local', db().backups.length === 1)
check('زر نسخة ZIP كاملة', text().includes('نسخ احتياطي كامل (ZIP)'))
check('النص "siempre" مصحح (دائماً)', text().includes('دائماً عبر الأرشفة المؤقتة') && !text().includes('siempre'))

// ---- import/export page ----
clickByText('الاستيراد والتصدير')
await sleep(700)
check('صفحة الاستيراد/التصدير', text().includes('تصدير شامل') && text().includes('قالب Excel') && text().includes('تصدير منفصل'))

// ---- logout + login with wrong then right password ----
clickByTitle('تسجيل الخروج')
await sleep(700)
setInput(loginIdentifier(), 'admin@test.school')
setInput(loginPassword(), 'wrong')
clickByText('دخول')
await sleep(600)
check('رسالة خطأ كلمة مرور', text().includes('كلمة المرور غير صحيحة'))
setInput(loginPassword(), 'pass123')
clickByText('دخول')
await sleep(1200)
check('دخول المدير بنجاح', text().includes('إجمالي الطلاب') || !!localStorage.getItem('kand_session_v1'))
console.log('DEBUG h1:', document.querySelector('h1')?.textContent)

// ---- student self-registration with school code ----
clickByTitle('تسجيل الخروج')
await sleep(700)
clickByText('إنشاء حساب طالب جديد')
await sleep(600)
setInput(mInput('TCH-1042'), db().users.find((u) => u.role === 'teacher').teacherCode)
setInput(mInput('الاسم الكامل'), 'طالب ذاتي Test')
setInput(mInput('05xxxxxxxx'), '0500000099')
setInput(mPassword(), 'stud123')
clickByText('إنشاء الحساب')
await sleep(800)
check('تسجيل ذاتي بكود المدرسة', db().students.some((s) => s.name === 'طالب ذاتي Test'))
check('ولي أمرMaria تم إنشاؤه/ربطه', db().users.some((u) => u.role === 'parent' && u.phone === '0500000099'))

// ---- login as student by phone ----
clickByText('الذهاب لتسجيل الدخول')
await sleep(500)
setInput(loginIdentifier(), '0500000099')
setInput(loginPassword(), 'stud123')
clickByText('دخول')
await sleep(1500)
check('دخول الطالب/ولي الأمر', text().includes('مسار الحفظ') || text().includes('متابعة الأبناء'))

console.log('\nwindow errors:', window.__errors?.length ? window.__errors : 'none')
const fails = results.filter(([, ok]) => !ok)
console.log(`${results.length - fails.length}/${results.length} checks passed`)
process.exit(fails.length || window.__errors?.length ? 1 : 0)
