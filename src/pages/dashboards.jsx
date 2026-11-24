import React, { useMemo, useState } from 'react'
import {
  Users, BookOpen, ScanLine, Award, TrendingUp, CalendarCheck, AlertTriangle,
  QrCode, ShieldCheck, Star, Clock, CheckCircle2, PhoneCall, ChevronLeft,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { useStore, useAuth } from '../lib/storage'
import { Card, CardTitle, Stat, Badge, Empty, Tabs, Modal, ConfirmDialog } from '../components/ui'
import { StudentQRCard } from '../components/qr'
import { useToast } from '../components/ui'
import {
  absenteesOfLastSession, attendanceRate, studentProgress, examResultsOf,
  lastSessionDate, circleMonthly, computeAwardCandidates, monthlySeries, userById, circleById,
} from '../lib/analytics'
import { todayStr, monthKey, monthLabel, fmtDate, surahName, SURAHS, gradeOf, cx, uid, arNum } from '../lib/helpers'

const chartTheme = { grid: 'rgba(139,152,165,0.15)', tick: '#8b98a5', accent: '#10B981', bronze: '#C89B54', teal: '#0D9488' }

const tt = (label) => (
  <Tooltip
    contentStyle={{ background: '#121920', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12, color: '#e8edf1' }}
    labelStyle={{ color: '#8b98a5' }}
    formatter={(v) => [arNum(v), label]}
  />
)

/* ================= ADMIN ================= */
export function AdminDashboard({ go }) {
  const { db } = useStore()
  const month = monthKey(todayStr())
  const today = todayStr()

  const todayAtt = db.attendance.filter((a) => a.date === today)
  const todayRate = todayAtt.length
    ? Math.round((todayAtt.filter((a) => a.status === 'present' || a.status === 'late').length / todayAtt.length) * 100)
    : 0
  const monthRecs = db.recitations.filter((r) => r.date >= month + '-01')
  const avgScore = monthRecs.length ? Math.round((monthRecs.reduce((a, r) => a + r.score, 0) / monthRecs.length) * 10) / 10 : 0

  const absentees = db.circles
    .map((c) => ({ circle: c, ...absenteesOfLastSession(db, c.id) }))
    .filter((x) => x.students.length > 0)

  const circleChart = db.circles.map((c) => {
    const m = circleMonthly(db, c.id, month)
    return { name: c.name, الحضور: m.attendanceRate, المتوسط: m.avgScore, الصفحات: m.totalPages }
  })

  const awards = computeAwardCandidates(db, { from: month + '-01', to: today })

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={Users} label="إجمالي الطلاب" value={db.students.length} hint={`${db.circles.length} حلقات نشطة`} tone="accent" />
        <Stat icon={CalendarCheck} label="نسبة حضور اليوم" value={todayRate + '%'} hint={`${todayAtt.length} حصة مسجلة اليوم`} tone="teal" />
        <Stat icon={BookOpen} label="متوسط التسميع (هذا الشهر)" value={avgScore + '/10'} hint={`${monthRecs.length} جلسة تسميع`} tone="bronze" />
        <Stat icon={AlertTriangle} label="غائبون عن آخر حصة" value={absentees.reduce((a, x) => a + x.students.length, 0)} hint="عبر جميع الحلقات" tone="danger" />
      </div>

      {absentees.length > 0 && (
        <Card className="col-span-12 border-danger/30 bg-danger/5">
          <CardTitle
            icon={AlertTriangle}
            title="تنبيه: طلاب غائبون عن آخر حصة"
            subtitle="قائمة محدثة تلقائياً من آخر حصة مسجلة لكل حلقة"
            action={<button className="btn-ghost !py-2 !text-xs" onClick={() => go('attendance')}>فتح صفحة الحضور كاملة</button>}
          />
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {absentees.map(({ circle, date, students }) => (
              <div key={circle.id} className="rounded-xl border border-line bg-card2 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{circle.name}</span>
                  <Badge tone="danger">{fmtDate(date)}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {students.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 rounded-lg bg-danger/10 border border-danger/25 text-danger px-2 py-1 text-xs font-semibold">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="col-span-12 xl:col-span-7">
        <CardTitle icon={TrendingUp} title="أداء الحلقات — الشهر الحالي" subtitle="نسبة الحضور ومتوسط التسميع والصفحات المحفوظة" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={circleChart} margin={{ top: 8, left: -16 }}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              {tt('')}
              <Bar dataKey="الحضور" fill={chartTheme.accent} radius={[6, 6, 0, 0]} maxBarSize={34} />
              <Bar dataKey="المتوسط" fill={chartTheme.bronze} radius={[6, 6, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="col-span-12 xl:col-span-5">
        <CardTitle
          icon={Award}
          title="مرشحو التكريم — الشهر الحالي"
          subtitle="حساب آلي حسب معايير كل فئة"
          action={<button className="btn-bronze !py-2 !text-xs" onClick={() => go('certificates')}>إصدار الشهادات</button>}
        />
        <div className="flex flex-col gap-2.5">
          {[
            { k: 'mostMemorized', label: 'الأكثر حفظاً', icon: BookOpen },
            { k: 'mostDiligent', label: 'الأكثر مداومة', icon: CalendarCheck },
            { k: 'mostImproved', label: 'الأكثر تحسناً', icon: TrendingUp },
            { k: 'mostCarefulParent', label: 'الولي الأكثر حرصاً', icon: ShieldCheck },
          ].map(({ k, label, icon: Icon }) => {
            const a = awards[k]
            return (
              <div key={k} className="flex items-center gap-3 rounded-xl border border-line bg-card2 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-bronze/10 border border-bronze/25 text-bronze flex items-center justify-center shrink-0">
                  <Icon size={16} strokeWidth={1.9} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted">{label}</div>
                  <div className="text-sm font-bold truncate">{a ? a.name : '—'}</div>
                </div>
                {a && <Badge tone="bronze">{a.metric} {a.unit}</Badge>}
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="col-span-12 xl:col-span-7">
        <CardTitle icon={ScanLine} title="الحضور الأسبوعي" subtitle="نسبة الحضور يومياً عبر كل الحلقات" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last7Days(db)} margin={{ top: 8, left: -20 }}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="d" tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              {tt('نسبة الحضور')}
              <Area type="monotone" dataKey="rate" stroke={chartTheme.accent} fill="rgba(16,185,129,0.18)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="col-span-12 xl:col-span-5">
        <CardTitle icon={Clock} title="آخر الأنشطة" subtitle="أحدث الوقائع المسجلة" />
        <RecentActivity db={db} />
      </Card>
    </div>
  )
}

function last7Days(db) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    const list = db.attendance.filter((a) => a.date === ds)
    const rate = list.length ? Math.round((list.filter((a) => a.status === 'present' || a.status === 'late').length / list.length) * 100) : 0
    days.push({ d: ds.slice(5), rate })
  }
  return days
}

function RecentActivity({ db }) {
  const items = [
    ...db.recitations.slice(-4).map((r) => ({ k: r.id, at: r.createdAt, text: `تسميع ${userById(db, db.students.find((s) => s.id === r.studentId)?.userId)?.name || ''} — سورة ${surahName(r.surah)}، تقييم ${r.score}/10`, tone: 'accent' })),
    ...db.attendance.slice(-3).map((a) => ({ k: a.id, at: a.scannedAt, text: `حضور ${db.students.find((s) => s.id === a.studentId)?.name || ''} — ${a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : 'غائب'}`, tone: a.status === 'absent' ? 'danger' : 'teal' })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6)
  if (!items.length) return <Empty title="لا يوجد نشاط بعد" />
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) => (
        <div key={it.k} className="flex items-center gap-3 text-sm rounded-xl border border-line bg-card2 px-3.5 py-2.5">
          <span className={cx('w-2 h-2 rounded-full shrink-0', it.tone === 'danger' ? 'bg-danger' : it.tone === 'teal' ? 'bg-teal2' : 'bg-accent')} />
          <span className="flex-1 truncate">{it.text}</span>
        </div>
      ))}
    </div>
  )
}

/* ================= TEACHER ================= */
export function TeacherDashboard({ go }) {
  const { db, update, backupNow, notify } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [safeReset, setSafeReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const myCircles = db.circles.filter((c) => c.teacherId === user.id)
  const myCircleIds = myCircles.map((c) => c.id)
  const myStudents = db.students.filter((s) => myCircleIds.includes(s.circleId))
  const today = todayStr()

  const doSafeReset = async () => {
    setResetting(true)
    try {
      await backupNow()
      const admin = db.users.find((u) => u.role === 'admin')
      if (admin) {
        notify(admin.id, 'reset', 'تهيئة بيانات', `قام المعلم ${user.name} بتهيئة بيانات حلقاته. تم حفظ نسخة احتياطية صامتة أولاً.`)
      }
      update((d) => {
        d.recitations = d.recitations.filter((r) => !myCircleIds.includes(r.circleId))
        d.attendance = d.attendance.filter((a) => !myCircleIds.includes(a.circleId))
        d.exams = d.exams.filter((e) => !myCircleIds.includes(e.circleId))
      })
      toast('تمت تهيئة البيانات بعد حفظ نسخة احتياطية صامتة وإشعار مدير المدرسة')
    } catch (e) {
      toast('تعذر التهيئة: ' + e.message, 'error')
    }
    setResetting(false)
    setSafeReset(false)
  }

  const absentees = myCircles.map((c) => ({ circle: c, ...absenteesOfLastSession(db, c.id) })).filter((x) => x.students.length)
  const month = monthKey(today)
  const myRecs = db.recitations.filter((r) => r.teacherId === user.id && r.date >= month + '-01')
  const myExams = db.exams.filter((e) => myCircleIds.includes(e.circleId))

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={Users} label="طلابي في حلقاتي" value={myStudents.length} hint={myCircles.map((c) => c.name).join('، ')} tone="accent" />
        <Stat icon={BookOpen} label="جلسات التسميع هذا الشهر" value={myRecs.length} hint={`بمتوسط ${myRecs.length ? Math.round((myRecs.reduce((a, r) => a + r.score, 0) / myRecs.length) * 10) / 10 : 0}/10`} tone="bronze" />
        <Stat icon={CalendarCheck} label="متوسط حضور حلقاتي" value={avgRate(db, myStudents, month)} tone="teal" />
        <Stat icon={AlertTriangle} label="غائبون عن آخر حصة" value={absentees.reduce((a, x) => a + x.students.length, 0)} tone="danger" />
      </div>

      <div className="col-span-12 flex flex-wrap gap-2.5">
        <button className="btn-primary" onClick={() => go('attendance')}><QrCode size={16} /> تسجيل الحضور بالمسح</button>
        <button className="btn-ghost" onClick={() => go('recitations')}><BookOpen size={16} /> إدخال التسميع اليومي</button>
        <button className="btn-ghost" onClick={() => go('exams')}><ScanLine size={16} /> إعداد اختبار جديد</button>
        <button className="btn-bronze" onClick={() => go('certificates')}><Award size={16} /> تكريم المتميزين</button>
        <button className="btn-danger" onClick={() => setSafeReset(true)}>تهيئة البيانات (Safe Reset)</button>
      </div>

      <ConfirmDialog
        open={safeReset}
        onClose={() => setSafeReset(false)}
        title="تهيئة بيانات حلقاتك"
        message="سيتم أولاً رفع نسخة احتياطية كاملة صامتة (إلى النسخة السحابية، وإلا محلياً)، ثم إشعار مدير المدرسة، وبعد نجاح الحفظ فقط يتم تصفير سجلات التسميع والحضور والاختبارات الخاصة بحلقاتك."
        confirmLabel={resetting ? 'جارٍ الحفظ الصامت...' : 'حفظ صامت ثم تهيئة'}
        danger
        requireDouble
        onConfirm={doSafeReset}
      />

      {absentees.length > 0 && (
        <Card className="col-span-12 border-danger/30 bg-danger/5">
          <CardTitle icon={AlertTriangle} title="طلاب غائبون عن آخر حصة في حلقاتك" subtitle="يمكنك توثيق التواصل مع ولي الأمر من صفحة الحضور" />
          <div className="flex flex-wrap gap-2">
            {absentees.flatMap(({ circle, students }) =>
              students.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-2 rounded-xl bg-danger/10 border border-danger/25 text-danger px-3 py-2 text-xs font-semibold">
                  <AlertTriangle size={13} /> {s.name} <span className="text-danger/70">({circle.name})</span>
                </span>
              )),
            )}
          </div>
        </Card>
      )}

      {myCircles.map((c) => {
        const students = db.students.filter((s) => s.circleId === c.id)
        const chart = students.map((s) => {
          const recs = db.recitations.filter((r) => r.studentId === s.id).slice(-6)
          return { name: s.name.split(' ')[0], pages: recs.reduce((a, r) => a + (r.pages || 0), 0), score: recs.length ? Math.round(recs.reduce((a, r) => a + r.score, 0) / recs.length) : 0 }
        })
        return (
          <Card key={c.id} className="col-span-12 xl:col-span-6">
            <CardTitle
              icon={Users}
              title={c.name}
              subtitle={`${students.length} طالب — ${c.schedule.map((s) => s.day + ' ' + s.time).join('، ')}`}
              action={<button className="btn-ghost !py-1.5 !text-xs" onClick={() => go('recitations', { circle: c.id })}>تسميع</button>}
            />
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 4, left: -24 }}>
                  <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  {tt('')}
                  <Bar dataKey="pages" name="الصفحات" fill={chartTheme.accent} radius={[5, 5, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="score" name="التقييم" fill={chartTheme.bronze} radius={[5, 5, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )
      })}

      <Card className="col-span-12">
        <CardTitle icon={Clock} title="آخر نتائج الاختبارات" subtitle="نتائج آخر الاختبارات في حلقاتك" />
        {myExams.length === 0 ? (
          <Empty title="لا توجد اختبارات بعد" hint="أنشئ اختباراً جديداً من صفحة الاختبارات" />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {myExams.slice(-3).map((e) => (
              <div key={e.id} className="rounded-xl border border-line bg-card2 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{e.title}</span>
                  <Badge tone="teal">{fmtDate(e.date)}</Badge>
                </div>
                <div className="flex flex-col gap-1.5">
                  {e.results.slice(0, 5).map((r) => {
                    const s = db.students.find((x) => x.id === r.studentId)
                    if (!s) return null
                    const g = gradeOf(r.total)
                    return (
                      <div key={r.studentId} className="flex items-center justify-between text-xs">
                        <span className="text-muted">{s.name}</span>
                        <span className={cx('font-bold', g.color)}>{r.total}/100 — {g.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

const avgRate = (db, students, month) => {
  if (!students.length) return '0%'
  const rates = students.map((s) => attendanceRate(db, s.id, month + '-01', todayStr()))
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) + '%'
}

/* ================= STUDENT ================= */
export function StudentDashboard({ go }) {
  const { db } = useStore()
  const { user } = useAuth()
  const student = db.students.find((s) => s.id === user.studentId) || db.students.find((s) => s.userId === user.id)
  if (!student) return <Empty title="لم يتم ربط حسابك بملف طالب بعد" hint="تواصل مع مدير المدرسة" />
  const prog = studentProgress(db, student.id)
  const rate = attendanceRate(db, student.id)
  const exams = examResultsOf(db, student.id)
  const circle = circleById(db, student.circleId)
  const month = monthKey(todayStr())
  const series = monthlySeries(db, student.id, month)
  const surahBars = Object.entries(prog.bySurah)
    .map(([n, pages]) => ({ name: surahName(n), pages }))
    .sort((a, b) => b.pages - a.pages)
    .slice(0, 8)
  const maxPages = Math.max(...surahBars.map((s) => s.pages), 1)

  const todayAtt = db.attendance.find((a) => a.studentId === student.id && a.date === todayStr())

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 card p-6 flex flex-col md:flex-row md:items-center gap-4 bg-gradient-to-l from-accent/10 to-transparent border-accent/20">
        <div className="w-14 h-14 rounded-2xl bg-bronze/15 border border-bronze/30 text-bronze flex items-center justify-center font-amiri text-3xl shrink-0">
          {student.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="font-amiri text-3xl font-bold">{student.name}</h2>
          <p className="text-sm text-muted mt-1">
            {circle?.name || 'بدون حلقة'} — {circle?.teacherId ? userById(db, circle.teacherId)?.name : ''}
          </p>
        </div>
        {todayAtt && (
          <Badge tone={todayAtt.status === 'present' ? 'accent' : todayAtt.status === 'late' ? 'bronze' : 'danger'}>
            {todayAtt.status === 'present' ? 'حاضر اليوم' : todayAtt.status === 'late' ? 'وصلت متأخراً اليوم' : todayAtt.status === 'excused' ? 'غياب معذور اليوم' : 'غائب اليوم'}
          </Badge>
        )}
      </div>

      <div className="col-span-12 grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={BookOpen} label="الصفحات المحفوظة" value={prog.pages} hint={`≈ ${prog.juz} من الأجزاء (20 صفحة للجزء)`} tone="accent" />
        <Stat icon={Star} label="متوسط التقييم" value={prog.avgScore + '/10'} hint={`${prog.recCount} جلسة تسميع`} tone="bronze" />
        <Stat icon={CalendarCheck} label="نسبة الحضور" value={rate + '%'} hint="منذ التسجيل" tone="teal" />
        <Stat icon={TrendingUp} label="الآيات المسجلة" value={prog.ayahs} hint="إجمالي آيات التسميع" tone="neutral" />
      </div>

      <Card className="col-span-12 xl:col-span-7">
        <CardTitle icon={TrendingUp} title="تطور الحفظ — الشهر الحالي" subtitle="الصفحات التراكمية عبر أيام الشهر" />
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series.byDayPages} margin={{ top: 6, left: -20 }}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              {tt('صفحات تراكمية')}
              <Area type="monotone" dataKey="pages" stroke={chartTheme.bronze} fill="rgba(200,155,84,0.16)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="col-span-12 xl:col-span-5">
        <CardTitle icon={Award} title="خريطة السور" subtitle="أكثر السورةً في مسارك" />
        {surahBars.length === 0 ? (
          <Empty title="لا يوجد تسميع بعد" hint="ابدأ مع معلمك" />
        ) : (
          <div className="flex flex-col gap-2.5">
            {surahBars.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-muted tabular-nums">{s.pages} صفحة</span>
                </div>
                <div className="h-2 rounded-full bg-card2 border border-line overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-l from-accent to-teal2 transition-all duration-700" style={{ width: `${Math.round((s.pages / maxPages) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="col-span-12 xl:col-span-6">
        <CardTitle icon={BookOpen} title="آخر جلسات التسميع" />
        <div className="flex flex-col gap-2">
          {db.recitations.filter((r) => r.studentId === student.id).slice(-6).reverse().map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-card2 px-3.5 py-2.5 text-sm">
              <Badge tone={r.type === 'hifz' ? 'accent' : 'teal'}>{r.type === 'hifz' ? 'حفظ جديد' : 'مراجعة'}</Badge>
              <span className="flex-1 font-semibold">{surahName(r.surah)} — من آية {r.fromAyah} إلى {r.toAyah}</span>
              <span className="text-xs text-muted">{fmtDate(r.date)}</span>
              <Badge tone="bronze">{r.score}/10</Badge>
            </div>
          ))}
          {!db.recitations.some((r) => r.studentId === student.id) && <Empty title="لا توجد جلسات بعد" />}
        </div>
      </Card>

      <Card className="col-span-12 xl:col-span-6">
        <CardTitle icon={CheckCircle2} title="سجل الاختبارات" />
        {exams.length === 0 ? (
          <Empty title="لا توجد اختبارات بعد" />
        ) : (
          <div className="flex flex-col gap-2">
            {exams.slice(-5).reverse().map((e) => {
              const g = gradeOf(e.total)
              return (
                <div key={e.examId + e.date} className="flex items-center gap-3 rounded-xl border border-line bg-card2 px-3.5 py-2.5 text-sm">
                  <span className="flex-1 font-semibold">{e.title}</span>
                  <span className="text-xs text-muted">{fmtDate(e.date)}</span>
                  <span className={cx('font-bold text-sm', g.color)}>{e.total}/100</span>
                  <Badge tone="bronze">{g.label}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

/* ================= PARENT ================= */
export function ParentDashboard({ go }) {
  const { db, update } = useStore()
  const { user } = useAuth()
  const kids = db.students.filter((s) => s.parentId === user.id)
  const [activeKid, setActiveKid] = useState(kids[0]?.id)
  const kid = kids.find((k) => k.id === activeKid) || kids[0]

  if (!kids.length) return <Empty title="لا يوجد أبناء مرتبطون بحسابك" hint="تواصل مع مدير المدرسة لربط أبنائك" />

  const prog = kid ? studentProgress(db, kid.id) : null
  const rate = kid ? attendanceRate(db, kid.id) : 0
  const exams = kid ? examResultsOf(db, kid.id) : []
  const today = todayStr()
  const todayAtt = kid ? db.attendance.filter((a) => a.studentId === kid.id && a.date >= today).slice(-1)[0] : null
  const attList = kid ? db.attendance.filter((a) => a.studentId === kid.id).slice(-10).reverse() : []
  const myLogs = db.parentLogs.filter((l) => l.parentId === user.id).slice(-8).reverse()
  const month = monthKey(today)
  const monthSeries = kid ? monthlySeries(db, kid.id, month) : null

  const confirmReading = () => {
    update((d) => {
      d.parentLogs.push({
        id: uid(),
        parentId: user.id,
        studentId: kid.id,
        reportType: 'تقرير المتابعة الشهري',
        reportDate: today,
        confirmedAt: new Date().toISOString(),
      })
    })
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <Tabs tabs={kids.map((k) => ({ key: k.id, label: k.name }))} active={kid?.id} onChange={setActiveKid} />
      </div>

      {kid && (
        <>
          <div className="col-span-12 grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat
              icon={todayAtt?.status === 'absent' ? AlertTriangle : CalendarCheck}
              label="حالة اليوم"
              value={todayAtt ? (todayAtt.status === 'present' ? 'حاضر' : todayAtt.status === 'late' ? 'متأخر' : todayAtt.status === 'excused' ? 'معذور' : 'غائب') : 'لا حصة اليوم'}
              tone={todayAtt?.status === 'absent' ? 'danger' : 'accent'}
            />
            <Stat icon={CalendarCheck} label="نسبة الحضور" value={rate + '%'} hint="منذ بداية التسجيل" tone="teal" />
            <Stat icon={BookOpen} label="الصفحات المحفوظة" value={prog.pages} hint={`≈ ${prog.juz} أجزاء — متوسط ${prog.avgScore}/10`} tone="bronze" />
            <Stat icon={CheckCircle2} label="تأكيدات المتابعة" value={db.parentLogs.filter((l) => l.parentId === user.id).length} hint="تساهم في مؤشر «الولي الأكثر حرصاً»" tone="neutral" />
          </div>

          <Card className="col-span-12 xl:col-span-8">
            <CardTitle
              icon={CheckCircle2}
              title={`تقرير المتابعة — ${monthLabel(month)}`}
              subtitle="تأكيد الاطلاع يُسجَّل تلقائياً ضمن مؤشر الولي الأكثر حرصاً"
              action={
                <button className="btn-primary !py-2 !text-xs" onClick={confirmReading}>
                  <CheckCircle2 size={14} /> تأكيد الاطلاع والمتابعة
                </button>
              }
            />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="h-52">
                <p className="text-xs text-muted mb-2">تطور التقييمات هذا الشهر</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthSeries.byDayScore} margin={{ top: 4, left: -24 }}>
                    <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                    {tt('التقييم')}
                    <Line type="monotone" dataKey="score" stroke={chartTheme.accent} strokeWidth={2.5} dot={{ r: 3, fill: chartTheme.accent }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-52">
                <p className="text-xs text-muted mb-2">الحضور في آخر 10 حصص</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attList.map((a) => ({ d: a.date.slice(5), v: a.status === 'present' ? 100 : a.status === 'late' ? 70 : a.status === 'excused' ? 40 : 0 }))} margin={{ top: 4, left: -24 }}>
                    <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="d" tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                    {tt('')}
                    <Bar dataKey="v" radius={[5, 5, 0, 0]} maxBarSize={26}>
                      {attList.map((a) => (
                        <Cell key={a.id} fill={a.status === 'present' ? chartTheme.accent : a.status === 'late' ? chartTheme.bronze : a.status === 'excused' ? chartTheme.teal : '#E5484D'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card className="col-span-12 xl:col-span-4">
            <CardTitle icon={Award} title="نتائج الاختبارات" />
            {exams.length === 0 ? <Empty title="لا نتائج بعد" /> : (
              <div className="flex flex-col gap-2">
                {exams.slice(-4).reverse().map((e) => (
                  <div key={e.examId + e.date} className="rounded-xl border border-line bg-card2 px-3.5 py-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">{e.title}</span>
                      <Badge tone="bronze">{e.total}/100</Badge>
                    </div>
                    <div className="flex gap-3 mt-1.5 text-[11px] text-muted">
                      <span>الحفظ {e.memorization}</span>
                      <span>التجويد {e.tajweed}</span>
                      <span>الصوت {e.voice}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-line">
              <p className="text-xs text-muted mb-2 flex items-center gap-1.5"><PhoneCall size={12} /> توثيق التواصل مع المعلم</p>
              <p className="text-sm">{circleById(db, kid.circleId)?.teacherId ? userById(db, circleById(db, kid.circleId).teacherId)?.name : '—'}</p>
              <p className="text-xs text-muted tabular-nums" dir="ltr">{circleById(db, kid.circleId)?.teacherId ? userById(db, circleById(db, kid.circleId).teacherId)?.phone : ''}</p>
            </div>
          </Card>

          <Card className="col-span-12">
            <CardTitle icon={Clock} title="سجل تأكيدات الاطلاع" subtitle="آخر تأكيدات القراءة" />
            {myLogs.length === 0 ? <Empty title="لم تقم بأي تأكيد بعد" hint="اضغط «تأكيد الاطلاع والمتابعة» في الأعلى" /> : (
              <div className="flex flex-wrap gap-2">
                {myLogs.map((l) => (
                  <span key={l.id} className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/25 text-accent px-3 py-1.5 text-xs font-semibold">
                    <CheckCircle2 size={13} /> {l.reportType} — {fmtDate(l.reportDate)}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
