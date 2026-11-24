import React, { useState } from 'react'
import { Landmark, LogIn, Eye, EyeOff, BookOpen, School, UserPlus, Upload, X } from 'lucide-react'
import { useAuth } from '../lib/storage'
import { cx } from '../lib/helpers'
import { compressImage } from '../lib/photo'
import { Modal, Field } from '../components/ui'

function GeoPattern() {
  const cells = []
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 6; j++) {
      const on = (i * 7 + j * 13) % 5 === 0
      cells.push(
        <rect key={`${i}-${j}`} x={i * 60 + 8} y={j * 60 + 8} width="44" height="44" rx="6"
          fill={on ? 'rgba(16,185,129,0.14)' : 'none'}
          stroke={on ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.05)'} strokeWidth="1" />,
      )
    }
  }
  return <svg className="absolute inset-0 w-full h-full" viewBox="0 0 480 360" preserveAspectRatio="xMidYMid slice" aria-hidden>{cells}</svg>
}

export default function Login() {
  const { login, registerSchool, registerStudent } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState(null) // 'school' | 'student'

  const submit = (e) => {
    e.preventDefault()
    setBusy(true)
    const res = login(identifier, password)
    if (!res.ok) {
      setError(res.error)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-app">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0B1014] border-l border-line p-12">
        <GeoPattern />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1014] via-transparent to-[#0B1014]/60" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-teal2 flex items-center justify-center text-[#04110c] shadow-[0_8px_30px_rgba(16,185,129,0.4)]">
            <Landmark size={24} strokeWidth={1.9} />
          </div>
          <div>
            <div className="font-amiri text-4xl font-bold text-ink leading-10">قَنَد</div>
            <div className="text-xs text-muted">نظام إدارة المدارس القرآنية</div>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <BookOpen size={22} className="text-bronze mb-4" strokeWidth={1.6} />
          <p className="font-amiri text-3xl leading-[1.9] text-ink">«إِنَّ مَعَ الْعُسْرِ يُسْرًا» — سورة الشرح</p>
          <p className="text-sm text-muted mt-4 leading-7">
            منصة هادئة Offline-First لإدارة المدارس القرآنية: حلقات، حضور بالـ QR، تسميع، تقارير، وتكريم —
            لكل مدرسة بياناتها المعزولة برمز مدرسة فريد.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          {['حفظ', 'حضور', 'تقارير', 'تكريم'].map((t) => (
            <span key={t} className="chip !text-bronze !border-bronze/25 !bg-bronze/10">{t}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12 bg-app">
        <div className="w-full max-w-md animate-fadeUp">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-teal2 flex items-center justify-center text-[#04110c]">
              <Landmark size={22} strokeWidth={1.9} />
            </div>
            <div className="font-amiri text-3xl font-bold">قَنَد</div>
          </div>

          <h1 className="font-amiri text-3xl font-bold mb-1">تسجيل الدخول</h1>
          <p className="text-sm text-muted mb-8">أدخل البريد الإلكتروني أو رقم الهاتف مع كلمة المرور — وسيتم اكتشاف مدرستك ودورك تلقائياً</p>

          <form onSubmit={submit} className="card p-6 flex flex-col gap-4">
            <Field label="البريد الإلكتروني أو رقم الهاتف" required>
              <input className="input" dir="ltr" placeholder="name@school.com أو 05xxxxxxxx" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            </Field>
            <Field label="كلمة المرور" required>
              <div className="relative">
                <input className="input pl-11" type={showPw ? 'text' : 'password'} dir="ltr" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors" aria-label="إظهار كلمة المرور">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            {error && <p className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-xl px-4 py-2.5">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              <LogIn size={17} /> {busy ? 'جارٍ التحقق...' : 'دخول'}
            </button>
          </form>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <button onClick={() => setMode('school')} className="btn-ghost !py-3.5">
              <School size={16} /> تسجيل مدرسة قرآنية جديدة
            </button>
            <button onClick={() => setMode('student')} className="btn-ghost !py-3.5">
              <UserPlus size={16} /> إنشاء حساب طالب جديد
            </button>
          </div>
        </div>
      </div>

      {mode === 'school' && <RegisterSchoolModal onClose={() => setMode(null)} registerSchool={registerSchool} />}
      {mode === 'student' && <RegisterStudentModal onClose={() => setMode(null)} registerStudent={registerStudent} />}
    </div>
  )
}

function RegisterSchoolModal({ onClose, registerSchool }) {
  const [form, setForm] = useState({ schoolName: '', adminName: '', identifier: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.schoolName || !form.adminName || !form.identifier || !form.password) {
      setError('املأ جميع الحقول المطلوبة')
      return
    }
    const res = registerSchool(form)
    if (!res.ok) setError(res.error)
    else setDone(res.school)
  }

  return (
    <Modal open onClose={onClose} title="تسجيل مدرسة قرآنية جديدة" subtitle="ستُنشأ مدرسة مستقلة برمز خاص (School Code) يربط به المعلمون والطلاب" icon={School} wide>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/25 text-accent flex items-center justify-center">
            <School size={26} />
          </div>
          <h3 className="font-amiri text-2xl font-bold">تم إنشاء مدرسة «{done.name}» بنجاح</h3>
          <p className="text-sm text-muted">رمز المدرسة (أرسله لمعلميك وطلابك ليربطوا حساباتهم):</p>
          <div className="text-3xl font-bold tracking-[0.3em] text-bronze bg-bronze/10 border border-bronze/30 rounded-2xl px-6 py-3 tabular-nums" dir="ltr">{done.code}</div>
          <p className="text-xs text-muted">أنت الآن مدير المدرسة — تم تسجيل دخولك تلقائياً</p>
          <button className="btn-primary mt-2" onClick={onClose}>ابدأ لوحة التحكم</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <Field label="اسم المدرسة" required><input className="input" value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} placeholder="مدرسة قَنَد للقرآن الكريم" /></Field>
          <Field label="اسم مدير المدرسة" required><input className="input" value={form.adminName} onChange={(e) => set('adminName', e.target.value)} placeholder="الاسم الكامل" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="البريد الإلكتروني" required><input className="input" dir="ltr" value={form.identifier} onChange={(e) => set('identifier', e.target.value)} placeholder="admin@school.com" /></Field>
            <Field label="رقم الهاتف"><input className="input" dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="05xxxxxxxx" /></Field>
          </div>
          <Field label="كلمة المرور" required><input className="input" dir="ltr" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••" /></Field>
          {error && <p className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-xl px-4 py-2.5">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
            <button className="btn-primary" onClick={submit}>إنشاء المدرسة</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function RegisterStudentModal({ onClose, registerStudent }) {
  const [form, setForm] = useState({ code: '', name: '', birthDate: '', parentName: '', parentPhone: '', password: '', photo: '' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const onPhoto = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      set('photo', await compressImage(f))
    } catch (err) {
      setError(err.message)
    }
  }

  const submit = () => {
    if (!form.code || !form.name || !form.parentPhone || !form.password) {
      setError('املأ رمز المدرسة، اسم الطالب، هاتف الولي، وكلمة المرور')
      return
    }
    const res = registerStudent(form)
    if (!res.ok) setError(res.error)
    else setOk(res.school)
  }

  return (
    <Modal open onClose={onClose} title="إنشاء حساب طالب جديد" subtitle="أدخل رمز المدرسة الذي يعطيه لك مدير المدرسة" icon={UserPlus} wide>
      {ok ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/25 text-accent flex items-center justify-center"><UserPlus size={26} /></div>
          <h3 className="font-amiri text-2xl font-bold">تم إنشاء حسابك في مدرسة «{ok.name}»</h3>
          <p className="text-sm text-muted">سجّل دخولك الآن برقم هاتف ولي الأمر + كلمة المرور التي اخترتها</p>
          <button className="btn-primary mt-2" onClick={onClose}>الذهاب لتسجيل الدخول</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <Field label="رمز المدرسة (School Code)" required>
            <input className="input text-center tracking-[0.3em] tabular-nums" dir="ltr" placeholder="XXXXXX" value={form.code} onChange={(e) => set('code', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم الطالب" required><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="الاسم الكامل" /></Field>
            <Field label="تاريخ الميلاد"><input className="input" type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم ولي الأمر"><input className="input" value={form.parentName} onChange={(e) => set('parentName', e.target.value)} placeholder="الاسم الكامل" /></Field>
            <Field label="رقم هاتف/واتساب الولي" required><input className="input" dir="ltr" value={form.parentPhone} onChange={(e) => set('parentPhone', e.target.value)} placeholder="05xxxxxxxx" /></Field>
          </div>
          <Field label="كلمة المرور" required><input className="input" dir="ltr" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••" /></Field>
          <Field label="الصورة الشخصية (اختياري — تُضغط تلقائياً)">
            <div className="flex items-center gap-3">
              <label className="btn-ghost !py-2 !text-xs cursor-pointer">
                <Upload size={14} /> رفع صورة
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </label>
              {form.photo && (
                <>
                  <img src={form.photo} alt="معاينة" className="w-12 h-12 rounded-xl object-cover border border-line" />
                  <button className="icon-btn !w-8 !h-8" onClick={() => set('photo', '')} title="حذف الصورة"><X size={14} /></button>
                </>
              )}
            </div>
          </Field>
          {error && <p className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-xl px-4 py-2.5">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
            <button className="btn-primary" onClick={submit}>إنشاء الحساب</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
