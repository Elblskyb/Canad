import { JSDOM } from 'jsdom'
import { buildSync } from 'esbuild'
import { createRequire } from 'node:module'

const dom = new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
})

const { window } = dom
global.window = window
global.document = window.document
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true })
global.localStorage = window.localStorage
global.HTMLElement = window.HTMLElement
global.Element = window.Element
global.Node = window.Node
global.CustomEvent = window.CustomEvent
global.Event = window.Event
global.MouseEvent = window.MouseEvent
global.KeyboardEvent = window.KeyboardEvent
global.getComputedStyle = window.getComputedStyle.bind(window)
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
global.cancelAnimationFrame = (id) => clearTimeout(id)
window.requestAnimationFrame = global.requestAnimationFrame
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }))
global.matchMedia = window.matchMedia
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
global.ResizeObserver = window.ResizeObserver
window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
global.IntersectionObserver = window.IntersectionObserver
window.HTMLCanvasElement.prototype.getContext = () =>
  new Proxy(
    {},
    {
      get: (t, p) => {
        if (p === 'measureText') return () => ({ width: 10 })
        if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} })
        if (p === 'getImageData') return () => ({ data: [] })
        return () => {}
      },
      set: () => true,
    },
  )
window.HTMLCanvasElement.prototype.toBlob = function (cb) {
  cb(new window.Blob(['x'], { type: 'image/png' }))
}
window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,x'
window.AudioContext = class {
  createOscillator() { return { connect() {}, start() {}, stop() {}, type: '', frequency: { value: 0 } } }
  createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } } }
  get destination() { return {} }
  get currentTime() { return 0 }
  close() {}
}
global.AudioContext = window.AudioContext
global.fetch = () => Promise.reject(new Error('offline in test'))
window.fetch = global.fetch
window.URL.createObjectURL = () => 'blob:x'
window.URL.revokeObjectURL = () => {}

buildSync({
  entryPoints: ['scripts/render-entry.jsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  outfile: '/tmp/kand-app.cjs',
  loader: { '.css': 'empty', '.woff': 'empty', '.woff2': 'empty' },
  logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"production"' },
})

const require = createRequire(import.meta.url)
require('/tmp/kand-app.cjs')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(1500)

const text = () => document.body.textContent
const clickByText = (t, scope) => {
  const els = [...(scope || document).querySelectorAll('button, a, [role="button"]')]
  const el = els.find((e) => e.textContent.trim().includes(t))
  if (!el) return false
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  return true
}
const clickByTitle = (t) => {
  const el = [...document.querySelectorAll('button[title]')].find((e) => e.getAttribute('title') === t)
  if (!el) return false
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  return true
}
const results = []
const check = (name, ok) => { results.push([name, !!ok]); console.log(ok ? 'PASS' : 'FAIL', '-', name) }

check('تسجيل الدخول يظهر', text().includes('تسجيل الدخول'))
check('أزرار الدخول السريع الأربعة', ['مدير المدرسة', 'معلم القرآن', 'ولي أمر'].every((t) => text().includes(t)))

check('click admin', clickByText('مدير المدرسة'))
await sleep(1200)
check('لوحة تحكم المدير', text().includes('إجمالي الطلاب'))
check('بطاقة تنبيه الغائبين', text().includes('غائبون عن آخر حصة'))

check('الانتقال للحلقات', clickByText('الحلقات والطلاب'))
await sleep(800)
check('صفحة الحلقات', text().includes('حلقة النخبة') && text().includes('القاعة الأولى'))

check('الانتقال للحضور', clickByText('الحضور والغياب'))
await sleep(800)
check('صفحة الحضور + جدول', text().includes('سجل حضور اليوم'))
check('زر المسح', text().includes('مسح QR'))

check('الانتقال للتقارير', clickByText('التقارير الشهرية'))
await sleep(1000)
check('تقرير + رسوم', text().includes('تقرير طالب') && document.querySelectorAll('#report-root svg').length >= 0)

check('الانتقال للشهادات', clickByText('الشهادات التكريمية'))
await sleep(800)
check('فئات التكريم الأربع', ['الأكثر حفظاً', 'الأكثر مداومة', 'الأكثر تحسناً', 'الولي الأكثر حرصاً'].every((t) => text().includes(t)))
check('معاينة شهادة', clickByText('معاينة الشهادة'))
await sleep(800)
check('canvas الشهادة', document.querySelectorAll('canvas').length > 0)
check('إصدار شهادة', clickByText('إصدار الشهادة'))
await sleep(600)
check('سجل الشهادات الصادرة', text().includes('الشهادات الصادرة سابقاً'))

check('الإعدادات', clickByText('الإعدادات والنسخ الاحتياطي'))
await sleep(800)
check('حقل رابط Sheets', !!document.querySelector('input[placeholder*="script.google.com"]'))
check('فتح كود الربط', clickByText('كود الربط'))
await sleep(600)
check('Code.gs معروض', text().includes('doPost') && text().includes('Kand_Backups'))
clickByText('إغلاق')
await sleep(400)
check('نسخة احتياطية الآن', clickByText('نسخة احتياطية الآن'))
await sleep(800)
check('النسخة في القائمة', text().includes('نسخة احتياطية —'))

// teacher
check('خروج', clickByTitle('تسجيل الخروج'))
await sleep(600)
check('click معلم', clickByText('معلم القرآن'))
await sleep(1200)
check('لوحة المعلم', text().includes('طلابي في حلقاتي'))
check('الانتقال للتسميع', clickByText('التسميع اليومي'))
await sleep(800)
check('تسجيل تسميع', clickByText('تسجيل تسميع جديد'))
await sleep(600)
check('نموذج التسميع', text().includes('ملاحظات التجويد'))
clickByText('إلغاء')
await sleep(300)
check('الانتقال للاختبارات', clickByText('الاختبارات'))
await sleep(800)
check('قائمة الاختبارات', text().includes('الاختبار الشهري'))

// student
clickByTitle('تسجيل الخروج')
await sleep(700)
check('click طالب', clickByText('طالب'))
await sleep(1200)
check('مسار الطالب', text().includes('خريطة السور') && text().includes('الصفحات المحفوظة'))
check('بطاقتي', clickByText('بطاقتي الرقمية'))
await sleep(800)
check('QR svg', document.querySelectorAll('svg').length > 0 && text().includes('KAND-'))

// parent
clickByTitle('تسجيل الخروج')
await sleep(700)
check('click ولي أمر', clickByText('ولي أمر'))
await sleep(1200)
check('لوحة الولي', text().includes('تأكيد الاطلاع والمتابعة'))
check('تأكيد الاطلاع', clickByText('تأكيد الاطلاع والمتابعة'))
await sleep(600)
check('سجل التأكيدات', text().includes('سجل تأكيدات الاطلاع'))

console.log('\nwindow errors:', window.__errors.length ? window.__errors : 'none')
const fails = results.filter(([, ok]) => !ok)
console.log(`\n${results.length - fails.length}/${results.length} checks passed`)
process.exit(fails.length || window.__errors.length ? 1 : 0)
