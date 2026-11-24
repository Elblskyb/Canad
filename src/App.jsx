import React, { useState } from 'react'
import { StoreProvider, AuthProvider, useAuth } from './lib/storage'
import { ToastProvider } from './components/ui'
import { Shell, roleLabel } from './components/layout'
import Login from './pages/Login'
import Circles from './pages/Circles'
import Attendance from './pages/Attendance'
import Recitations from './pages/Recitations'
import Exams from './pages/Exams'
import Reports from './pages/Reports'
import Certificates from './pages/Certificates'
import Settings from './pages/Settings'
import MyQR from './pages/MyQR'
import { AdminDashboard, TeacherDashboard, StudentDashboard, ParentDashboard } from './pages/dashboards'

const TITLES = {
  dashboard: 'لوحة التحكم',
  circles: 'الحلقات والطلاب',
  attendance: 'الحضور والغياب',
  recitations: 'التسميع اليومي',
  exams: 'الاختبارات',
  reports: 'التقارير الشهرية',
  certificates: 'الشهادات التكريمية',
  settings: 'الإعدادات والنسخ الاحتياطي',
  myqr: 'بطاقتي الرقمية',
}

const ALLOWED = {
  admin: ['dashboard', 'circles', 'attendance', 'recitations', 'exams', 'reports', 'certificates', 'settings'],
  teacher: ['dashboard', 'attendance', 'recitations', 'exams', 'reports', 'certificates'],
  student: ['dashboard', 'myqr', 'certificates'],
  parent: ['dashboard', 'reports'],
}

function Root() {
  const { user } = useAuth()
  const [route, setRoute] = useState({ name: 'dashboard', params: {} })

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
    attendance: <Attendance />,
    recitations: <Recitations initialCircle={route.params?.circle} />,
    exams: <Exams />,
    reports: <Reports />,
    certificates: <Certificates />,
    settings: <Settings />,
    myqr: <MyQR />,
  }

  return (
    <Shell
      active={name}
      onNavigate={go}
      title={TITLES[name] || 'كند'}
      subtitle={`${roleLabel(user.role)} — ${user.name}`}
    >
      {pages[name]}
    </Shell>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AuthProvider>
        <ToastProvider>
          <Root />
        </ToastProvider>
      </AuthProvider>
    </StoreProvider>
  )
}
