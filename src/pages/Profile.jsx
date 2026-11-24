import React, { useState } from 'react'
import { UserCircle, Users, CalendarCheck, BookOpen, Camera, GraduationCap } from 'lucide-react'
import { useStore, useAuth } from '../lib/storage'
import { useToast, Card, CardTitle, Stat } from '../components/ui'
import { attendanceRate, userById } from '../lib/analytics'
import { compressImage } from '../lib/photo'
import { todayStr, monthKey } from '../lib/helpers'

export default function Profile() {
  const { db, update } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [photo, setPhoto] = useState(user.photo || '')

  const myCircles = db.circles.filter((c) => c.teacherId === user.id)
  const myCircleIds = myCircles.map((c) => c.id)
  const myStudents = db.students.filter((s) => myCircleIds.includes(s.circleId))
  const month = monthKey(todayStr())
  const monthRecs = db.recitations.filter((r) => r.teacherId === user.id && r.date >= month + '-01')
  const monthAtt = db.attendance.filter((a) => myCircleIds.includes(a.circleId) && a.date >= month + '-01')
  const attended = monthAtt.filter((a) => a.status === 'present' || a.status === 'late').length
  const attRate = monthAtt.length ? Math.round((attended / monthAtt.length) * 100) : 0
  const avgScore = monthRecs.length ? Math.round((monthRecs.reduce((a, r) => a + r.score, 0) / monthRecs.length) * 10) / 10 : 0

  const onPhoto = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const data = await compressImage(f)
      setPhoto(data)
      update((d) => {
        const u = d.users.find((x) => x.id === user.id)
        if (u) u.photo = data
      })
      toast('تم تحديث صورتك الشخصية (مضغوطة تلقائياً)')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4 max-w-4xl">
      <Card className="col-span-12 flex flex-col md:flex-row items-center gap-5 !border-accent/25">
        <div className="relative">
          {photo ? (
            <img src={photo} alt="" className="w-24 h-24 rounded-3xl object-cover border-2 border-bronze/40" />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-teal2/10 border-2 border-teal2/30 text-teal2 flex items-center justify-center font-amiri text-5xl">{user.name.charAt(0)}</div>
          )}
          <label className="absolute -bottom-2 -left-2 w-9 h-9 rounded-xl bg-accent text-[#04110c] flex items-center justify-center cursor-pointer shadow-soft hover:bg-[#34d399] transition-colors" title="تغيير الصورة">
            <Camera size={16} />
            <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          </label>
        </div>
        <div className="text-center md:text-right flex-1">
          <h2 className="font-amiri text-3xl font-bold">{user.name}</h2>
          <p className="text-sm text-muted mt-1">{user.email} {user.phone ? `— ${user.phone}` : ''}</p>
          <p className="text-xs text-muted mt-1">معلم — {myCircles.length} حلقة ({myCircles.map((c) => c.name).join('، ') || '—'})</p>
        </div>
      </Card>

      <div className="col-span-12 grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={Users} label="عدد طلابي" value={myStudents.length} tone="accent" />
        <Stat icon={CalendarCheck} label="حضور حلقاتي هذا الشهر" value={attRate + '%'} hint={`${monthAtt.length} سجل حضور`} tone="teal" />
        <Stat icon={BookOpen} label="جلسات التسميع هذا الشهر" value={monthRecs.length} hint={`بمتوسط ${avgScore}/10`} tone="bronze" />
        <Stat icon={GraduationCap} label="اختبارات حلقاتي" value={db.exams.filter((e) => myCircleIds.includes(e.circleId)).length} tone="neutral" />
      </div>

      <Card className="col-span-12">
        <CardTitle icon={Users} title="طلاب حلقاتي" subtitle={`${myStudents.length} طالب`} />
        {myStudents.length === 0 ? (
          <p className="text-sm text-muted">لا يوجد طلاب في حلقاتك بعد — عينهم من صفحة «طلابي» أو من لوحة المدير</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {myStudents.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-2 rounded-xl border border-line bg-card2 px-3.5 py-2 text-sm">
                {s.photo ? <img src={s.photo} alt="" className="w-7 h-7 rounded-lg object-cover" /> : <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">{s.name.charAt(0)}</span>}
                {s.name}
                <span className="text-xs text-muted">حضور {attendanceRate(db, s.id)}%</span>
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
