import React, { useMemo, useState } from 'react'
import { BarChart3, Printer, FileDown, Users, BookOpen, CalendarCheck, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, AreaChart, Area, Cell,
} from 'recharts'
import { jsPDF } from 'jspdf'
import { useStore, useAuth } from '../lib/storage'
import { useToast } from '../components/ui'
import { Card, CardTitle, Stat, Badge, Field, Tabs } from '../components/ui'
import { monthlySeries, circleMonthly, examResultsOf, studentProgress, attendanceRate, circleById } from '../lib/analytics'
import { todayStr, monthKey, monthLabel, fmtDate, surahName, arNum, gradeOf } from '../lib/helpers'

const chartTheme = { grid: 'rgba(139,152,165,0.15)', tick: '#8b98a5', accent: '#10B981', bronze: '#C89B54', danger: '#E5484D', teal: '#0D9488' }
const tt = (label) => (
  <Tooltip
    contentStyle={{ background: '#121920', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
    labelStyle={{ color: '#8b98a5' }}
    formatter={(v) => [arNum(v), label]}
  />
)

export default function Reports() {
  const { db } = useStore()
  const { user } = useAuth()
  const toast = useToast()

  const months = useMemo(() => {
    const out = []
    const d = new Date()
    for (let i = 0; i < 6; i++) {
      out.push(monthKey(d.toISOString().slice(0, 10)))
      d.setMonth(d.getMonth() - 1)
    }
    return out
  }, [])

  const [month, setMonth] = useState(months[0])
  const [scope, setScope] = useState('student')
  const studentList = user.role === 'student'
    ? db.students.filter((s) => s.id === user.studentId)
    : user.role === 'parent'
      ? db.students.filter((s) => s.parentId === user.id)
      : db.students.filter((s) => user.role === 'admin' || db.circles.find((c) => c.id === s.circleId)?.teacherId === user.id)
  const circleList = user.role === 'admin' ? db.circles : db.circles.filter((c) => c.teacherId === user.id)
  const [studentId, setStudentId] = useState(studentList[0]?.id)
  const [circleId, setCircleId] = useState(circleList[0]?.id)

  const student = studentList.find((s) => s.id === studentId) || studentList[0]
  const circle = circleList.find((c) => c.id === circleId) || circleList[0]

  const exportPDF = () => {
    const el = document.getElementById('report-root')
    if (!el) return
    toast('جارٍ تجهيز ملف PDF...', 'info')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    if (typeof pdf.html === 'function') {
      pdf.setFont('helvetica', 'normal')
      pdf.html(el, {
        callback: () => {
          pdf.save(`تقرير-${monthLabel(month)}.pdf`)
          toast('تم حفظ التقرير بصيغة PDF')
        },
        x: 8,
        y: 8,
        width: 194,
        windowWidth: 1100,
      })
    } else {
      window.print()
      toast('استخدم "حفظ كملف PDF" من نافذة الطباعة', 'info')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 no-print">
        <Tabs
          tabs={[
            { key: 'student', label: 'تقرير طالب' },
            { key: 'circle', label: 'تقرير حلقة' },
          ]}
          active={scope}
          onChange={setScope}
        />
        <select className="input !py-2 w-44" value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        {scope === 'student' ? (
          <select className="input !py-2 w-52" value={student?.id || ''} onChange={(e) => setStudentId(e.target.value)}>
            {studentList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <select className="input !py-2 w-52" value={circle?.id || ''} onChange={(e) => setCircleId(e.target.value)}>
            {circleList.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <div className="flex-1" />
        <button className="btn-ghost" onClick={() => window.print()}>
          <Printer size={15} /> طباعة
        </button>
        <button className="btn-primary" onClick={exportPDF}>
          <FileDown size={15} /> تصدير PDF
        </button>
      </div>

      <div id="report-root" className="flex flex-col gap-4">
        {scope === 'student' && student ? (
          <StudentReport db={db} student={student} month={month} />
        ) : scope === 'circle' && circle ? (
          <CircleReport db={db} circle={circle} month={month} />
        ) : (
          <Card><p className="text-sm text-muted">لا توجد بيانات كافية لعرض التقرير</p></Card>
        )}
      </div>
    </div>
  )
}

function StudentReport({ db, student, month }) {
  const series = monthlySeries(db, student.id, month)
  const prog = studentProgress(db, student.id)
  const rate = attendanceRate(db, student.id, month + '-01', month + '-31')
  const recs = db.recitations.filter((r) => r.studentId === student.id && r.date >= month + '-01' && r.date <= month + '-31')
  const exams = examResultsOf(db, student.id).filter((e) => e.date >= month + '-01')
  const circle = circleById(db, student.circleId)

  return (
    <>
      <Card className="!border-accent/30">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-bronze/15 border border-bronze/30 text-bronze flex items-center justify-center font-amiri text-2xl">
            {student.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="font-amiri text-3xl font-bold">{student.name}</h2>
            <p className="text-sm text-muted">التقرير الشهري — {monthLabel(month)} {circle ? `— ${circle.name}` : ''}</p>
          </div>
          <Badge tone="accent">{db.settings.schoolName}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={BookOpen} label="صفحات الحفظ في الشهر" value={series.byDayPages.length ? series.byDayPages[series.byDayPages.length - 1].pages : 0} hint={`إجمالي pages: ${prog.pages}`} tone="accent" />
        <Stat icon={TrendingUp} label="متوسط تقييم الشهر" value={recs.length ? Math.round(recs.reduce((a, r) => a + r.score, 0) / recs.length) + '/10' : '—'} hint={`${recs.length} جلسة`} tone="bronze" />
        <Stat icon={CalendarCheck} label="نسبة الحضور في الشهر" value={rate + '%'} tone="teal" />
        <Stat icon={BarChart3} label="عدد الاختبارات" value={exams.length} hint={exams.length ? `آخر تقدير: ${gradeOf(exams.slice(-1)[0].total).label}` : ''} tone="neutral" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-6">
          <CardTitle icon={TrendingUp} title="تطور التقييمات" subtitle="evaluations كل جلسات التسميع في الشهر" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series.byDayScore} margin={{ top: 6, left: -24 }}>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                {tt('التقييم')}
                <Line type="monotone" dataKey="score" stroke={chartTheme.accent} strokeWidth={2.5} dot={{ r: 3, fill: chartTheme.accent }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="col-span-12 xl:col-span-6">
          <CardTitle icon={BookOpen} title="الصفحات التراكمية" subtitle="تقدم الحفظ عبر أيام الشهر" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series.byDayPages} margin={{ top: 6, left: -24 }}>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                {tt('صفحات تراكمية')}
                <Area type="monotone" dataKey="pages" stroke={chartTheme.bronze} fill="rgba(200,155,84,0.18)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-7">
          <CardTitle icon={CalendarCheck} title="سجل الحضور في الشهر" subtitle="كل أيام الشهر" />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(series.attByDate).map(([d, v]) => ({ d: d.slice(5), v }))}
                margin={{ top: 6, left: -24 }}
              >
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="d" tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                {tt('')}
                <Bar dataKey="v" radius={[5, 5, 0, 0]} maxBarSize={30}>
                  {Object.entries(series.attByDate).map(([d, v]) => (
                    <Cell key={d} fill={v === 100 ? chartTheme.accent : v === 70 ? chartTheme.bronze : v === 40 ? chartTheme.teal : chartTheme.danger} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="col-span-12 xl:col-span-5">
          <CardTitle icon={BarChart3} title="نتائج اختبارات الشهر" />
          {exams.length === 0 ? (
            <p className="text-sm text-muted">لا توجد اختبارات في هذا الشهر</p>
          ) : (
            <div className="flex flex-col gap-2">
              {exams.map((e) => {
                const g = gradeOf(e.total)
                return (
                  <div key={e.examId + e.date} className="rounded-xl border border-line bg-card2 px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{e.title}</div>
                      <div className="text-[11px] text-muted">{fmtDate(e.date)}</div>
                    </div>
                    <div className="text-left">
                      <div className={`font-bold tabular-nums ${g.color}`}>{e.total}/100</div>
                      <div className="text-[11px] text-muted">{g.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle icon={BookOpen} title="تفصيل جلسات التسميع في الشهر" />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>{['التاريخ', 'النوع', 'السورة', 'من - إلى', 'صفحات', 'تقييم', 'ملاحظات'].map((c) => <th key={c} className="th">{c}</th>)}</tr>
            </thead>
            <tbody>
              {recs.sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => (
                <tr key={r.id}>
                  <td className="td text-sm text-muted">{fmtDate(r.date)}</td>
                  <td className="td"><Badge tone={r.type === 'hifz' ? 'accent' : 'teal'}>{r.type === 'hifz' ? 'حفظ' : 'مراجعة'}</Badge></td>
                  <td className="td text-sm">{surahName(r.surah)}</td>
                  <td className="td text-sm text-muted tabular-nums">{r.fromAyah} → {r.toAyah}</td>
                  <td className="td text-sm tabular-nums">{r.pages}</td>
                  <td className="td text-sm font-bold tabular-nums">{r.score}/10</td>
                  <td className="td text-xs text-muted">{r.notes || '—'}</td>
                </tr>
              ))}
              {!recs.length && (
                <tr><td className="td text-center text-muted py-6" colSpan={7}>لا توجد جلسات في هذا الشهر</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

function CircleReport({ db, circle, month }) {
  const m = circleMonthly(db, circle.id, month)
  return (
    <>
      <Card className="!border-accent/30">
        <h2 className="font-amiri text-3xl font-bold">{circle.name}</h2>
        <p className="text-sm text-muted mt-1">تقرير شهري للحلقة — {monthLabel(month)} — {m.students.length} طالب</p>
      </Card>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={Users} label="عدد الطلاب" value={m.students.length} tone="accent" />
        <Stat icon={CalendarCheck} label="نسبة حضور الحلقة" value={m.attendanceRate + '%'} tone="teal" />
        <Stat icon={BookOpen} label="صفحات محفوظة في الشهر" value={m.totalPages} tone="bronze" />
        <Stat icon={TrendingUp} label="متوسط تقييم الحلقة" value={m.avgScore + '/10'} tone="neutral" />
      </div>
      <Card>
        <CardTitle icon={BarChart3} title="مقارنة الطلاب في الشهر" subtitle="الصفحات المحفوظة ونسبة الحضور ومتوسط التقييم" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m.perStudent.map((p) => ({ name: p.student.name.split(' ')[0], الصفحات: p.pages, الحضور: p.rate, التقييم: p.avgScore }))} margin={{ top: 6, left: -20 }}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              {tt('')}
              <Bar dataKey="الصفحات" fill={chartTheme.accent} radius={[5, 5, 0, 0]} maxBarSize={30} />
              <Bar dataKey="الحضور" fill={chartTheme.bronze} radius={[5, 5, 0, 0]} maxBarSize={30} />
              <Bar dataKey="التقييم" fill={chartTheme.teal} radius={[5, 5, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <CardTitle icon={Users} title="جدول أداء الطلاب" />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>{['الطالب', 'الصفحات', 'نسبة الحضور', 'متوسط التقييم', 'الحالة'].map((c) => <th key={c} className="th">{c}</th>)}</tr>
            </thead>
            <tbody>
              {m.perStudent.map((p) => (
                <tr key={p.student.id}>
                  <td className="td font-semibold text-sm">{p.student.name}</td>
                  <td className="td tabular-nums text-sm">{p.pages}</td>
                  <td className="td tabular-nums text-sm">{p.rate}%</td>
                  <td className="td tabular-nums text-sm">{p.avgScore ? p.avgScore + '/10' : '—'}</td>
                  <td className="td">
                    <Badge tone={p.rate >= 85 ? 'accent' : p.rate >= 60 ? 'bronze' : 'danger'}>
                      {p.rate >= 85 ? 'متميز' : p.rate >= 60 ? 'جيد' : 'يحتاج متابعة'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
