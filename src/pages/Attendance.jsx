import React, { useMemo, useState } from 'react'
import { ScanLine, AlertTriangle, PhoneCall, CalendarCheck, UserCheck, Clock, CheckCircle2, XCircle, Search } from 'lucide-react'
import { useStore, useAuth } from '../lib/storage'
import { useToast } from '../components/ui'
import { Card, CardTitle, Badge, Empty, Table, Tabs } from '../components/ui'
import { QRScannerModal } from '../components/qr'
import { ContactParentModal } from '../components/contact'
import { absenteesOfLastSession, lastSessionDate, circleById, userById, parentOf } from '../lib/analytics'
import { todayStr, fmtDate, uid, cx } from '../lib/helpers'

const STATUS = {
  present: { label: 'حاضر', tone: 'accent' },
  late: { label: 'متأخر', tone: 'bronze' },
  excused: { label: 'غياب معذور', tone: 'teal' },
  absent: { label: 'غائب', tone: 'danger' },
}

export default function Attendance() {
  const { db, update } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [flash, setFlash] = useState(null)
  const [contactNote, setContactNote] = useState({})
  const [contact, setContact] = useState(null)

  const myCircles = user.role === 'admin' ? db.circles : db.circles.filter((c) => c.teacherId === user.id)
  const [circleId, setCircleId] = useState(myCircles[0]?.id)
  const circle = circleById(db, circleId) || myCircles[0]
  const today = todayStr()

  const students = db.students.filter((s) => s.circleId === circle?.id)
  const todayRecords = db.attendance.filter((a) => a.circleId === circle?.id && a.date === today)
  const lastDate = lastSessionDate(db, circle?.id)
  const absentees = absenteesOfLastSession(db, circle?.id)

  const allStudents = useMemo(() => (user.role === 'admin' ? db.students : db.students.filter((s) => myCircles.some((c) => c.id === s.circleId))), [db, user, myCircles])

  const mark = (student, status, method = 'qr') => {
    update((d) => {
      const existing = d.attendance.find((a) => a.studentId === student.id && a.circleId === circle.id && a.date === today)
      if (existing) {
        existing.status = status
        existing.method = method
        if (status === 'present' || status === 'late') existing.scannedAt = new Date().toISOString()
      } else {
        d.attendance.push({
          id: uid(),
          studentId: student.id,
          circleId: circle.id,
          date: today,
          status,
          method,
          scannedAt: status === 'present' || status === 'late' ? new Date().toISOString() : null,
        })
      }
      if (status === 'absent') {
        const su = d.users.find((u) => u.studentId === student.id)
        d.notifications.push(
          { id: uid(), to: su?.id || student.userId, type: 'absent', title: 'تسجيل غياب', body: `تم تسجيل غياب ${student.name} في حلقة ${circle.name} بتاريخ ${today}`, createdAt: new Date().toISOString(), read: false },
          { id: uid(), to: student.parentId, type: 'absent', title: 'غياب ابنكم', body: `تم تسجيل غياب ${student.name} في حلقة ${circle.name} بتاريخ ${today}`, createdAt: new Date().toISOString(), read: false },
        )
      }
    })
  }

  const onScan = (student) => {
    if (student.circleId !== circle?.id) {
      toast(`هذا الطالب مسجل في حلقة أخرى (${circleById(db, student.circleId)?.name || '—'})`, 'info')
    }
    mark(student, 'present', 'qr')
    setFlash({ id: student.id, name: student.name })
    toast(`تم تسجيل حضور ${student.name} — ${today}`)
    setTimeout(() => setFlash(null), 2500)
  }

  const contactParent = (student) => {
    const parent = parentOf(db, student)
    update((d) => {
      d.parentLogs.push({
        id: uid(),
        parentId: parent?.id || 'unknown',
        studentId: student.id,
        reportType: 'تواصل مع ولي الأمر حيال الغياب',
        reportDate: today,
        confirmedAt: new Date().toISOString(),
      })
      const su = d.users.find((u) => u.studentId === student.id)
      d.notifications.push({ id: uid(), to: parent?.id || 'unknown', type: 'call', title: 'استدعاء ولي الأمر', body: `استدعاء ولي أمر ${student.name} (${student.name}) بسبب الغياب في حلقة ${circle.name}`, createdAt: new Date().toISOString(), read: false })
    })
    setContactNote((n) => ({ ...n, [student.id]: true }))
    setContact({ student, parent, circle })
    toast(`تم فتح نافذة المراسلة مع ${parent?.name || 'ولي الأمر'}`)
  }

  const statusOf = (sid) => todayRecords.find((a) => a.studentId === sid)?.status

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs tabs={myCircles.map((c) => ({ key: c.id, label: c.name }))} active={circle?.id} onChange={setCircleId} />
        <div className="flex-1" />
        <button className="btn-primary" onClick={() => setScannerOpen(true)}>
          <ScanLine size={16} /> مسح البطاقة لتسجيل الحضور
        </button>
      </div>

      {flash && (
        <div className="card border-accent/50 bg-accent/10 px-5 py-4 flex items-center gap-3 animate-pop">
          <CheckCircle2 size={22} className="text-accent shrink-0" />
          <div>
            <div className="font-bold text-accent">تم تسجيل الحضور بنجاح</div>
            <div className="text-sm text-muted">الطالب: {flash.name} — {fmtDate(today)} — الساعة {new Date().toLocaleTimeString('en-GB')}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-8">
          <CardTitle
            icon={CalendarCheck}
            title={`سجل حضور اليوم — ${circle?.name || ''}`}
            subtitle={`${fmtDate(today)} — ${todayRecords.length} من ${students.length} تم تسجيلهم`}
          />
          {students.length === 0 ? (
            <Empty icon={UserCheck} title="لا يوجد طلاب في هذه الحلقة" hint="سجّل طلاباً من صفحة الحلقات والطلاب" />
          ) : (
            <Table columns={['الطالب', 'الحالة', 'وقت المسح', 'تغيير الحالة']}>
              {students.map((s) => {
                const st = statusOf(s.id)
                const rec = todayRecords.find((a) => a.studentId === s.id)
                return (
                  <tr key={s.id} className={cx('transition-colors', flash?.id === s.id && 'bg-accent/10')}>
                    <td className="td font-semibold text-sm">{s.name}</td>
                    <td className="td">{st ? <Badge tone={STATUS[st].tone}>{STATUS[st].label}</Badge> : <span className="text-xs text-muted">لم يُسجل بعد</span>}</td>
                    <td className="td text-xs text-muted tabular-nums">{rec?.scannedAt ? new Date(rec.scannedAt).toLocaleTimeString('en-GB') : '—'}</td>
                    <td className="td">
                      <div className="flex gap-1 items-center">
                        {Object.entries(STATUS).map(([k, v]) => (
                          <button
                            key={k}
                            onClick={() => mark(s, k, 'manual')}
                            className={cx(
                              'rounded-lg border px-2 py-1 text-[11px] font-semibold transition-all active:scale-95',
                              st === k ? 'border-accent/60 bg-accent/15 text-accent' : 'border-line text-muted hover:text-ink',
                            )}
                          >
                            {v.label}
                          </button>
                        ))}
                        {rec && (user.role === 'admin' || circle.teacherId === user.id) && (
                          <button
                            className="icon-btn !w-7 !h-7 hover:!text-danger hover:!border-danger/40"
                            title="حذف سجل الحضور (ينتقل إلى الأرشيف)"
                            onClick={() => deleteRecord('attendance', rec)}
                          >
                            <XCircle size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </Table>
          )}
        </Card>

        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">
          <Card className="border-danger/30 bg-danger/5">
            <CardTitle
              icon={AlertTriangle}
              title="غائبون عن آخر حصة"
              subtitle={absentees.date ? `آخر حصة مسجلة: ${fmtDate(absentees.date)}` : 'لا توجد حصص مسجلة بعد'}
            />
            {absentees.students.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-accent">
                <CheckCircle2 size={16} /> لا يوجد غائبون — جميع الطلاب حضروا
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {absentees.students.map((s) => {
                  const parent = parentOf(db, s)
                  return (
                    <div key={s.id} className="rounded-xl border border-danger/25 bg-danger/10 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{s.name}</span>
                        <Badge tone="danger"><XCircle size={12} /> غائب</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-muted flex items-center gap-1">
                          <PhoneCall size={11} /> {parent?.name || 'ولي الأمر غير مربوط'} {parent?.phone ? `— ${parent.phone}` : ''}
                        </span>
                        <button
                          className={cx('btn-ghost !py-1 !px-2.5 !text-[11px]', contactNote[s.id] && '!text-accent !border-accent/40')}
                          onClick={() => contactParent(s)}
                        >
                          {contactNote[s.id] ? 'تم التوثيق' : 'توثيق التواصل مع ولي الأمر'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle icon={Clock} title="إحصائيات الحضور" subtitle={`${circle?.name} — آخر 30 يوماً`} />
            <AttendanceDonut db={db} circleId={circle?.id} />
          </Card>
        </div>
      </div>

      <QRScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} students={allStudents} onScan={onScan} circleFilter={circle?.id} />

      <ContactParentModal
        open={!!contact}
        onClose={() => setContact(null)}
        student={contact?.student}
        circleName={contact?.circle?.name}
        parentPhone={contact?.parent?.phone}
        parentName={contact?.parent?.name}
        type="absent"
        detail={`آخر حصة: ${fmtDate(absentees.date || today)}`}
      />
    </div>
  )
}

function AttendanceDonut({ db, circleId }) {
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const list = db.attendance.filter((a) => a.circleId === circleId && a.date >= since.toISOString().slice(0, 10))
  const counts = { present: 0, late: 0, excused: 0, absent: 0 }
  list.forEach((a) => counts[a.status] = (counts[a.status] || 0) + 1)
  const total = list.length || 1
  const data = [
    { name: 'حاضر', v: counts.present, color: '#10B981' },
    { name: 'متأخر', v: counts.late, color: '#C89B54' },
    { name: 'معذور', v: counts.excused, color: '#0D9488' },
    { name: 'غائب', v: counts.absent, color: '#E5484D' },
  ]
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {data.map((d, i) => {
            const offset = data.slice(0, i).reduce((a, x) => a + x.v, 0)
            return (
              <circle
                key={d.name}
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke={d.color}
                strokeWidth="4"
                strokeDasharray={`${(d.v / total) * 88} 88`}
                strokeDashoffset={-offset / total * 88}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums">{list.length}</span>
          <span className="text-[10px] text-muted">تسجيلاً</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-xs flex-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-muted flex-1">{d.name}</span>
            <span className="font-bold tabular-nums">{Math.round((d.v / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
