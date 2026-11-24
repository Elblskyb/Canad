import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Award, Download, Printer, Trophy, ShieldCheck, TrendingUp, BookOpen, CalendarCheck, History, User } from 'lucide-react'
import { useStore, useAuth } from '../lib/storage'
import { useToast } from '../components/ui'
import { Card, CardTitle, Badge, Empty, Field, Modal } from '../components/ui'
import { CERT_CATEGORIES, drawCertificate, certificateToPDF } from '../lib/cert'
import { computeAwardCandidates, circleById } from '../lib/analytics'
import { uid, todayStr, monthKey, monthLabel, fmtDate, fmtDateTime, downloadBlob } from '../lib/helpers'

const CAT_ICONS = { mostMemorized: BookOpen, mostDiligent: CalendarCheck, mostImproved: TrendingUp, mostCarefulParent: ShieldCheck }

export default function Certificates() {
  const { db, update } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const isStudent = user.role === 'student'
  const student = isStudent ? db.students.find((s) => s.id === user.studentId) : null

  const months = useMemo(() => {
    const out = []
    const d = new Date()
    for (let i = 0; i < 3; i++) {
      out.push(monthKey(d.toISOString().slice(0, 10)))
      d.setMonth(d.getMonth() - 1)
    }
    return out
  }, [])
  const [month, setMonth] = useState(months[0])
  const candidates = useMemo(
    () => computeAwardCandidates(db, { from: month + '-01', to: month + '-31' }),
    [db, month],
  )

  const issued = isStudent
    ? db.certificates.filter((c) => c.recipientId === student?.id)
    : db.certificates

  if (isStudent) {
    return (
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {issued.length === 0 && <div className="col-span-full"><Card><Empty icon={Award} title="لا توجد شهادات تكريمية بعد" hint="استمر في الحفظ والمداومة" /></Card></div>}
        {issued.map((c) => (
          <IssuedCard key={c.id} cert={c} db={db} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="input !py-2 w-48" value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <p className="text-xs text-muted"> يتم احتساب المرشحين آلياً عن الفترة المحددة — يمكن تغيير الاسم يدوياً قبل الإصدار</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {CERT_CATEGORIES.map((cat) => (
          <CategoryCard key={cat.key} cat={cat} auto={candidates[cat.key]} db={db} />
        ))}
      </div>

      <Card>
        <CardTitle icon={History} title="الشهادات الصادرة سابقاً" subtitle={`${issued.length} شهادة`} />
        {issued.length === 0 ? (
          <Empty icon={Award} title="لم تصدر أي شهادة بعد" hint="اختر مكرماً وأصدر أول شهادة" />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {issued.slice().reverse().map((c) => (
              <IssuedCard key={c.id} cert={c} db={db} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function CategoryCard({ cat, auto, db }) {
  const { update } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const Icon = CAT_ICONS[cat.key]
  const isParentCat = cat.key === 'mostCarefulParent'
  const pool = isParentCat ? db.users.filter((u) => u.role === 'parent') : db.students
  const [pickedId, setPickedId] = useState(auto?.id || '')
  const [preview, setPreview] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => setPickedId(auto?.id || ''), [auto?.id])

  const picked = pool.find((p) => p.id === pickedId) || null
  const pickedName = picked ? picked.name : '—'
  const detail = auto && auto.id === pickedId ? auto.detail : 'تكريم يدوي'

  const buildAndShow = () => {
    if (!picked) return
    const canvas = canvasRef.current
    drawCertificate(canvas, {
      schoolName: db.settings.schoolName,
      recipient: pickedName,
      categoryTitle: cat.title,
      reason: detail,
      date: todayStr(),
      signer: user.name,
      isParent: isParentCat,
    })
    setPreview({
      recipientId: picked.id,
      recipientName: pickedName,
      category: cat.key,
      title: cat.title,
      detail,
    })
  }

  useEffect(() => {
    if (preview) buildAndShow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.recipientId, preview?.title])

  const issue = () => {
    if (!preview) return
    update((d) => {
      d.certificates.push({
        id: uid(),
        ...preview,
        issuedAt: new Date().toISOString(),
        issuedBy: user.id,
        month: monthKey(todayStr()),
      })
    })
    toast(`تم إصدار شهادة «${cat.title}» إلى ${preview.recipientName}`)
    setPreview(null)
  }

  const downloadPNG = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    certificateToPNGHelper(canvas, `${cat.title}-${preview?.recipientName || ''}.png`)
  }

  const printPDF = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    certificateToPDF(canvas, `شهادة-${preview?.recipientName || ''}.pdf`)
    toast('تم تصدير الشهادة كملف جاهز للطباعة')
  }

  return (
    <Card className="flex flex-col">
      <CardTitle icon={Icon} title={cat.title} subtitle={cat.desc} />
      <div className="flex flex-col gap-3 flex-1">
        <div className="rounded-xl border border-bronze/25 bg-bronze/10 px-4 py-3">
          <div className="text-[11px] text-bronze mb-1">المرشح آلياً</div>
          <div className="font-bold text-sm">{auto ? auto.name : '—'}</div>
          {auto && <div className="text-xs text-muted mt-0.5">{auto.detail}</div>}
        </div>
        <Field label="اختيار الاسم يدوياً (اختياري)">
          <select className="input" value={pickedId} onChange={(e) => setPickedId(e.target.value)}>
            <option value="">— اختر من القائمة —</option>
            {pool.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <div className="flex gap-2 mt-auto">
          <button className="btn-ghost flex-1 !py-2 !text-xs" onClick={buildAndShow} disabled={!pickedId}>
            معاينة الشهادة
          </button>
          <button className="btn-bronze flex-1 !py-2 !text-xs" onClick={issue} disabled={!preview}>
            <Award size={13} /> إصدار الشهادة
          </button>
        </div>
        {preview && (
          <div className="flex flex-col gap-2 animate-fadeUp">
            <canvas ref={canvasRef} className="w-full rounded-xl border border-line" style={{ aspectRatio: '1684/1190' }} />
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 !py-2 !text-xs" onClick={downloadPNG}>
                <Download size={13} /> تحميل PNG
              </button>
              <button className="btn-ghost flex-1 !py-2 !text-xs" onClick={printPDF}>
                <Printer size={13} /> طباعة الشهادة
              </button>
            </div>
          </div>
        )}
        {!preview && <canvas ref={canvasRef} className="hidden" />}
      </div>
    </Card>
  )
}

function certificateToPNGHelper(canvas, filename) {
  canvas.toBlob((b) => b && downloadBlob(b, filename), 'image/png')
}

function IssuedCard({ cert, db }) {
  const canvasRef = useRef(null)
  const [show, setShow] = useState(false)
  const issuer = db.users.find((u) => u.id === cert.issuedBy)

  useEffect(() => {
    if (show && canvasRef.current) {
      drawCertificate(canvasRef.current, {
        schoolName: db.settings.schoolName,
        recipient: cert.recipientName,
        categoryTitle: cert.title,
        reason: cert.detail,
        date: cert.issuedAt?.slice(0, 10),
        signer: issuer?.name || '',
        isParent: cert.category === 'mostCarefulParent',
      })
    }
  }, [show, cert, db.settings.schoolName, issuer])

  return (
    <>
      <div className="card p-4 card-hover cursor-pointer" onClick={() => setShow(true)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bronze/10 border border-bronze/25 text-bronze flex items-center justify-center shrink-0">
            <Trophy size={18} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm truncate">{cert.recipientName}</div>
            <div className="text-xs text-bronze">{cert.title}</div>
            <div className="text-[10px] text-muted">{fmtDateTime(cert.issuedAt)}</div>
          </div>
          <Badge tone="bronze"><User size={11} /> عرض</Badge>
        </div>
      </div>
      <Modal open={show} onClose={() => setShow(false)} title={`شهادة — ${cert.title}`} icon={Award} wide>
        <canvas ref={canvasRef} className="w-full rounded-xl border border-line" style={{ aspectRatio: '1684/1190' }} />
        <div className="flex gap-2 mt-3">
          <button
            className="btn-ghost flex-1 !py-2 !text-xs"
            onClick={() => canvasRef.current && certificateToPNGHelper(canvasRef.current, `شهادة-${cert.recipientName}.png`)}
          >
            <Download size={13} /> تحميل كصورة
          </button>
          <button
            className="btn-primary flex-1 !py-2 !text-xs"
            onClick={() => {
              if (canvasRef.current) {
                certificateToPDF(canvasRef.current, `شهادة-${cert.recipientName}.pdf`)
              }
            }}
          >
            <Printer size={13} /> حفظ الملف
          </button>
        </div>
      </Modal>
    </>
  )
}
