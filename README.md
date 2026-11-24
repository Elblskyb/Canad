# كند — مدرسة القرآن الكريم

تطبيق ويب عربي كامل (RTL) لإدارة مدرسة قرآنية: React 18 + Vite + Tailwind CSS + lucide-react + Recharts + react-qr-code + html5-qrcode + jsPDF.

## التشغيل

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # build إنتاج إلى dist/
npm run test:smoke # فحص آلي (jsdom) يغطي الأدوار الأربعة والتدفقات الأساسية
```

## الحسابات التجريبية (كلمة المرور: 123456)

| الدور | البريد |
|---|---|
| مدير المدرسة | admin@kand.school |
| معلم القرآن | teacher@kand.school |
| طالب | student1@kand.school |
| ولي أمر | parent@kand.school |

أو استخدم أزرار «دخول تجريبي سريع» في صفحة الدخول.

## البنية

```
src/
  lib/
    storage.jsx    # StorageService (LocalStorage ←→ Google Apps Script) + المصادقة وصلاحيات RBAC
    seed.js        # بيانات تجريبية عربية واقعية
    gas.js         # كود Code.gs الجاهز للنسخ (Sheets + Drive + Kand_Backups)
    analytics.js   # إحصائيات، تنبيه الغائبين، محرك المرشحين للتكريم
    cert.js        # توليد الشهادات التكريمية على Canvas (PNG/PDF)
    helpers.js
  components/      # ui.jsx, layout.jsx (sidebar/shريط سفلي), qr.jsx (بطاقة + ماسح)
  pages/           # Login, dashboards, Circles, Attendance, Recitations, Exams, Reports, Certificates, Settings, MyQR
```

## أوضاع التخزين

1. **LocalStorage + بيانات تجريبية** — يعمل فوراً عند أول تشغيل.
2. **Google Apps Script** — من «الإعدادات ← الربط الحي»: ألصق رابط Web App واختبر الاتصال. زر «كود الربط (Code.gs)» يعرض الكود جاهزاً للنسخ — ينشئ الجداول تلقائياً (Users, Circles, Students, Attendance, Recitations, Exams, ParentLogs...) مع نسخ احتياطي إلى Google Drive (مجلد Kand_Backups) واستعادتها.

## الأدوار الأربعة (RBAC)

مدير المدرسة / معلم القرآن / طالب / ولي أمر — كل واجهة بصلاحياتها: مسح QR للحضور، تنبيه الغائبين عن آخر حصة، التسميع اليومي، الاختبارات بمعدل وتقدير تلقائي، تقارير شهرية (Recharts) قابلة للطباعة و PDF، محرك الشهادات التكريمية (4 فئات، تحميل PNG أو PDF)، ولوحة ولي الأمر مع «تأكيد الاطلاع والمتابعة».

## حذف آمن

لا يوجد حذف نهائي: كل حذف (طالب / حلقة / تسميع / نسخة احتياطية) ينتقل إلى «الأرشيف المؤقت» مع تأكيد مزدوج، ويمكن استعادته من صفحة الإعدادات.
