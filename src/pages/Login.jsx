import React, { useState } from 'react'
import { Landmark, LogIn, ShieldCheck, GraduationCap, User, Users, Eye, EyeOff, BookOpen } from 'lucide-react'
import { useAuth } from '../lib/storage'
import { cx } from '../lib/helpers'

const QUICK = [
  { role: 'admin', label: 'مدير المدرسة', icon: ShieldCheck, tone: 'text-accent border-accent/30 bg-accent/10' },
  { role: 'teacher', label: 'معلم القرآن', icon: GraduationCap, tone: 'text-teal2 border-teal2/30 bg-teal2/10' },
  { role: 'student', label: 'طالب', icon: User, tone: 'text-bronze border-bronze/30 bg-bronze/10' },
  { role: 'parent', label: 'ولي أمر', icon: Users, tone: 'text-muted border-line bg-card2' },
]

function GeoPattern() {
  const cells = []
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 6; j++) {
      const on = (i * 7 + j * 13) % 5 === 0
      cells.push(
        <rect
          key={`${i}-${j}`}
          x={i * 60 + 8}
          y={j * 60 + 8}
          width="44"
          height="44"
          rx="6"
          fill={on ? 'rgba(16,185,129,0.14)' : 'none'}
          stroke={on ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.05)'}
          strokeWidth="1"
        />,
      )
    }
  }
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 480 360" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {cells}
    </svg>
  )
}

export default function Login() {
  const { login, quickLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    setBusy(true)
    const res = login(email, password)
    if (!res.ok) {
      setError(res.error)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-app">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0B1014] border-l border-line p-12">
        <GeoPattern />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1014] via-transparent to-[#0B1014]/60" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-teal2 flex items-center justify-center text-[#04110c] shadow-[0_8px_30px_rgba(16,185,129,0.4)]">
            <Landmark size={24} strokeWidth={1.9} />
          </div>
          <div>
            <div className="font-amiri text-4xl font-bold text-ink leading-10">كند</div>
            <div className="text-xs text-muted">نظام إدارة المدرسة القرآنية</div>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <BookOpen size={22} className="text-bronze mb-4" strokeWidth={1.6} />
          <p className="font-amiri text-3xl leading-[1.9] text-ink">
            «إِنَّ مَعَ الْعُسْرِ يُسْرًا» — سورة الشرح
          </p>
          <p className="text-sm text-muted mt-4 leading-7">
            منصة هادئة لإدارة الحلقات، ومتابعة الحفظ، وتسجيل الحضور، وتكريم المتفوقين —
            لكل دورٍ صلاحياتُه.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          {['حفظ', 'حضور', 'تقارير', 'تكريم'].map((t) => (
            <span key={t} className="chip !text-bronze !border-bronze/25 !bg-bronze/10">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-app">
        <div className="w-full max-w-md animate-fadeUp">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-teal2 flex items-center justify-center text-[#04110c]">
              <Landmark size={22} strokeWidth={1.9} />
            </div>
            <div className="font-amiri text-3xl font-bold">كند</div>
          </div>

          <h1 className="font-amiri text-3xl font-bold mb-1">أهلاً بك في مدرسة كند</h1>
          <p className="text-sm text-muted mb-8">سجّل الدخول لمتابعة مسيرة أبنائك في حفظ كتاب الله</p>

          <form onSubmit={submit} className="card p-6 flex flex-col gap-4">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <input
                className="input"
                type="email"
                dir="ltr"
                placeholder="name@kand.school"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <input
                  className="input pl-11"
                  type={showPw ? 'text' : 'password'}
                  dir="ltr"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                  aria-label="إظهار كلمة المرور"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-xl px-4 py-2.5">{error}</p>
            )}
            <button className="btn-primary w-full" disabled={busy}>
              <LogIn size={17} /> {busy ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
            </button>
            <p className="text-[11px] text-muted text-center">للحسابات التجريبية كلمة المرور: 123456</p>
          </form>

          <div className="mt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px bg-line flex-1" />
              <span className="text-xs text-muted">أو جرّب الدخول السريع حسب الدور</span>
              <div className="h-px bg-line flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK.map((q) => (
                <button
                  key={q.role}
                  onClick={() => quickLogin(q.role)}
                  className={cx(
                    'flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-soft active:scale-95 bg-card',
                    q.tone,
                  )}
                >
                  <q.icon size={17} strokeWidth={1.9} />
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
