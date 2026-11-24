import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff, Keyboard, Zap, Download, Printer, ScanLine, User } from 'lucide-react'
import { Modal, Card } from './ui'
import { cx, downloadBlob, playBeep } from '../lib/helpers'

/* ---------- Student ID card with QR ---------- */
export function StudentQRCard({ student, schoolName, compact = false }) {
  const ref = useRef(null)

  const exportPNG = () => {
    const svg = ref.current?.querySelector('svg')
    if (!svg) return
    const clone = svg.cloneNode(true)
    clone.setAttribute('width', '480')
    clone.setAttribute('height', '480')
    const xml = new XMLSerializer().serializeToString(clone)
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1240
      canvas.height = 860
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#121920'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = 'rgba(200,155,84,0.6)'
      ctx.lineWidth = 3
      ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36)
      ctx.strokeStyle = 'rgba(16,185,129,0.35)'
      ctx.lineWidth = 1
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60)
      ctx.fillStyle = '#C89B54'
      ctx.font = 'bold 44px Amiri, serif'
      ctx.textAlign = 'right'
      ctx.fillText(schoolName || ('مدرسة ' + 'ك' + 'ند'), canvas.width - 60, 100)
      ctx.fillStyle = '#10B981'
      ctx.font = 'bold 40px Amiri, serif'
      ctx.fillText('بطاقة طالب — QR', canvas.width - 60, 160)
      ctx.drawImage(img, 380, 210, 480, 480)
      ctx.fillStyle = '#e8edf1'
      ctx.font = 'bold 52px Amiri, serif'
      ctx.fillText(student.name, 60, 300)
      ctx.fillStyle = '#8b98a5'
      ctx.font = '28px "IBM Plex Sans Arabic", sans-serif'
      ctx.fillText('رقم البطاقة: ' + student.qrCode, 60, 350)
      ctx.fillText('الحلقة: ' + (student.circleName || '—'), 60, 395)
      ctx.fillStyle = '#C89B54'
      ctx.font = '24px "IBM Plex Sans Arabic", sans-serif'
      ctx.fillText('امسح البطاقة عند دخول الحصة', 60, 640)
      canvas.toBlob((b) => b && downloadBlob(b, `بطاقة-${student.name}.png`), 'image/png')
    }
    img.src = url
  }

  const printCard = () => {
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    const svg = ref.current?.querySelector('svg')?.outerHTML || ''
    w.document.write(
      '<html dir="rtl"><head><title>بطاقة طالب</title>' +
        '<style>body{font-family:"IBM Plex Sans Arabic",sans-serif;background:#fff;color:#17222b;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.card{border:3px solid #C89B54;padding:40px;text-align:center;border-radius:16px}.t{font-family:Amiri,serif;font-size:34px;color:#0D9488;margin:0 0 6px}.n{font-family:Amiri,serif;font-size:44px;margin:10px 0}.c{font-size:18px;color:#5b6b78}svg{margin:10px auto}</style>' +
        '</head><body><div class="card"><p class="t">' +
        (schoolName || '') +
        '</p><h1 class="n">' +
        student.name +
        '</h1><div>' +
        svg +
        '</div><p class="c">رقم البطاقة: ' +
        student.qrCode +
        '</p></div></body></html>',
    )
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  return (
    <Card className={cx('relative overflow-hidden', compact && '!p-4')}>
      <div className="absolute top-0 left-0 w-40 h-40 bg-accent/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="flex flex-col items-center text-center gap-3">
        <div ref={ref} className="bg-white p-3 rounded-2xl shadow-soft">
          <QRCode value={student.qrCode} size={compact ? 140 : 180} fgColor="#0B1014" />
        </div>
        <div>
          <div className="font-amiri text-2xl font-bold">{student.name}</div>
          <div className="text-xs text-muted mt-1 tabular-nums tracking-wide" dir="ltr">
            {student.qrCode}
          </div>
        </div>
        {!compact && (
          <div className="flex gap-2 w-full">
            <button className="btn-ghost flex-1 !py-2 !text-xs" onClick={exportPNG}>
              <Download size={14} /> تحميل كصورة
            </button>
            <button className="btn-ghost flex-1 !py-2 !text-xs" onClick={printCard}>
              <Printer size={14} /> طباعة
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

/* ---------- QR scanner modal ---------- */
export function QRScannerModal({ open, onClose, students, onScan, circleFilter }) {
  const [mode, setMode] = useState('camera')
  const [manual, setManual] = useState('')
  const [error, setError] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [retry, setRetry] = useState(0)
  const scannerRef = useRef(null)
  const boxRef = useRef(null)
  const handledRef = useRef(new Set())

  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch (e) { /* ignore */ }
    setCameraOn(false)
  }

  useEffect(() => {
    if (!open) {
      stopCamera()
      setManual('')
      setError('')
      setMode('camera')
      return
    }
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || mode !== 'camera' || cameraOn) return
    let cancelled = false
    const start = async () => {
      try {
        // طلب إذن الكاميرا صراحةً أولاً (مطلوب في Android WebView)
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          stream.getTracks().forEach((t) => t.stop())
        }
        const el = boxRef.current
        if (!el) return
        const scanner = new Html5Qrcode(el.id)
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (cancelled || handledRef.current.has(decoded)) return
            handledRef.current.add(decoded)
            handleCode(decoded)
            setTimeout(() => handledRef.current.delete(decoded), 3000)
          },
          () => {},
        )
        if (!cancelled) setCameraOn(true)
      } catch (e) {
        if (!cancelled) {
          const denied = e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError' || /permission/i.test(String(e.message || e)))
          setError(
            denied
              ? 'تم رفض إذن الكاميرا — فعّله من إعدادات التطبيق/المتصف ثم أعد المحاولة، أو استخدم الإدخال اليدوي أو المسح السريع.'
              : 'تعذّر الوصول إلى الكاميرا — استخدم الإدخال اليدوي أو المسح السريع أدناه',
          )
          if (!denied) setMode('manual')
        }
      }
    }
    start()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, cameraOn, retry])

  const handleCode = (code) => {
    const student = students.find((s) => s.qrCode === code.trim())
    if (!student) {
      playBeep(false)
      setError(`الكود "${code}" غير معروف — تأكد من أنك تستخدم بطاقة طالب صالحة`)
      return
    }
    playBeep(true)
    onScan(student)
    setError('')
  }

  const visibleStudents = circleFilter ? students.filter((s) => s.circleId === circleFilter) : students

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="مسح بطاقة الطالب (QR)"
      subtitle="وجّه الكاميرا نحو بطاقة الطالب لتسجيل الحضور فوراً"
      icon={ScanLine}
      wide
    >
      <div className="flex gap-2 mb-4">
        {[
          { k: 'camera', label: 'الكاميرا', icon: Camera },
          { k: 'manual', label: 'إدخال الكود', icon: Keyboard },
          { k: 'quick', label: 'مسح سريع تجريبي', icon: Zap },
        ].map((m) => (
          <button
            key={m.k}
            onClick={async () => {
              if (m.k !== 'camera') await stopCamera()
              setMode(m.k)
              setError('')
            }}
            className={cx('btn-ghost !py-2 !text-xs flex-1', mode === m.k && '!border-accent/50 !text-accent')}
          >
            <m.icon size={14} /> {m.label}
          </button>
        ))}
      </div>

      {mode === 'camera' && (
        <div className="flex flex-col items-center gap-3">
          <div
            id="qr-reader-box"
            ref={boxRef}
            className={cx('w-full max-w-sm rounded-2xl overflow-hidden border-2 border-accent/50 animate-scanPulse bg-black [&>video]:w-full [&>video]:object-cover', !cameraOn && 'hidden')}
          />
          {!cameraOn && !error && <p className="text-sm text-muted py-8">جارٍ تشغيل الكاميرا...</p>}
          {error && (
            <div className="w-full flex flex-col gap-2">
              <p className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-xl px-4 py-3">{error}</p>
              <button className="btn-ghost !py-2 !text-xs" onClick={() => { setError(''); setRetry((r) => r + 1) }}>
                إعادة محاولة طلب إذن الكاميرا
              </button>
            </div>
          )}
          <button className="btn-ghost !py-2 !text-xs" onClick={stopCamera}>
            <CameraOff size={14} /> إيقاف الكاميرا
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="flex flex-col gap-3">
          <input
            className="input text-center tracking-widest"
            dir="ltr"
            placeholder="KAND-STU-000"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && manual.trim() && handleCode(manual)}
          />
          {error && <p className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-xl px-4 py-3">{error}</p>}
          <button className="btn-primary" onClick={() => manual.trim() && handleCode(manual)} disabled={!manual.trim()}>
            تسجيل الحضور بالكود
          </button>
        </div>
      )}

      {mode === 'quick' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
          {visibleStudents.map((s) => (
            <button
              key={s.id}
              onClick={() => handleCode(s.qrCode)}
              className="flex items-center gap-2 rounded-xl border border-line bg-card2 px-3 py-2.5 text-sm font-semibold hover:border-accent/50 hover:text-accent transition-all active:scale-95 text-right"
            >
              <User size={15} className="text-muted shrink-0" />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
          {!visibleStudents.length && <p className="text-sm text-muted col-span-full text-center py-6">لا يوجد طلاب في هذه الحلقة</p>}
        </div>
      )}
    </Modal>
  )
}
