import React, { useEffect, useState } from 'react'
import { SessionProvider, StoreProvider, AuthProvider, useAuth, useStore } from './lib/storage'
import { ToastProvider, Modal } from './components/ui'
import { Shell, roleLabel } from './components/layout'
import { initPush } from './lib/push'
import { BellRing, CheckCircle2 } from 'lucide-react'
import Login from './pages/Login'
import Circles from './pages/Circles'
import Attendance from './pages/Attendance'
import Recitations from './pages/Recitations'
import Exams from './pages/Exams'
import Reports from './pages/Reports'
import Certificates from './pages/Certificates'
import Settings from './pages/Settings'
import ImportExport from './pages/ImportExport'
import Profile from './pages/Profile'
import MyQR from './pages/MyQR'
import { AdminDashboard, TeacherDashboard, StudentDashboard, ParentDashboard } from './pages/dashboards'

const TITLES = {
  dashboard: 'لوحة التحكم',
  circles: 'الحلقات والطلاب',
  mystudents: 'طلابي',
  attendance: 'الحضور والغياب',
  recitations: 'التسميع اليومي',
  exams: 'الاختبارات',
  reports: 'التقارير الشهرية',
  certificates: 'الشهادات التكريمية',
  settings: 'الإعدادات والنسخ الاحتياطي',
  importexport: 'الاستيراد والتصدير (Excel)',
  profile: 'ملفي الشخصي',
  myqr: 'بطاقتي الرقمية',
}

const ALLOWED = {
  admin: ['dashboard', 'circles', 'attendance', 'recitations', 'exams', 'reports', 'certificates', 'importexport', 'settings'],
  teacher: ['dashboard', 'attendance', 'recitations', 'exams', 'reports', 'certificates', 'mystudents', 'profile'],
  student: ['dashboard', 'myqr', 'certificates'],
  parent: ['dashboard', 'reports'],
}

function NotificationGate() {
  const { db, update } = useStore()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const unread = user && db ? db.notifications.filter((n) => n.to === user.id && !n.read) : []

  useEffect(() => {
    if (user && (user.role === 'student' || user.role === 'parent') && unread.length > 0) setOpen(true)
    else setOpen(false)
  }, [user, unread.length])

  if (!open) return null
  return (
    <Modal
      open={open}
      onClose={() => {}}
      title="إشعارات جديدة — يتطلب تأكيد القراءة"
      icon={BellRing}
      footer={
        <button
          className="btn-primary w-full"
          onClick={() => {
            update((d) => d.notifications.forEach((n) => { if (n.to === user.id) n.read = true }))
            setOpen(false)
          }}
        >
          <CheckCircle2 size={16} /> تم الاطلاع
        </button>
      }
    >
      <div className="flex flex-col gap-2.5">
        {unread.map((n) => (
          <div key={n.id} className="rounded-xl border border-bronze/30 bg-bronze/10 px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm">{n.title}</span>
              <span className="text-[10px] text-muted">{new Date(n.createdAt).toLocaleString('en-GB')}</span>
            </div>
            <p className="text-sm text-muted leading-6">{n.body}</p>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function Root() {
  const { user } = useAuth()
  const [route, setRoute] = useState({ name: 'dashboard', params: {} })

  useEffect(() => {
    initPush()
  }, [])

  if (!user) return <Login />

  const go = (name, params = {}) => setRoute({ name, params })
  const allowed = ALLOWED[user.role] || ['dashboard']
  const name = allowed.includes(route.name) ? route.name : 'dashboard'

  const dashboards = {
    admin: <AdminDashboard go={go} />,
    teacher: <TeacherDashboard go={go} />,
    student: <StudentDashboard go={go} />,
    parent: <ParentDashboard go={go} />,
  }

  const pages = {
    dashboard: dashboards[user.role],
    circles: <Circles />,
    mystudents: <Circles teacherMode />,
    attendance: <Attendance />,
    recitations: <Recitations initialCircle={route.params?.circle} />,
    exams: <Exams />,
    reports: <Reports />,
    certificates: <Certificates />,
    settings: <Settings />,
    importexport: <ImportExport />,
    profile: <Profile />,
    myqr: <MyQR />,
  }

  return (
    <>
      <NotificationGate />
      <Shell active={name} onNavigate={go} title={TITLES[name] || 'قَنَد'} subtitle={`${roleLabel(user.role)} — ${user.name}`}>
        {pages[name]}
      </Shell>
    </>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <StoreProvider>
        <AuthProvider>
          <ToastProvider>
            <Root />
          </ToastProvider>
        </AuthProvider>
      </StoreProvider>
    </SessionProvider>
  )
}
