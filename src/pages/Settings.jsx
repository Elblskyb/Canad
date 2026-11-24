import React, { useRef, useState } from 'react'
import {
  Cloud, CloudOff, DatabaseBackup, Upload, Download, RotateCcw, Trash2, Archive, Building2, ShieldCheck,
  FileArchive,
} from 'lucide-react'
import { useStore } from '../lib/storage'
import { useToast, Card, CardTitle, Badge, ConfirmDialog, Empty, Field } from '../components/ui'
import { downloadBackupZip, restoreFromZip } from '../lib/zipbackup'
import { fmtDateTime, fmtDate } from '../lib/helpers'

export default function Settings() {
  const store = useStore()
  const { db } = store
  const toast = useToast()
  const [schoolName, setSchoolName] = useState(db.settings.schoolName)
  const [delBackup, setDelBackup] = useState(null)
  const [busy, setBusy] = useState(false)
  const [syncError, setSyncError] = useState('')
  const fileRef = useRef(null)
  const zipRef = useRef(null)

  const saveSchool = () => {
    store.update((d) => {
      d.settings.schoolName = schoolName.trim() || d.settings.schoolName
    })
    toast('تم حفظ اسم المدرسة')
  }

  const backupNow = async () => {
    setBusy(true)
    try {
      await store.backupNow()
      toast('تم حفظ نسخة احتياطية الآن')
    } catch (e) {
      toast('تعذر إنشاء النسخة الاحتياطية: ' + e.message, 'error')
    }
    setBusy(false)
  }

  const backupZip = async () => {
    setBusy(true)
    try {
      await downloadBackupZip(db)
      store.update((d) => {
        d.backups.unshift({ id: 'zip-' + Date.now(), name: `نسخة مضغوطة كاملة — ${fmtDate(today())}`, createdAt: new Date().toISOString(), source: 'zip', data: null })
      })
      toast('تم تنزيل النسخة المضغوطة الكاملة مع الصور')
    } catch (e) {
      toast('تعذر إنشاء الملف المضغوط: ' + e.message, 'error')
    }
    setBusy(false)
  }

  const restoreZip = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const data = await restoreFromZip(f)
      store.importJSON(data)
      toast('تمت استعادة البيانات من الملف المضغوط بنجاح')
    } catch (err) {
      toast('تعذر الاستعادة: ' + err.message, 'error')
    }
    e.target.value = ''
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
    toast('تم تصدير نسخة كاملة من البيانات')
  }

  const modeBadge = {
    cloud: { tone: 'accent', label: 'متصل بالسحابة' },
    syncing: { tone: 'bronze', label: 'جاري المزامنة...' },
    'local-fallback': { tone: 'bronze', label: 'تعذر الوصول إلى السحابة — العمل محلياً مؤقتاً' },
    gas: { tone: 'bronze', label: 'تعذر الوصول إلى السحابة — العمل محلياً مؤقتاً' },
    local: { tone: 'neutral', label: 'وضع محلي' },
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
          <span className="font-semibold text-ink">رمز المدرسة للمشاركة: </span>
          <span className="tabular-nums font-bold text-bronze tracking-[0.25em]" dir="ltr">{registryCode()}</span>
          <span className="block mt-1">أرسله للمعلمين وأولياء الأمور ليربطوا حساباتهم بهذه المدرسة.</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <ShieldCheck size={13} className="text-accent shrink-0" />
          وضع التخزين: <Badge tone={modeBadge.tone}>{modeBadge.label}</Badge>
        </div>
      </Card>

      <Card className="col-span-12 xl:col-span-6">
        <CardTitle icon={Cloud} title="الحفظ السحابي التلقائي" subtitle="بيانات المدرسة محفوظة في السحابة تلقائياً — بدون أي إعداد" />
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm">
            {store.remoteStatus === 'cloud' || store.remoteStatus === 'syncing'
              ? <Badge tone="accent"><Cloud size={11} /> متصل بالسحابة — البيانات محفوظة تلقائياً</Badge>
              : <Badge tone="neutral"><CloudOff size={11} /> وضع بدون إنترنت — سيتم الحفظ فور توفر الشبكة</Badge>}
          </div>
          <p className="text-xs text-muted leading-6">
            كل تغيير في الحضور أو التسميع أو الطلاب يصل فوراً إلى جميع الأجهزة — يعمل التطبيق بدون إنترنت ويتزامن تلقائياً عند عودة الاتصال.
          </p>
          <button className="btn-primary w-fit !py-2 !text-xs" onClick={async () => {
            setBusy(true)
            setSyncError('')
            const { pushSchool, cloudDiag } = await import('../lib/cloud')
            const ok = await pushSchool(db)
            setBusy(false)
            if (!ok) setSyncError(cloudDiag.lastError || 'تعذر الوصول إلى السحابة')
            toast(ok ? 'تمت مزامنة البيانات مع السحابة بنجاح' : 'تعذر الوصول إلى السحابة الآن — البيانات محفوظة محلياً وسيتم الحفظ تلقائياً', ok ? 'success' : 'info')
          }} disabled={busy}>
            <Cloud size={13} /> {busy ? 'جاري المزامنة...' : 'مزامنة البيانات الآن'}
          </button>
          {syncError && (
            <p className="text-[11px] text-danger leading-5 rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 break-all" dir="ltr">{syncError}</p>
          )}
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
                <FileArchive size={13} /> نسخة مضغوطة كاملة
              </button>
            </div>
          }
        />
        <div>
          <p className="text-xs font-semibold text-muted mb-2">النسخ المحفوظة</p>
          {db.backups.length === 0 ? (
            <Empty icon={DatabaseBackup} title="لا توجد نسخ بعد" hint="اضغط «نسخة الآن» أو «نسخة مضغوطة كاملة»" />
          ) : (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {db.backups.map((b) => (
                <div key={b.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card2 px-3.5 py-2.5">
                  <DatabaseBackup size={15} className="text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{b.name}</div>
                    <div className="text-[10px] text-muted">{fmtDateTime(b.createdAt)} {b.source === 'zip' && '— مضغوطة'}</div>
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
        <div className="mt-4 pt-4 border-t border-line flex flex-wrap gap-2">
          <button className="btn-ghost !py-2 !text-xs" onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> استيراد ملف نسخة كاملة
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importFile} />
          <button className="btn-ghost !py-2 !text-xs" onClick={() => zipRef.current?.click()}>
            <FileArchive size={13} /> استعادة من ملف مضغوط
          </button>
          <input ref={zipRef} type="file" accept=".zip,application/zip" className="hidden" onChange={restoreZip} />
          <button className="btn-ghost !py-2 !text-xs" onClick={exportJSON}>
            <Download size={13} /> تصدير نسخة كاملة من البيانات
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
