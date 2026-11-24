import React, { useRef, useState } from 'react'
import {
  Settings as SettingsIcon, Link2, Cloud, CloudOff, DatabaseBackup, Code2, Copy, Check,
  Upload, Download, RotateCcw, Trash2, Archive, FlaskConical, Building2, ShieldCheck,
  Wand2, ExternalLink, FileArchive,
} from 'lucide-react'
import { useStore } from '../lib/storage'
import { useToast, Card, CardTitle, Badge, Modal, ConfirmDialog, Empty, Field } from '../components/ui'
import { CODE_GS } from '../lib/gas'
import { downloadBackupZip, restoreFromZip } from '../lib/zipbackup'
import { fmtDateTime, fmtDate } from '../lib/helpers'

export default function Settings() {
  const store = useStore()
  const { db } = store
  const toast = useToast()
  const [schoolName, setSchoolName] = useState(db.settings.schoolName)
  const [gasUrl, setGasUrl] = useState(db.settings.gasUrl || '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [remoteBackups, setRemoteBackups] = useState(null)
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [delBackup, setDelBackup] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const zipRef = useRef(null)

  const saveSchool = () => {
    store.update((d) => {
      d.settings.schoolName = schoolName.trim() || d.settings.schoolName
    })
    toast('تم حفظ اسم المدرسة')
  }

  const saveGasUrl = () => {
    store.setGasUrl(gasUrl)
    setTestResult(null)
    toast(gasUrl.trim() ? 'تم حفظ رابط الربط — جارٍ سحب البيانات من Sheets...' : 'تم إيقاف وضع الربط الحي — العمل محلياً')
  }

  const testConnection = async () => {
    if (!gasUrl.trim()) {
      toast('أدخل رابط Web App أولاً', 'error')
      return
    }
    setTesting(true)
    const res = await store.testConnection(gasUrl.trim())
    setTestResult(res)
    setTesting(false)
    toast(res.ok ? 'الاتصال ناجح — تم قراءة البيانات من Google Sheets' : 'فشل الاتصال: ' + (res.error || 'تأكد من النشر والصلاحيات'), res.ok ? 'success' : 'error')
  }

  const backupNow = async () => {
    setBusy(true)
    try {
      const entry = await store.backupNow()
      toast(entry.source === 'drive' ? 'تم حفظ النسخة في مجلد Kand_Backups على Drive' : 'تم حفظ نسخة احتياطية محلية')
    } catch (e) {
      toast('تعذر إنشاء النسخة: ' + e.message, 'error')
    }
    setBusy(false)
  }

  const backupZip = async () => {
    setBusy(true)
    try {
      await downloadBackupZip(db)
      store.update((d) => {
        d.backups.unshift({ id: 'zip-' + Date.now(), name: `نسخة ZIP كاملة — ${fmtDate(today())}`, createdAt: new Date().toISOString(), source: 'zip', data: null })
      })
      toast('تم تنزيل النسخة الاحتياطية الكاملة (ZIP) مع الصور')
    } catch (e) {
      toast('تعذر إنشاء ملف ZIP: ' + e.message, 'error')
    }
    setBusy(false)
  }

  const restoreZip = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const data = await restoreFromZip(f)
      store.importJSON(data)
      toast('تمت استعادة البيانات من ملف ZIP بنجاح')
    } catch (err) {
      toast('تعذر الاستعادة: ' + err.message, 'error')
    }
    e.target.value = ''
  }

  const loadRemote = async () => {
    setLoadingRemote(true)
    try {
      const files = await store.listRemoteBackups()
      setRemoteBackups(files)
      toast(`تم جلب ${files.length} نسخة من Drive`)
    } catch (e) {
      toast('تعذر الجلب من Drive: ' + e.message, 'error')
    }
    setLoadingRemote(false)
  }

  const restoreRemote = async (file) => {
    setBusy(true)
    try {
      await store.restoreRemoteBackup(file.id)
      toast(`تمت استعادة النسخة "${file.name}" من Drive`)
    } catch (e) {
      toast('تعذر الاستعادة: ' + e.message, 'error')
    }
    setBusy(false)
  }

  const restoreLocal = (b) => {
    store.update((d) => {
      Object.keys(b.data).forEach((k) => {
        if (k !== 'settings') d[k] = b.data[k]
      })
    })
    toast(`تمت استعادة النسخة "${b.name}"`)
  }

  const importFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        store.importJSON(reader.result)
        toast('تم استيراد البيانات من الملف بنجاح')
      } catch (err) {
        toast('ملف غير صالح: ' + err.message, 'error')
      }
    }
    reader.readAsText(f)
    e.target.value = ''
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kand-export-${db.settings.schoolId}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    toast('تم تصدير قاعدة البيانات كملف JSON')
  }

  const modeBadge = {
    local: { tone: 'neutral', label: 'وضع محلي (Offline-First)' },
    gas: { tone: 'accent', label: 'متصل بـ Google Sheets (سحابي مجاني)' },
    syncing: { tone: 'bronze', label: 'جارٍ المزامنة مع Sheets...' },
    'local-fallback': { tone: 'bronze', label: 'تعذر الوصول إلى Sheets — العمل محلياً مؤقتاً' },
  }[store.remoteStatus] || { tone: 'neutral', label: 'محلي' }

  const lastBackup = db.backups[0]

  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 xl:col-span-6">
        <CardTitle icon={Building2} title="إعدادات المدرسة" subtitle="تظهر في الشهادات والتقارير والبطاقات" />
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Field label="اسم المدرسة">
              <input className="input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
            </Field>
          </div>
          <button className="btn-primary !py-2.5" onClick={saveSchool}>حفظ</button>
        </div>
        <div className="mt-3 rounded-xl border border-line bg-card2 px-4 py-3 text-xs text-muted leading-6">
          <span className="font-semibold text-ink">رمز المدرسة (School Code): </span>
          <span className="tabular-nums font-bold text-bronze tracking-[0.25em]" dir="ltr">{registryCode()}</span>
          <span className="block mt-1">أرسله للمعلمين وأولياء الأمور ليربطوا حساباتهم بهذه المدرسة.</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <ShieldCheck size={13} className="text-accent shrink-0" />
          وضع التخزين: <Badge tone={modeBadge.tone}>{modeBadge.label}</Badge>
        </div>
      </Card>

      <Card className="col-span-12 xl:col-span-6">
        <CardTitle
          icon={Cloud}
          title="المزامنة السحابية — أوتوماتيكية 100%"
          subtitle="Supabase مدمج مباشرة في التطبيق (بدون Google Cloud Console أو أي إعداد يدوي) — Offline-First: يعمل بدون إنترنت ويتزامن تلقائياً عند عودة الاتصال"
        />
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-sm">
            {store.remoteStatus === 'cloud' ? <Badge tone="accent"><Cloud size={11} /> متصل بالسحابة — Real-time</Badge> : <Badge tone="neutral"><CloudOff size={11} /> يعمل محلياً (سيُزامَن عند عودة الاتصال)</Badge>}
            <span className="text-xs text-muted">لكل مدرسة school_id معزول في السحابة</span>
          </div>
          <p className="text-xs text-muted leading-6">
            لا حاجة لأي رابط أو سكربت: تسجيل المدرسة ينشئها في السحابة تلقائياً، Any تغيير في حضور/تسميع/7² synchronizes لحظياً بين هواتف المدير والمعلم والطالب.
          </p>
        </div>
      </Card>

      <Card className="col-span-12">
        <CardTitle
          icon={DatabaseBackup}
          title="النسخ الاحتياطي والاستعادة"
          subtitle={`عدد النسخ المحفوظة: ${db.backups.length}${lastBackup ? ` — آخر نسخة: ${fmtDateTime(lastBackup.createdAt)}` : ''} — الحذف يتم دائماً عبر الأرشفة المؤقتة`}
          action={
            <div className="flex gap-2">
              <button className="btn-primary !py-2 !text-xs" onClick={backupNow} disabled={busy}>
                <DatabaseBackup size={13} /> نسخة الآن
              </button>
              <button className="btn-bronze !py-2 !text-xs" onClick={backupZip} disabled={busy}>
                <FileArchive size={13} /> نسخ احتياطي كامل (ZIP)
              </button>
            </div>
          }
        />
        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted mb-2">النسخ المحفوظة</p>
            {db.backups.length === 0 ? (
              <Empty icon={DatabaseBackup} title="لا توجد نسخ بعد" hint="اضغط «نسخة الآن» أو «نسخة ZIP كاملة»" />
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {db.backups.map((b) => (
                  <div key={b.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card2 px-3.5 py-2.5">
                    <DatabaseBackup size={15} className="text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{b.name}</div>
                      <div className="text-[10px] text-muted">{fmtDateTime(b.createdAt)} {b.source === 'drive' && '— Drive'} {b.source === 'zip' && '— ZIP'}</div>
                    </div>
                    {b.data && (
                      <button className="btn-ghost !py-1.5 !px-2.5 !text-[11px]" onClick={() => restoreLocal(b)}>
                        <RotateCcw size={12} /> استعادة
                      </button>
                    )}
                    <button className="icon-btn !w-8 !h-8 hover:!text-danger hover:!border-danger/40" onClick={() => setDelBackup(b)} title="حذف (ينتقل إلى الأرشيف)">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted">نسخ Google Drive (Kand_Backups)</p>
              <button className="btn-ghost !py-1.5 !px-2.5 !text-[11px]" onClick={loadRemote} disabled={store.mode !== 'gas' || loadingRemote}>
                <Cloud size={12} /> {loadingRemote ? 'جارٍ الجلب...' : 'جلب القائمة'}
              </button>
            </div>
            {store.mode !== 'gas' ? (
              <p className="text-xs text-muted rounded-xl border border-line bg-card2 px-3.5 py-3">فعّل الربط بـ Sheets أولاً لعرض نسخ Drive</p>
            ) : remoteBackups === null ? (
              <p className="text-xs text-muted rounded-xl border border-line bg-card2 px-3.5 py-3">اضغط «جلب القائمة» لعرض النسخ المحفوظة في Drive</p>
            ) : remoteBackups.length === 0 ? (
              <p className="text-xs text-muted rounded-xl border border-line bg-card2 px-3.5 py-3">لا توجد نسخ في مجلد Kand_Backups بعد</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {remoteBackups.map((f) => (
                  <div key={f.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card2 px-3.5 py-2.5">
                    <Cloud size={15} className="text-teal2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" dir="ltr">{f.name}</div>
                      <div className="text-[10px] text-muted">{fmtDateTime(f.date)}</div>
                    </div>
                    <button className="btn-ghost !py-1.5 !px-2.5 !text-[11px]" onClick={() => restoreRemote(f)} disabled={busy}>
                      <RotateCcw size={12} /> استعادة
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-line flex flex-wrap gap-2">
          <button className="btn-ghost !py-2 !text-xs" onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> استيراد ملف JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importFile} />
          <button className="btn-ghost !py-2 !text-xs" onClick={() => zipRef.current?.click()}>
            <FileArchive size={13} /> استعادة من ملف ZIP
          </button>
          <input ref={zipRef} type="file" accept=".zip,application/zip" className="hidden" onChange={restoreZip} />
          <button className="btn-ghost !py-2 !text-xs" onClick={exportJSON}>
            <Download size={13} /> تصدير البيانات الحالية (JSON)
          </button>
        </div>
      </Card>

      <Card className="col-span-12">
        <CardTitle icon={Archive} title="الأرشيف المؤقت" subtitle="كل ما «حُذف» ينتقل هنا بدلاً من الحذف النهائي — يمكن استعادته" />
        {db.archive.length === 0 ? (
          <Empty icon={Archive} title="الأرشيف فارغ" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {db.archive.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-xl border border-line bg-card2 px-3.5 py-2 text-xs">
                <Badge tone="neutral">{a.kind === 'student' ? 'طالب' : a.kind === 'circle' ? 'حلقة' : a.kind === 'backup' ? 'نسخة احتياطية' : a.kind === 'recitation' ? 'تسميع' : a.kind === 'attendance' ? 'حضور' : 'اختبار'}</Badge>
                <span className="font-semibold">{a.record?.name || a.record?.title || a.record?.id}</span>
                <button className="text-accent font-semibold hover:underline" onClick={() => { store.restoreArchived(a.id); toast('تمت الاستعادة') }}>
                  استعادة
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <WizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} gasUrl={gasUrl} setGasUrl={setGasUrl} saveGasUrl={saveGasUrl} onShowCode={() => { setWizardOpen(false); setCodeOpen(true) }} toast={toast} />

      <Modal open={codeOpen} onClose={() => setCodeOpen(false)} title="كود الربط مع Google Sheets و Drive" subtitle="انسخه وضعه في Apps Script ثم انشره كتطبيق ويب" icon={Code2} wide>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              className="btn-primary !py-2 !text-xs"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(CODE_GS)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                  toast('تم نسخ الكود إلى الحافظة')
                } catch (e) {
                  toast('تعذر النسخ — حدّد الكود وانسخه يدوياً', 'error')
                }
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'تم النسخ' : 'نسخ الكود (نقطة واحدة)'}
            </button>
            <a className="btn-ghost !py-2 !text-xs" href={'data:text/plain;charset=utf-8,' + encodeURIComponent(CODE_GS)} download="Code.gs">
              <Download size={13} /> تحميل كملف
            </a>
          </div>
          <pre dir="ltr" className="text-left text-[11px] leading-5 bg-app border border-line rounded-xl p-4 overflow-auto max-h-[50vh] whitespace-pre" style={{ direction: 'ltr' }}>
            {CODE_GS}
          </pre>
          <p className="text-xs text-muted leading-6">
            التعليمات: أنشئ مشروع Apps Script جديد ← الصق الكود ← حفظ ← انشر (Deploy) ← تطبيق ويب (تنفيذ: أنا / الوصول: أي شخص) ←
            ألصق الرابط هنا في حقل «الربط السحابي». ينشئ الكود الجداول (Users, Circles, Students, Attendance, Recitations, Exams, ParentLogs...) تلقائياً،
            ويوفر نسخاً احتياطياً في Drive واستعادتها.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delBackup}
        onClose={() => setDelBackup(null)}
        title="حذف النسخة الاحتياطية"
        message={delBackup ? `ستُنقل النسخة "${delBackup.name}" إلى الأرشيف المؤقت بدلاً من الحذف النهائي.` : ''}
        confirmLabel="نقل إلى الأرشيف"
        requireDouble
        onConfirm={() => {
          if (delBackup) {
            store.deleteBackup(delBackup.id)
            toast('تم نقل النسخة إلى الأرشيف')
          }
        }}
      />
    </div>
  )
}

const today = () => new Date().toISOString().slice(0, 10)

function registryCode() {
  try {
    const reg = JSON.parse(localStorage.getItem('kand_registry_v1') || '{}')
    const sess = JSON.parse(localStorage.getItem('kand_session_v1') || 'null')
    const s = reg.schools?.find((x) => x.id === sess?.schoolId)
    return s?.code || '—'
  } catch (e) {
    return '—'
  }
}

function WizardModal({ open, onClose, gasUrl, setGasUrl, saveGasUrl, onShowCode, toast }) {
  const [copied, setCopied] = useState(false)
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title="معالج الربط السريع مع Google Sheets" subtitle="3 خطوات فقط — można العمل بدونه 100%" icon={Wand2} wide>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-line bg-card2 p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/25 text-accent flex items-center justify-center font-bold text-sm shrink-0">1</div>
          <div className="flex-1 text-sm">أنشئ مشروع Apps Script جديد بنقرة واحدة:</div>
          <button className="btn-primary !py-2 !text-xs" onClick={() => window.open('https://script.new', '_blank', 'noopener')}>
            <ExternalLink size={13} /> فتح script.new
          </button>
        </div>
        <div className="rounded-xl border border-line bg-card2 p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/25 text-accent flex items-center justify-center font-bold text-sm shrink-0">2</div>
          <div className="flex-1 text-sm">انسخ كود الربط الجاهز بنقرة واحدة والصقه في المشروع:</div>
          <button
            className="btn-primary !py-2 !text-xs"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(CODE_GS)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
                toast('تم نسخ الكود')
              } catch (e) {
                onShowCode()
              }
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'تم النسخ' : 'نسخ الكود'}
          </button>
          <button className="btn-ghost !py-2 !text-xs" onClick={onShowCode}><Code2 size={13} /> عرض الكود</button>
        </div>
        <div className="rounded-xl border border-line bg-card2 p-4">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/25 text-accent flex items-center justify-center font-bold text-sm shrink-0">3</div>
            <div className="text-sm flex-1">انشر التطبيق (Deploy ← Web App)، ثم ألصق الرابط هنا لمرة واحدة فقط:</div>
          </div>
          <div className="flex gap-2">
            <input className="input !text-xs flex-1" dir="ltr" placeholder="https://script.google.com/macros/s/.../exec" value={gasUrl} onChange={(e) => setGasUrl(e.target.value)} />
            <button className="btn-primary !py-2.5 !text-xs" onClick={() => { saveGasUrl(); toast('تم حفظ الرابط — يمكنك اختبار الاتصال من الإعدادات') }}>حفظ الرابط</button>
          </div>
        </div>
        <p className="text-xs text-muted leading-6">
          ملاحظة: التطبيق يعمل بالكامل بدون هذا الربط (Offline-First عبر التخزين المحلي + نسخ احتياطي ZIP/JSON). الربط السحابي يفعّل المزامنة والمشاركة بين الأجهزة.
        </p>
      </div>
    </Modal>
  )
}
