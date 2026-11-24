import React, { useMemo, useState } from 'react'
import { BookOpen, Plus, Trash2, Star, Filter } from 'lucide-react'
import { useStore, useAuth } from '../lib/storage'
import { useToast } from '../components/ui'
import { Card, CardTitle, Modal, ConfirmDialog, Badge, Empty, Table, Field } from '../components/ui'
import { uid, todayStr, fmtDate, SURAHS, surahName, cx } from '../lib/helpers'

export default function Recitations({ initialCircle }) {
  const { db, update, deleteRecord } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [del, setDel] = useState(null)
  const [circleFilter, setCircleFilter] = useState(initialCircle || 'all')

  const myCircles = user.role === 'admin' ? db.circles : db.circles.filter((c) => c.teacherId === user.id)
  const students = db.students.filter((s) => (user.role === 'admin' ? true : myCircles.some((c) => c.id === s.circleId)))

  const list = useMemo(() => {
    let l = db.recitations.filter((r) => (user.role === 'admin' ? true : r.teacherId === user.id))
    if (circleFilter !== 'all') l = l.filter((r) => r.circleId === circleFilter)
    return l.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 60)
  }, [db, user, circleFilter])

  const save = (form) => {
    update((d) => {
      d.recitations.push({
        id: uid(),
        studentId: form.studentId,
        circleId: db.students.find((s) => s.id === form.studentId)?.circleId,
        teacherId: user.id,
        date: form.date,
        type: form.type,
        surah: Number(form.surah),
        fromAyah: Number(form.fromAyah),
        toAyah: Number(form.toAyah),
        lines: Number(form.lines) || 0,
        pages: Number(form.pages) || 1,
        score: Number(form.score),
        notes: form.notes || '',
        createdAt: new Date().toISOString(),
      })
    })
    setOpen(false)
    toast('تم حفظ جلسة التسميع بنجاح')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Filter size={14} />
          <select className="input !py-2 w-44" value={circleFilter} onChange={(e) => setCircleFilter(e.target.value)}>
            <option value="all">كل الحلقات</option>
            {myCircles.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <button className="btn-primary" onClick={() => setOpen({ date: todayStr(), type: 'hifz', surah: 112, fromAyah: 1, toAyah: 4, lines: 5, pages: 1, score: 8, notes: '' })}>
          <Plus size={16} /> تسجيل تسميع جديد
        </button>
      </div>

      <Card className="!p-0 overflow-hidden">
        <CardTitle icon={BookOpen} title="سجل التسميع" subtitle={`${list.length} جلسة — الأحدث أولاً`} />
        {list.length === 0 ? (
          <Empty icon={BookOpen} title="لا توجد جلسات تسميع بعد" hint="اضغط «تسجيل تسميع جديد»" />
        ) : (
          <Table columns={['التاريخ', 'الطالب', 'النوع', 'السورة', 'من - إلى', 'صفحات', 'التقييم', 'ملاحظات', '']}>
            {list.map((r) => {
              const s = db.students.find((x) => x.id === r.studentId)
              return (
                <tr key={r.id} className="hover:bg-card2 transition-colors">
                  <td className="td text-sm text-muted whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="td font-semibold text-sm">{s?.name || '—'}</td>
                  <td className="td"><Badge tone={r.type === 'hifz' ? 'accent' : 'teal'}>{r.type === 'hifz' ? 'حفظ جديد' : 'مراجعة'}</Badge></td>
                  <td className="td text-sm">{surahName(r.surah)}</td>
                  <td className="td text-sm text-muted tabular-nums">آية {r.fromAyah} → {r.toAyah}</td>
                  <td className="td text-sm tabular-nums">{r.pages}</td>
                  <td className="td">
                    <span className={cx('inline-flex items-center gap-1 font-bold text-sm tabular-nums', r.score >= 8 ? 'text-accent' : r.score >= 6 ? 'text-bronze' : 'text-danger')}>
                      <Star size={13} /> {r.score}/10
                    </span>
                  </td>
                  <td className="td text-xs text-muted max-w-[180px] truncate">{r.notes || '—'}</td>
                  <td className="td">
                    <button className="icon-btn !w-8 !h-8 hover:!text-danger hover:!border-danger/40" onClick={() => setDel(r)} title="حذف (ينتقل إلى الأرشيف)">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      {open && <RecitationModal value={open} students={students} circles={db.circles} onClose={() => setOpen(false)} onSave={save} />}

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title="تأكيد حذف جلسة التسميع"
        message={del ? `سيتم نقل جلسة تسميع ${surahName(del.surah)} للطالب "${db.students.find((s) => s.id === del.studentId)?.name}" إلى الأرشيف المؤقت.` : ''}
        confirmLabel="نقل إلى الأرشيف"
        requireDouble
        onConfirm={() => {
          if (del) {
            deleteRecord('recitation', del)
            toast('تم نقل الجلسة إلى الأرشيف')
          }
        }}
      />
    </div>
  )
}

function RecitationModal({ value, students, circles, onClose, onSave }) {
  const [form, setForm] = useState(value)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const student = students.find((s) => s.id === form.studentId)
  const studentCircle = student ? circles.find((c) => c.id === student.circleId) : null
  const surah = SURAHS.find((s) => s.n === Number(form.surah))

  return (
    <Modal
      open
      onClose={onClose}
      title="تسجيل جلسة تسميع"
      icon={BookOpen}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button
            className="btn-primary"
            disabled={!form.studentId || !form.date || Number(form.toAyah) < Number(form.fromAyah)}
            onClick={() => onSave(form)}
          >
            حفظ الجلسة
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="الطالب" required>
            <select className="input" value={form.studentId || ''} onChange={(e) => set('studentId', e.target.value)}>
              <option value="">اختر طالباً...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {circles.find((c) => c.id === s.circleId)?.name || 'بدون حلقة'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="التاريخ" required>
            <input className="input" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
        </div>
        {student && (
          <div className="rounded-xl border border-accent/25 bg-accent/10 px-4 py-2.5 text-xs text-accent font-semibold">
            حلقة الطالب الحالية: {studentCircle?.name || 'غير مسجل في حلقة'}
          </div>
        )}
        <Field label="نوع التسميع">
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: 'hifz', label: 'حفظ جديد' },
              { k: 'murajaa', label: 'مراجعة' },
            ].map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => set('type', t.k)}
                className={cx('rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all', form.type === t.k ? 'border-accent/60 bg-accent/15 text-accent' : 'border-line text-muted hover:text-ink')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="السورة" required>
            <select className="input" value={form.surah} onChange={(e) => set('surah', e.target.value)}>
              {SURAHS.map((s) => (
                <option key={s.n} value={s.n}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="من آية">
            <input className="input tabular-nums" type="number" min="1" max={surah?.ayahs || 286} value={form.fromAyah} onChange={(e) => set('fromAyah', e.target.value)} />
          </Field>
          <Field label="إلى آية">
            <input className="input tabular-nums" type="number" min="1" max={surah?.ayahs || 286} value={form.toAyah} onChange={(e) => set('toAyah', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="عدد الأسطر">
            <input className="input tabular-nums" type="number" min="0" value={form.lines} onChange={(e) => set('lines', e.target.value)} />
          </Field>
          <Field label="عدد الأوجه / الصفحات">
            <input className="input tabular-nums" type="number" min="1" value={form.pages} onChange={(e) => set('pages', e.target.value)} />
          </Field>
          <Field label="التقييم (من 10)" required>
            <input className="input tabular-nums" type="number" min="1" max="10" value={form.score} onChange={(e) => set('score', e.target.value)} />
          </Field>
        </div>
        <Field label="ملاحظات التجويد">
          <textarea className="input min-h-[80px] resize-y" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="ملاحظات على الأداء أو التجويد..." />
        </Field>
        {Number(form.toAyah) < Number(form.fromAyah) && (
          <p className="text-xs text-danger bg-danger/10 border border-danger/25 rounded-lg px-3 py-2">خطأ: «إلى آية» يجب أن تكون أكبر من أو تساوي «من آية»</p>
        )}
      </div>
    </Modal>
  )
}
