import React, { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, QrCode, Search, Users, MapPin, Clock, Archive, RotateCcw, UserPlus, Phone } from 'lucide-react'
import { useStore } from '../lib/storage'
import { useToast } from '../components/ui'
import { Card, CardTitle, Modal, ConfirmDialog, Tabs, Badge, Empty, Table, Field } from '../components/ui'
import { StudentQRCard } from '../components/qr'
import { uid, todayStr, fmtDate, AR_DAYS, cx } from '../lib/helpers'
import { circleById, userById, parentOf } from '../lib/analytics'

export default function Circles() {
  const { db, update, deleteRecord, restoreArchived } = useStore()
  const toast = useToast()
  const [tab, setTab] = useState('circles')
  const [search, setSearch] = useState('')
  const [circleModal, setCircleModal] = useState(null)
  const [studentModal, setStudentModal] = useState(null)
  const [qrStudent, setQrStudent] = useState(null)
  const [delTarget, setDelTarget] = useState(null)

  const teachers = db.users.filter((u) => u.role === 'teacher')
  const parents = db.users.filter((u) => u.role === 'parent')

  const filteredStudents = useMemo(
    () => db.students.filter((s) => s.name.includes(search.trim()) || (circleById(db, s.circleId)?.name || '').includes(search.trim())),
    [db, search],
  )

  const saveCircle = (form) => {
    update((d) => {
      if (form.id) {
        const c = d.circles.find((x) => x.id === form.id)
        Object.assign(c, form)
        d.users.forEach((u) => {
          if (u.role === 'teacher') u.circleId = d.circles.find((c) => c.teacherId === u.id)?.id || null
        })
      } else {
        const c = { id: 'cir-' + uid().slice(3, 9), createdAt: new Date().toISOString(), ...form }
        d.circles.push(c)
        const t = d.users.find((u) => u.id === form.teacherId)
        if (t) t.circleId = c.id
      }
    })
    setCircleModal(null)
    toast('تم حفظ الحلقة بنجاح')
  }

  const saveStudent = (form) => {
    update((d) => {
      if (form.id) {
        const s = d.students.find((x) => x.id === form.id)
        Object.assign(s, form)
        const u = d.users.find((x) => x.id === s.userId)
        if (u) u.name = form.name
      } else {
        const id = 'stu-' + String(db.students.length + 1).padStart(3, '0') + '-' + Math.random().toString(36).slice(2, 5)
        const userId = 'usr-' + id
        d.users.push({
          id: userId,
          name: form.name,
          email: `student${d.users.filter((u) => u.role === 'student').length + 1}@kand.school`,
          password: '123456',
          role: 'student',
          phone: form.phone || '',
          studentId: id,
          createdAt: new Date().toISOString(),
        })
        d.students.push({
          id,
          userId,
          name: form.name,
          birthDate: form.birthDate || '',
          circleId: form.circleId || null,
          parentId: form.parentId || null,
          qrCode: `KAND-${id.toUpperCase()}`,
          joinedAt: todayStr(),
          createdAt: new Date().toISOString(),
        })
      }
    })
    setStudentModal(null)
    toast(form.id ? 'تم تحديث بيانات الطالب' : 'تم تسجيل الطالب وتوليد بطاقته الرقمية')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          tabs={[
            { key: 'circles', label: `الحلقات (${db.circles.length})` },
            { key: 'students', label: `الطلاب (${db.students.length})` },
            { key: 'archive', label: `الأرشيف المؤقت (${db.archive.length})` },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div className="flex-1" />
        {tab === 'circles' && (
          <button className="btn-primary" onClick={() => setCircleModal({ schedule: [{ day: 'السبت', time: '09:00' }] })}>
            <Plus size={16} /> إضافة حلقة
          </button>
        )}
        {tab === 'students' && (
          <>
            <div className="relative">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input !py-2 !pr-9 w-56" placeholder="بحث باسم الطالب أو الحلقة..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={() => setStudentModal({})}>
              <UserPlus size={16} /> تسجيل طالب جديد
            </button>
          </>
        )}
      </div>

      {tab === 'circles' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {db.circles.map((c) => {
            const teacher = userById(db, c.teacherId)
            const count = db.students.filter((s) => s.circleId === c.id).length
            return (
              <Card key={c.id} className="card-hover flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-amiri text-2xl font-bold">{c.name}</h3>
                    <p className="text-xs text-muted mt-1 flex items-center gap-1"><MapPin size={11} /> {c.room}</p>
                  </div>
                  <Badge tone="accent">{c.level}</Badge>
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-muted mb-4">
                  <span className="flex items-center gap-2"><Users size={13} className="text-accent" /> المعلم: {teacher?.name || '—'} — {count} طالب</span>
                  <span className="flex items-center gap-2"><Clock size={13} className="text-bronze" /> {c.schedule.map((s) => `${s.day} ${s.time}`).join('، ')}</span>
                  <span className="text-xs">الفئة العمرية: {c.ageGroup}</span>
                </div>
                <div className="mt-auto flex gap-2">
                  <button className="btn-ghost flex-1 !py-2 !text-xs" onClick={() => setCircleModal(c)}>
                    <Pencil size={13} /> تعديل
                  </button>
                  <button
                    className="btn-danger !py-2 !text-xs"
                    onClick={() => setDelTarget({ kind: 'circle', record: c })}
                  >
                    <Trash2 size={13} /> حذف
                  </button>
                </div>
              </Card>
            )
          })}
          {db.circles.length === 0 && <Empty icon={Users} title="لا توجد حلقات بعد" hint="أضف أول حلقة لبدء Registration" />}
        </div>
      )}

      {tab === 'students' && (
        <Card className="!p-0 overflow-hidden">
          {filteredStudents.length === 0 ? (
            <Empty icon={Search} title="لا توجد نتائج مطابقة" hint="جرّب كلمة أخرى" />
          ) : (
            <Table columns={['الطالب', 'الحلقة', 'ولي الأمر', 'تاريخ التسجيل', 'إجراءات']}>
              {filteredStudents.map((s) => {
                const circle = circleById(db, s.circleId)
                const parent = parentOf(db, s)
                return (
                  <tr key={s.id} className="hover:bg-card2 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{s.name}</div>
                          <div className="text-[10px] text-muted tabular-nums" dir="ltr">{s.qrCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td">{circle ? <Badge tone="teal">{circle.name}</Badge> : <span className="text-muted text-xs">غير مسجل</span>}</td>
                    <td className="td text-sm text-muted">{parent ? parent.name : '—'}</td>
                    <td className="td text-sm text-muted">{fmtDate(s.joinedAt)}</td>
                    <td className="td">
                      <div className="flex gap-1.5">
                        <button className="icon-btn !w-8 !h-8" title="البطاقة الرقمية" onClick={() => setQrStudent(s)}>
                          <QrCode size={14} />
                        </button>
                        <button className="icon-btn !w-8 !h-8" title="تعديل" onClick={() => setStudentModal(s)}>
                          <Pencil size={14} />
                        </button>
                        <button className="icon-btn !w-8 !h-8 hover:!text-danger hover:!border-danger/40" title="حذف (يذهب إلى الأرشيف)" onClick={() => setDelTarget({ kind: 'student', record: s })}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </Table>
          )}
        </Card>
      )}

      {tab === 'archive' && (
        <Card>
          <CardTitle icon={Archive} title="الأرشيف المؤقت" subtitle="سجلات الحذف — يمكن استعادتها في أي وقت (لا يوجد حذف نهائي)" />
          {db.archive.length === 0 ? (
            <Empty icon={Archive} title="الأرشيف فارغ" hint="عند حذف أي سجل يتم حفظه هنا أولاً" />
          ) : (
            <Table columns={['نوع السجل', 'الاسم', 'تاريخ الأرشفة', 'إجراء']}>
              {db.archive.map((a) => (
                <tr key={a.id}>
                  <td className="td"><Badge tone="neutral">{a.kind === 'student' ? 'طالب' : a.kind === 'circle' ? 'حلقة' : a.kind === 'recitation' ? 'تسميع' : 'نسخة احتياطية'}</Badge></td>
                  <td className="td font-semibold text-sm">{a.record?.name || a.record?.title || a.record?.id}</td>
                  <td className="td text-sm text-muted">{fmtDate(a.deletedAt?.slice(0, 10))}</td>
                  <td className="td">
                    <button className="btn-ghost !py-1.5 !text-xs" onClick={() => { restoreArchived(a.id); toast('تمت استعادة السجل من الأرشيف') }}>
                      <RotateCcw size={13} /> استعادة
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {circleModal && <CircleModal value={circleModal} teachers={teachers} onClose={() => setCircleModal(null)} onSave={saveCircle} />}
      {studentModal && <StudentModal value={studentModal} circles={db.circles} parents={parents} onClose={() => setStudentModal(null)} onSave={saveStudent} />}

      <Modal open={!!qrStudent} onClose={() => setQrStudent(null)} title="البطاقة الرقمية للطالب" icon={QrCode} wide>
        {qrStudent && <StudentQRCard student={{ ...qrStudent, circleName: circleById(db, qrStudent.circleId)?.name }} schoolName={db.settings.schoolName} />}
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        title="تأكيد الحذف"
        message={delTarget ? `سيتم نقل "${delTarget.record?.name || delTarget.record?.title}" إلى الأرشيف المؤقت. لن يُحذف نهائياً ويمكن استعادته لاحقاً.` : ''}
        confirmLabel="نقل إلى الأرشيف"
        requireDouble
        onConfirm={() => {
          if (delTarget) {
            deleteRecord(delTarget.kind, delTarget.record)
            toast('تم نقل السجل إلى الأرشيف المؤقت')
          }
        }}
      />
    </div>
  )
}

function CircleModal({ value, teachers, onClose, onSave }) {
  const [form, setForm] = useState(value)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setSchedule = (i, k, v) =>
    setForm((f) => {
      const schedule = f.schedule.map((s, idx) => (idx === i ? { ...s, [k]: v } : s))
      return { ...f, schedule }
    })
  return (
    <Modal
      open
      onClose={onClose}
      title={form.id ? 'تعديل الحلقة' : 'إضافة حلقة جديدة'}
      icon={Users}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.name || !form.teacherId}>
            حفظ الحلقة
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="اسم الحلقة" required>
          <input className="input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="مثال: حلقة النخبة" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="المعلم" required>
            <select className="input" value={form.teacherId || ''} onChange={(e) => set('teacherId', e.target.value)}>
              <option value="">اختر معلماً...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Field label="القاعة">
            <input className="input" value={form.room || ''} onChange={(e) => set('room', e.target.value)} placeholder="القاعة الأولى" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الفئة العمرية">
            <input className="input" value={form.ageGroup || ''} onChange={(e) => set('ageGroup', e.target.value)} placeholder="12 - 16 سنة" />
          </Field>
          <Field label="المستوى">
            <select className="input" value={form.level || 'حفظ'} onChange={(e) => set('level', e.target.value)}>
              {['حفظ', 'حفظ متقدم', 'مراجعة وتثبيت', 'تلاوة وتجويد'].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="المواعيد الأسبوعية">
          <div className="flex flex-col gap-2">
            {(form.schedule || []).map((s, i) => (
              <div key={i} className="flex gap-2">
                <select className="input" value={s.day} onChange={(e) => setSchedule(i, 'day', e.target.value)}>
                  {AR_DAYS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                <input className="input w-28" type="time" value={s.time} onChange={(e) => setSchedule(i, 'time', e.target.value)} />
                <button
                  className="icon-btn shrink-0"
                  onClick={() => setForm((f) => ({ ...f, schedule: f.schedule.filter((_, idx) => idx !== i) }))}
                  title="حذف الموعد"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button className="btn-ghost !py-2 !text-xs w-fit" onClick={() => setForm((f) => ({ ...f, schedule: [...(f.schedule || []), { day: 'السبت', time: '10:00' }] }))}>
              <Plus size={13} /> إضافة موعد
            </button>
          </div>
        </Field>
      </div>
    </Modal>
  )
}

function StudentModal({ value, circles, parents, onClose, onSave }) {
  const [form, setForm] = useState(value)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <Modal
      open
      onClose={onClose}
      title={form.id ? 'تعديل بيانات الطالب' : 'تسجيل طالب جديد'}
      icon={UserPlus}
      subtitle={form.id ? undefined : 'سيتم إنشاء حساب + توليد بطاقة QR فريدة تلقائياً'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.name}>
            {form.id ? 'حفظ التعديلات' : 'تسجيل الطالب'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="اسم الطالب" required>
          <input className="input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="الاسم الكامل" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="تاريخ الميلاد">
            <input className="input" type="date" value={form.birthDate || ''} onChange={(e) => set('birthDate', e.target.value)} />
          </Field>
          <Field label="رقم هاتف احتياطي">
            <input className="input" dir="ltr" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="05xxxxxxxx" />
          </Field>
        </div>
        <Field label="الحلقة">
          <select className="input" value={form.circleId || ''} onChange={(e) => set('circleId', e.target.value || null)}>
            <option value="">بدون حلقة (لاحقاً)</option>
            {circles.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="ولي الأمر">
          <select className="input" value={form.parentId || ''} onChange={(e) => set('parentId', e.target.value || null)}>
            <option value="">بدون ولي أمر (لاحقاً)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>
            ))}
          </select>
        </Field>
        {form.qrCode && (
          <div className="rounded-xl border border-bronze/30 bg-bronze/10 px-4 py-3 text-sm flex items-center justify-between">
            <span className="text-bronze font-semibold">كود البطاقة الفريد</span>
            <span className="tabular-nums font-bold" dir="ltr">{form.qrCode}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
