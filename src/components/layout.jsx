import React, { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, ScanLine, BarChart3, Award, Settings, BookOpen,
  GraduationCap, QrCode, Menu, X, Sun, Moon, LogOut, ChevronRight, Landmark, FileSpreadsheet, UserCircle,
} from 'lucide-react'
import { cx } from '../lib/helpers'
import { useAuth } from '../lib/storage'

export const NAV = {
  admin: [
    { key: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { key: 'circles', label: 'الحلقات والمعلمون والطلاب', icon: Users },
    { key: 'attendance', label: 'الحضور والغياب', icon: ScanLine },
    { key: 'reports', label: 'التقارير الشهرية', icon: BarChart3 },
    { key: 'certificates', label: 'الشهادات التكريمية', icon: Award },
    { key: 'importexport', label: 'الاستيراد والتصدير', icon: FileSpreadsheet },
    { key: 'settings', label: 'الإعدادات والنسخ الاحتياطي', icon: Settings },
  ],
  teacher: [
    { key: 'dashboard', label: 'لوحة المعلم', icon: LayoutDashboard },
    { key: 'attendance', label: 'تسجيل الحضور', icon: ScanLine },
    { key: 'recitations', label: 'التسميع اليومي', icon: BookOpen },
    { key: 'exams', label: 'الاختبارات', icon: GraduationCap },
    { key: 'mystudents', label: 'طلابي', icon: Users },
    { key: 'reports', label: 'التقارير الشهرية', icon: BarChart3 },
    { key: 'certificates', label: 'التكريمات', icon: Award },
    { key: 'profile', label: 'ملفي الشخصي', icon: UserCircle },
  ],
  student: [
    { key: 'dashboard', label: 'مسار الحفظ', icon: LayoutDashboard },
    { key: 'myqr', label: 'بطاقتي الرقمية', icon: QrCode },
    { key: 'certificates', label: 'شهاداتي التكريمية', icon: Award },
  ],
  parent: [
    { key: 'dashboard', label: 'متابعة الأبناء', icon: LayoutDashboard },
    { key: 'reports', label: 'التقارير', icon: BarChart3 },
  ],
}

export function useTheme() {
  const [light, setLight] = useState(() => localStorage.getItem('kand_theme') === 'light')
  useEffect(() => {
    document.documentElement.classList.toggle('light', light)
    localStorage.setItem('kand_theme', light ? 'light' : 'dark')
  }, [light])
  return [light, () => setLight((v) => !v)]
}

function Brand({ compact }) {
  return (
    <div className={cx('flex items-center gap-3', compact && 'justify-center')}>
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-teal2 flex items-center justify-center text-[#04110c] shrink-0 shadow-[0_6px_20px_rgba(16,185,129,0.35)]">
        <Landmark size={20} strokeWidth={1.9} />
      </div>
      {!compact && (
        <div className="leading-6">
          <div className="font-amiri text-2xl font-bold text-ink">كند</div>
          <div className="text-[10px] text-muted -mt-1">مدرسة القرآن الكريم</div>
        </div>
      )}
    </div>
  )
}

export function Shell({ active, onNavigate, title, subtitle, children, headerActions }) {
  const { user, logout } = useAuth()
  const [light, toggleTheme] = useTheme()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('kand_sidebar') === 'collapsed')
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = NAV[user?.role] || []

  const toggleSidebar = () => {
    const v = !collapsed
    setCollapsed(v)
    localStorage.setItem('kand_sidebar', v ? 'collapsed' : 'open')
  }

  const NavItems = ({ onClick }) => (
    <nav className="flex flex-col gap-1 px-3">
      {nav.map((item) => {
        const activeItem = active === item.key
        return (
          <button
            key={item.key}
            onClick={() => {
              onNavigate(item.key)
              onClick?.()
            }}
            title={item.label}
            className={cx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98]',
              activeItem
                ? 'bg-accent/12 text-accent border border-accent/25'
                : 'text-muted hover:text-ink hover:bg-card2 border border-transparent',
              collapsed && 'lg:justify-center lg:px-0',
            )}
          >
            <item.icon size={18} strokeWidth={1.9} className="shrink-0" />
            <span className={cx('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
            {activeItem && !collapsed && <ChevronRight size={14} className="mr-auto opacity-60 lg:mr-auto hidden lg:block" />}
          </button>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen app-chrome">
      {/* Sidebar — desktop */}
      <aside
        className={cx(
          'hidden lg:flex flex-col fixed top-0 right-0 h-full bg-card border-l border-line z-40 transition-all duration-300',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <div className={cx('py-5 border-b border-line', collapsed ? 'px-3 flex justify-center' : 'px-5')}>
          <Brand compact={collapsed} />
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavItems />
        </div>
        <div className="p-3 border-t border-line">
          <button onClick={toggleSidebar} className="icon-btn w-full !h-10" title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}>
            <Menu size={17} />
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 right-0 h-full w-72 bg-card border-l border-line flex flex-col animate-fadeUp">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <Brand />
              <button className="icon-btn" onClick={() => setMobileOpen(false)}>
                <X size={17} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <NavItems onClick={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={cx('transition-all duration-300', collapsed ? 'lg:pr-[76px]' : 'lg:pr-64')}>
        <header className="sticky top-0 z-30 app-glass backdrop-blur-md border-b border-line">
          <div className="flex items-center gap-3 px-4 md:px-8 h-16">
            <button className="icon-btn lg:hidden" onClick={() => setMobileOpen(true)} aria-label="القائمة">
              <Menu size={17} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-amiri text-xl md:text-2xl font-bold leading-9 break-words">{title}</h1>
              {subtitle && <p className="text-xs text-muted truncate -mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              <button className="icon-btn" onClick={toggleTheme} title={light ? 'الوضع الليلي' : 'الوضع النهاري'}>
                {light ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <div className="hidden sm:flex items-center gap-2.5 pl-1">
                <div className="w-9 h-9 rounded-full bg-bronze/15 border border-bronze/30 text-bronze flex items-center justify-center font-bold text-sm">
                  {user?.name?.charAt(0) || '؟'}
                </div>
                <div className="leading-5 hidden md:block">
                  <div className="text-[13px] font-semibold max-w-[140px] truncate">{user?.name}</div>
                  <div className="text-[10px] text-muted">{roleLabel(user?.role)}</div>
                </div>
              </div>
              <button className="icon-btn text-danger hover:!border-danger/40" onClick={logout} title="تسجيل الخروج">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 md:px-8 py-6 pb-28 lg:pb-10 max-w-[1400px] mx-auto w-full">{children}</main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 card-glass backdrop-blur-md border-t border-line px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {nav.slice(0, 4).map((item) => {
            const a = active === item.key
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={cx(
                  'flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition-all active:scale-95',
                  a ? 'text-accent' : 'text-muted',
                )}
              >
                <item.icon size={19} strokeWidth={a ? 2.2 : 1.8} />
                <span className="truncate max-w-full">{item.label.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export const roleLabel = (role) =>
  ({ admin: 'مدير المدرسة', teacher: 'معلم القرآن', student: 'طالب', parent: 'ولي أمر' }[role] || role)
