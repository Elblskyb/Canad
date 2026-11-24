# قَنَد — نظام إدارة المدارس القرآنية

تطبيق ويب + أندرويد (Capacitor) عربي بالكامل (RTL)، **Multi-Tenant** (لكل مدرسة schoolId ورمز خاص)، **Offline-First** مع مزامنة سحابية مجانية اختيارية (Google Apps Script أو Firebase Spark).

## التشغيل (ويب)
```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # dist/ (webDir لتطبيق Android)
npm run test:smoke # 40 فحص jsdom
```

## الأندرويد (APK)
```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug   # android/app/build/outputs/apk/debug/app-debug.apk
```
أو CI تلقائي: `.github/workflows/build-apk.yml` يبني APK ويرفعه كـ artifact عند كل push لـ main (مع توليد الأيقونات من `assets/icon.png`).

## البنية
- تسجيل مدرسة جديدة → إنشاء حساب مدير + **رمز مدرسة (School Code)**؛ المعلمون يُنشأون حصراً من لوحة المدير؛ الطلاب يسجّلون ذاتياً برمز المدرسة + هاتف ولي الأمر + صورة.
- دخول موحد (بريد/هاتف + كلمة مرور) يكتشف المدرسة والدور تلقائياً.
- حضور عبر QR (كاميرا خلفية + إذن صريح + بدائل يدوية)، إشعارات داخل التطبيق (Modal إلزامي للطالب/ولي الأمر) + Push عبر Capacitor، مراسلة ولي الأمر عبر واتساب/SMS.
- تسميع/اختبارات/تقارير/شهادات تكريمية، نسخ احتياطي ZIP كامل + JSON + Drive، استيراد/تصدير Excel، بطاقة طالب قابلة للطباعة، تهيئة آمنة للمعلم (نسخة صامتة + إشعار مدير قبل التصفير).
- حذف آمن عبر الأرشيف المؤقت (تأكيد مزدوج).

## ملفات رئيسية
```
src/lib        storage.jsx (multi-tenant + GAS), seed.js, gas.js (Code.gs), excel.js, zipbackup.js, contact.js, push.js, photo.js, studentcard.js, cert.js, analytics.js
src/pages      Login, dashboards, Circles, Attendance, Recitations, Exams, Reports, Certificates, Settings, ImportExport, Profile, MyQR
android/       مشروع Capacitor (أذونات CAMERA + POST_NOTIFICATIONS + queries لواتساب/SMS)
```
