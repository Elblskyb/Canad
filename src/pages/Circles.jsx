import React, { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, QrCode, Search, Users, MapPin, Clock, Archive, RotateCcw, UserPlus, Phone, FileDown, GraduationCap, CheckCircle2, Ban, Camera } from 'lucide-react'
import { useStore, useAuth } from '../lib/storage'
import { useToast } from '../components/ui'
import { Card, CardTitle, Modal, ConfirmDialog, Tabs, Badge, Empty, Table, Field } from '../components/ui'
import { StudentQRCard } from '../components/qr'
import { ContactParentModal } from '../components/contact'
import { uid, todayStr, fmtDate, AR_DAYS, cx } from '../lib/helpers'
import { circleById, userById, parentOf } from '../lib/analytics'
import { compressImage } from '../lib/photo'
import { drawStudentCard, studentCardPNG } from '../lib/studentcard'
import { newTeacherCode } from '../lib/license'
import { Copy } from 'lucide-react'

export default function Circles({ teacherMode = false }) {
  const { db, update, deleteRecord, restoreArchived } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user.role === 'admin'
  const [tab, setTab] = useState(isAdmin ? 'circles' : 'students')
  const [search, setSearch] = useState('')
  const [circleModal, setCircleModal] = useState(null)
  const [studentModal, setStudentModal] = useState(null)
  const [teacherModal, setTeacherModal] = useState(null)
  const [qrStudent, setQrStudent] = useState(null)
  const [delTarget, setDelTarget] = useState(null)
  const [contact, setContact] = useState(null)

  const myCircleIds = db.circles.filter((c) => c.teacherId === user.id).map((c) => c.id)
  const visibleCircles = teacherMode ? db.circles.filter((c) => c.teacherId === user.id) : db.circles
  const teachers = db.users.filter((u) => u.role === 'teacher')
  const parents = db.users.filter((u) => u.role === 'parent')

  const visibleStudents = useMemo(() => {
    let list = teacherMode ? db.students.filter((s) => myCircleIds.includes(s.circleId)) : db.students
    const q = search.trim()
    if (q) list = list.filter((s) => s.name.includes(q) || (circleById(db, s.circleId)?.name || '').includes(q))
    return list
  }, [db, search, teacherMode, myCircleIds])

  const saveCircle = (form) => {
    const payload = teacherMode ? { ...form, teacherId: user.id } : form
    update((d) => {
      if (payload.id) {
        const c = d.circles.find((x) => x.id === payload.id)
        if (c && (isAdmin || c.teacherId === user.id)) Object.assign(c, payload)
      } else {
        d.circles.push({ id: 'cir-' + uid().slice(3, 9), createdAt: new Date().toISOString(), ...payload })
      }
      d.users.forEach((u) => {
        if (u.role === 'teacher') u.circleId = d.circles.find((c) => c.teacherId === u.id)?.id || null
      })
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
        if (u) { u.name = form.name; if (form.photo !== undefined) u.photo = form.photo }
      } else {
        const id = 'stu-' + uid().slice(3, 10)
        const userId = 'usr-' + id
        d.users.push({ id: userId, name: form.name, email: '', phone: form.phone || '', password: '123456', role: 'student', status: 'active', studentId: id, photo: form.photo || '', createdAt: new Date().toISOString() })
        d.students.push({ id, userId, name: form.name, birthDate: form.birthDate || '', circleId: form.circleId || null, parentId: form.parentId || null, qrCode: `KAND-${id.toUpperCase()}`, photo: form.photo || '', joinedAt: todayStr(), createdAt: new Date().toISOString() })
      }
    })
    setStudentModal(null)
    toast(form.id ? 'تم تحديث بيانات الطالب' : 'تم تسجيل الطالب وتوليد بطاقته الرقمية')
  }

  const saveTeacher = (form) => {
    update((d) => {
      if (form.id) {
        Object.assign(d.users.find((u) => u.id === form.id), form)
      } else {
        const id = uid()
        const teacherCode = newTeacherCode()
        d.users.push({ id, name: form.name, email: form.email, phone: form.phone || '', password: form.password || '123456', role: 'teacher', status: 'active', photo: form.photo || '', circleId: null, teacherCode, createdAt: new Date().toISOString() })
        const reg = JSON.parse(localStorage.getItem('kand_registry_v1') || '{"schools":[],"users":[]}')
        reg.users.push({ schoolId: d.settings.schoolId, userId: id, identifier: form.email, phone: form.phone || '', role: 'teacher', name: form.name })
        localStorage.setItem('kand_registry_v1', JSON.stringify(reg))
      }
    })
    setTeacherModal(null)
    toast(form.id ? 'تم تحديث بيانات المعلم' : 'تم إنشاء حساب المعلم — يمكنه الدخول بالبريد وكلمة المرور')
  }

  const setTeacherStatus = (t, status) => {
    update((d) => {
      const u = d.users.find((x) => x.id === t.id)
      if (u) u.status = status
    })
    toast(status === 'active' ? 'تم تفعيل حساب المعلم' : 'تم إيقاف حساب المعلم')
  }

  const deleteTeacher = (t) => {
    update((d) => {
      d.archive.push({ kind: 'teacher', id: uid(), deletedAt: new Date().toISOString(), record: t })
      d.users = d.users.filter((u) => u.id !== t.id)
      d.circles.forEach((c) => { if (c.teacherId === t.id) c.teacherId = null })
    })
    toast('تم حذف حساب المعلم (محفوظ في الأرشيف)')
  }

  const cardRef = React.useRef(null)
  const [cardStudent, setCardStudent] = useState(null)
  const downloadCard = (s) => {
    const canvas = cardRef.current || document.createElement('canvas')
    const qrSvg = document.querySelector(`[data-qr="${s.id}"] svg`)?.outerHTML || null
    drawStudentCard(canvas, {
      photo: s.photo || userById(db, s.userId)?.photo,
      name: s.name,
      schoolName: db.settings.schoolName,
      circleName: circleById(db, s.circleId)?.name,
      qrSvg,
      qrCode: s.qrCode,
    })
    studentCardPNG(canvas, `بطاقة-${s.name}.png`)
    toast('تم تحميل بطاقة الطالب')
  }

  return (
    <div className="flex flex-col gap-4">
      <canvas ref={cardRef} className="hidden" />
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          tabs={[
            { key: 'circles', label: `${teacherMode ? 'حلقاتي' : 'الحلقات'} (${visibleCircles.length})` },
            ...(isAdmin ? [{ key: 'teachers', label: `المعلمون (${teachers.length})` }] : []),
            { key: 'students', label: `${teacherMode ? 'طلابي' : 'الطلاب'} (${visibleStudents.length})` },
            { key: 'archive', label: `الأرشيف المؤقت (${db.archive.length})` },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div className="flex-1" />
        {tab === 'circles' && (
          <button className="btn-primary" onClick={() => setCircleModal({ schedule: [{ day: 'السبت', time: '09:00', end: '10:30' }] })}>
            <Plus size={16} /> إضافة حلقة
          </button>
        )}
        {isAdmin && tab === 'teachers' && (
          <button className="btn-primary" onClick={() => setTeacherModal({})}>
            <Plus size={16} /> إضافة معلم
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
          {visibleCircles.map((c) => {
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
                  <span className="flex items-center gap-2"><Clock size={13} className="text-bronze" /> {c.schedule.map((s) => `${s.day} ${s.time}${s.end ? ' - ' + s.end : ''}`).join('، ')}</span>
                  <span className="text-xs">الفئة العمرية: {c.ageGroup}</span>
                </div>
                <div className="mt-auto flex gap-2">
                  <button className="btn-ghost flex-1 !py-2 !text-xs" onClick={() => setCircleModal(c)}>
                    <Pencil size={13} /> تعديل
                  </button>
                  {(isAdmin || c.teacherId === user.id) && (
                    <button className="btn-danger !py-2 !text-xs" onClick={() => setDelTarget({ kind: 'circle', record: c })}>
                      <Trash2 size={13} /> حذف
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
          {db.circles.length === 0 && <Empty icon={Users} title="لا توجد حلقات بعد" hint="أضف أول حلقة لتسجيل الطلاب فيها" />}
        </div>
      )}

      {tab === 'teachers' && isAdmin && (
        <Card className="!p-0 overflow-hidden">
          {teachers.length === 0 ? (
            <Empty icon={GraduationCap} title="لا يوجد معلمون بعد" hint="أضف معلماً جديداً من زر «إضافة معلم» في الأعلى" />
          ) : (
            <Table columns={['المعلم', 'كود المعلم', 'البريد', 'الهاتف', 'الحالة', 'إجراءات']}>
              {teachers.map((t) => (
                <tr key={t.id} className="hover:bg-card2 transition-colors">
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      {t.photo ? <img src={t.photo} alt="" className="w-9 h-9 rounded-lg object-cover border border-line" /> : <div className="w-9 h-9 rounded-lg bg-teal2/10 border border-teal2/25 text-teal2 flex items-center justify-center text-xs font-bold">{t.name.charAt(0)}</div>}
                      <span className="font-semibold text-sm">{t.name}</span>
                    </div>
                  </td>
                  <td className="td">
                    {t.teacherCode ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-bronze/10 border border-bronze/25 text-bronze px-2 py-1 text-xs font-bold tabular-nums" dir="ltr">
                        {t.teacherCode}
                        <button
                          className="hover:text-accent"
                          title="نسخ كود المعلم"
                          onClick={() => { navigator.clipboard?.writeText(t.teacherCode); toast(`تم نسخ كود المعلم ${t.teacherCode}`) }}
                        >
                          <Copy size={11} />
                        </button>
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="td text-sm text-muted" dir="ltr">{t.email}</td>
                  <td className="td text-sm text-muted tabular-nums" dir="ltr">{t.phone || '—'}</td>
                  <td className="td">{t.status === 'suspended' ? <Badge tone="danger">موقوف</Badge> : <Badge tone="accent">نشط</Badge>}</td>
                  <td className="td">
                    <div className="flex gap-1.5">
                      <button className="icon-btn !w-8 !h-8" title="تعديل" onClick={() => setTeacherModal(t)}><Pencil size={14} /></button>
                      {t.status === 'suspended' ? (
                        <button className="icon-btn !w-8 !h-8 hover:!text-accent hover:!border-accent/40" title="تفعيل" onClick={() => setTeacherStatus(t, 'active')}><CheckCircle2 size={14} /></button>
                      ) : (
                        <button className="icon-btn !w-8 !h-8 hover:!text-bronze hover:!border-bronze/40" title="إيقاف" onClick={() => setTeacherStatus(t, 'suspended')}><Ban size={14} /></button>
                      )}
                      <button className="icon-btn !w-8 !h-8 hover:!text-danger hover:!border-danger/40" title="حذف (ينتقل إلى الأرشيف)" onClick={() => deleteTeacher(t)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === 'students' && (
        <Card className="!p-0 overflow-hidden">
          {visibleStudents.length === 0 ? (
            <Empty icon={Search} title="لا توجد نتائج" hint="سجّل طلاباً جدد" />
          ) : (
            <Table columns={['الطالب', 'الحلقة', 'ولي الأمر', 'تاريخ التسجيل', 'إجراءات']}>
              {visibleStudents.map((s) => {
                const circle = circleById(db, s.circleId)
                const parent = parentOf(db, s)
                const su = userById(db, s.userId)
                const photo = s.photo || su?.photo
                return (
                  <tr key={s.id} className="hover:bg-card2 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        {photo ? <img src={photo} alt="" className="w-9 h-9 rounded-lg object-cover border border-line shrink-0" /> : <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">{s.name.charAt(0)}</div>}
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
                      <div className="flex gap-1.5 flex-wrap">
                        <button className="icon-btn !w-8 !h-8" title="البطاقة الرقمية" onClick={() => setQrStudent(s)}><QrCode size={14} /></button>
                        <button className="icon-btn !w-8 !h-8" title="تحميل بطاقة الطالب" onClick={() => downloadCard(s)}><FileDown size={14} /></button>
                        <button className="icon-btn !w-8 !h-8" title="مراسلة ولي الأمر" onClick={() => setContact({ student: s, parent, circle, type: 'note', detail: '' })}><Phone size={14} /></button>
                        <button className="icon-btn !w-8 !h-8" title="تعديل" onClick={() => setStudentModal(s)}><Pencil size={14} /></button>
                        <button className="icon-btn !w-8 !h-8 hover:!text-danger hover:!border-danger/40" title="حذف (ينتقل إلى الأرشيف)" onClick={() => setDelTarget({ kind: 'student', record: s })}><Trash2 size={14} /></button>
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
                  <td className="td"><Badge tone="neutral">{a.kind === 'student' ? 'طالب' : a.kind === 'circle' ? 'حلقة' : a.kind === 'teacher' ? 'معلم' : a.kind === 'recitation' ? 'تسميع' : a.kind === 'attendance' ? 'حضور' : 'نسخة احتياطية'}</Badge></td>
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

      {circleModal && <CircleModal value={circleModal} teachers={teachers} lockTeacher={teacherMode} onClose={() => setCircleModal(null)} onSave={saveCircle} />}
      {studentModal && <StudentModal value={studentModal} circles={visibleCircles} parents={parents} onClose={() => setStudentModal(null)} onSave={saveStudent} />}
      {teacherModal && <TeacherModal value={teacherModal} onClose={() => setTeacherModal(null)} onSave={saveTeacher} />}

      <Modal open={!!qrStudent} onClose={() => setQrStudent(null)} title="البطاقة الرقمية للطالب" icon={QrCode} wide>
        {qrStudent && (
          <div data-qr={qrStudent.id}>
            <StudentQRCard student={{ ...qrStudent, circleName: circleById(db, qrStudent.circleId)?.name }} schoolName={db.settings.schoolName} />
          </div>
        )}
      </Modal>

      <ContactParentModal
        open={!!contact}
        onClose={() => setContact(null)}
        student={contact?.student}
        circleName={contact?.circle?.name}
        parentPhone={contact?.parent?.phone}
        parentName={contact?.parent?.name}
        type={contact?.type}
        detail={contact?.detail}
      />

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

function CircleModal({ value, teachers, lockTeacher, onClose, onSave }) {
  const [form, setForm] = useState(() => {
    const schedule = (value.schedule && value.schedule.length ? value.schedule : [{ day: 'السبت', time: '09:00', end: '10:30' }])
    return { ...value, schedule, start: schedule[0]?.time || '09:00', end: schedule[0]?.end || '' }
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const days = form.schedule.map((s) => s.day)
  const toggleDay = (day) => {
    setForm((f) => {
      const has = f.schedule.some((s) => s.day === day)
      const schedule = has
        ? f.schedule.filter((s) => s.day !== day)
        : [...f.schedule, { day, time: f.start || '09:00', end: f.end || '' }]
      return { ...f, schedule }
    })
  }
  const setDayTime = (day, k, v) =>
    setForm((f) => ({ ...f, schedule: f.schedule.map((s) => (s.day === day ? { ...s, [k]: v } : s)) }))
  const applyTimeToSelected = () =>
    setForm((f) => ({ ...f, schedule: f.schedule.map((s) => ({ ...s, time: f.start, end: f.end })) }))
  const quick = (list) =>
    setForm((f) => ({
      ...f,
      schedule: list.map((day) => {
        const existing = f.schedule.find((s) => s.day === day)
        return existing || { day, time: f.start || '09:00', end: f.end || '' }
      }),
    }))
  const ALL = AR_DAYS
  const SCHOOL_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
  const WEEKEND = ['الجمعة', 'السبت']

  return (
    <Modal open onClose={onClose} title={form.id ? 'تعديل الحلقة' : 'إضافة حلقة جديدة'} icon={Users}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.name || !form.schedule.length}>حفظ الحلقة</button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="اسم الحلقة" required><input className="input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="مثال: حلقة النخبة" /></Field>
        <div className="grid grid-cols-2 gap-3">
          {!lockTeacher && (
            <Field label="المعلم">
              <select className="input" value={form.teacherId || ''} onChange={(e) => set('teacherId', e.target.value || null)}>
                <option value="">بدون معلم (لاحقاً)</option>
                {teachers.filter((t) => t.status !== 'suspended').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="القاعة"><input className="input" value={form.room || ''} onChange={(e) => set('room', e.target.value)} placeholder="القاعة الأولى" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الفئة العمرية"><input className="input" value={form.ageGroup || ''} onChange={(e) => set('ageGroup', e.target.value)} placeholder="12 - 16 سنة" /></Field>
          <Field label="المستوى">
            <select className="input" value={form.level || 'حفظ'} onChange={(e) => set('level', e.target.value)}>
              {['حفظ', 'حفظ متقدم', 'مراجعة وتثبيت', 'تلاوة وتجويد'].map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="أيام الأسبوع — اختر بضغطة واحدة">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              ['تحديد كل الأسبوع', ALL],
              ['أيام الدراسة (الأحد - الخميس)', SCHOOL_DAYS],
              ['عطلة نهاية الأسبوع (الجمعة والسبت)', WEEKEND],
            ].map(([label, list]) => (
              <button key={label} type="button" className="btn-ghost !py-1.5 !px-2.5 !text-[11px]" onClick={() => quick(list)}>{label}</button>
            ))}
            <button type="button" className="btn-danger !py-1.5 !px-2.5 !text-[11px]" onClick={() => setForm((f) => ({ ...f, schedule: [] }))}>إلغاء التحديد</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AR_DAYS.map((d) => {
              const on = days.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={cx(
                    'rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95',
                    on ? 'border-accent/60 bg-accent/15 text-accent' : 'border-line text-muted hover:text-ink',
                  )}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="وقت البداية ووقت النهاية (يُطبَّق على كل الأيام المحددة)">
          <div className="flex items-center gap-2">
            <input className="input w-32" type="time" value={form.start || '09:00'} onChange={(e) => set('start', e.target.value)} />
            <span className="text-muted text-xs">إلى</span>
            <input className="input w-32" type="time" value={form.end || ''} onChange={(e) => set('end', e.target.value)} />
            <button type="button" className="btn-ghost !py-2 !text-xs" onClick={applyTimeToSelected}>تطبيق على المحدد</button>
          </div>
        </Field>
        {form.schedule.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] text-muted">تعديل يوم معين:</p>
            {form.schedule.map((s) => (
              <div key={s.day} className="flex items-center gap-2">
                <span className="text-xs font-bold w-20 shrink-0">{s.day}</span>
                <input className="input !py-1.5 !text-xs w-28" type="time" value={s.time} onChange={(e) => setDayTime(s.day, 'time', e.target.value)} />
                <span className="text-muted text-[10px]">إلى</span>
                <input className="input !py-1.5 !text-xs w-28" type="time" value={s.end || ''} onChange={(e) => setDayTime(s.day, 'end', e.target.value)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function StudentModal({ value, circles, parents, onClose, onSave }) {
  const [form, setForm] = useState(value)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const onPhoto = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      set('photo', await compressImage(f))
    } catch (err) {
      alert(err.message)
    }
  }
  return (
    <Modal open onClose={onClose} title={form.id ? 'تعديل بيانات الطالب' : 'تسجيل طالب جديد'} icon={UserPlus}
      subtitle={form.id ? undefined : 'سيتم إنشاء حساب طالب + توليد بطاقة رقمية فريدة تلقائياً'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.name}>{form.id ? 'حفظ التعديلات' : 'تسجيل الطالب'}</button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="الصورة الشخصية (اختياري — تُضغط تلقائياً)">
          <div className="flex items-center gap-3">
            <label className="btn-ghost !py-2 !text-xs cursor-pointer">
              <Camera size={14} /> تغيير الصورة
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
            {(form.photo) && <img src={form.photo} alt="" className="w-12 h-12 rounded-xl object-cover border border-line" />}
          </div>
        </Field>
        <Field label="اسم الطالب" required><input className="input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="الاسم الكامل" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="تاريخ الميلاد"><input className="input" type="date" value={form.birthDate || ''} onChange={(e) => set('birthDate', e.target.value)} /></Field>
          <Field label="رقم هاتف احتياطي"><input className="input" dir="ltr" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="رقم الهاتف" /></Field>
        </div>
        <Field label="الحلقة">
          <select className="input" value={form.circleId || ''} onChange={(e) => set('circleId', e.target.value || null)}>
            <option value="">بدون حلقة (لاحقاً)</option>
            {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="ولي الأمر">
          <select className="input" value={form.parentId || ''} onChange={(e) => set('parentId', e.target.value || null)}>
            <option value="">بدون ولي أمر (لاحقاً)</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
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

function TeacherModal({ value, onClose, onSave }) {
  const [form, setForm] = useState(value)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <Modal open onClose={onClose} title={form.id ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'} icon={GraduationCap}
      subtitle="حساب المعلم يُعتمد حصراً من مدير المدرسة"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.name || (!form.id && !form.email)}>{form.id ? 'حفظ' : 'إنشاء حساب المعلم'}</button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="اسم المعلم" required><input className="input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="الاسم الكامل" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="البريد الإلكتروني (يُستخدم لتسجيل الدخول)" required={!form.id}><input className="input" dir="ltr" value={form.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="البريد الإلكتروني" /></Field>
          <Field label="رقم الهاتف"><input className="input" dir="ltr" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="رقم الهاتف" /></Field>
        </div>
        {!form.id && <Field label="كلمة المرور" required><input className="input" dir="ltr" type="password" value={form.password || ''} onChange={(e) => set('password', e.target.value)} placeholder="••••••" /></Field>}
      </div>
    </Modal>
  )
}
