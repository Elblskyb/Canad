import React, { useMemo, useState } from 'react'
import { GraduationCap, Plus, Trash2, Trophy } from 'lucide-react'
import { useStore, useAuth } from '../lib/storage'
import { useToast } from '../components/ui'
import { Card, CardTitle, Modal, Badge, Empty, Field } from '../components/ui'
import { uid, todayStr, fmtDate, gradeOf, cx } from '../lib/helpers'

const TYPES = [
  { k: 'juz', label: 'اختبار جزء' },
  { k: 'surah', label: 'اختبار سورة' },
  { k: 'monthly', label: 'اختبار شهري' },
]

export default function Exams() {
  const { db, update } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editExam, setEditExam] = useState(null)

  const myCircles = user.role === 'admin' ? db.circles : db.circles.filter((c) => c.teacherId === user.id)
  const exams = db.exams
    .filter((e) => user.role === 'admin' || myCircles.some((c) => c.id === e.circleId))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const saveResults = (examId, results) => {
    update((d) => {
      const e = d.exams.find((x) => x.id === examId)
      if (!e) return
      e.results = results.map((r) => {
        const total = Math.round((Number(r.memorization) + Number(r.tajweed) + Number(r.voice)) / 3)
        return { ...r, total, grade: gradeOf(total).label }
      })
    })
    toast('تم حفظ النتائج وحساب المعدلات والتقديرات تلقائياً')
  }

  const removeExam = (exam) => {
    update((d) => {
      d.exams = d.exams.filter((x) => x.id !== exam.id)
      d.archive.push({ kind: 'exam', id: uid(), deletedAt: new Date().toISOString(), record: exam })
    })
    toast('تم أرشفة الاختبار')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> إعداد اختبار جديد
        </button>
      </div>

      {exams.length === 0 ? (
        <Card>
          <Empty icon={GraduationCap} title="لا توجد اختبارات بعد" hint="أنشئ أول اختبار لتسجيل نتائج الطلاب" />
        </Card>
      ) : (
        <div className="grid gap-4">
          {exams.map((e) => {
            const circle = db.circles.find((c) => c.id === e.circleId)
            const top = e.results.length ? [...e.results].sort((a, b) => b.total - a.total)[0] : null
            return (
              <Card key={e.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-bronze/10 border border-bronze/25 text-bronze flex items-center justify-center shrink-0">
                    <GraduationCap size={19} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-bold">{e.title}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {TYPES.find((t) => t.k === e.type)?.label} — {circle?.name} — {fmtDate(e.date)} — {e.results.length} نتيجة
                    </div>
                  </div>
                  {top && (
                    <Badge tone="bronze">
                      <Trophy size={12} /> الأعلى: {db.students.find((s) => s.id === top.studentId)?.name} ({top.total}/100)
                    </Badge>
                  )}
                  <button className="btn-ghost !py-2 !text-xs" onClick={() => setEditExam(e)}>
                    تسجيل / تعديل النتائج
                  </button>
                  <button className="icon-btn hover:!text-danger hover:!border-danger/40" onClick={() => removeExam(e)} title="أرشفة الاختبار">
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {createOpen && (
        <CreateExamModal
          circles={myCircles}
          onClose={() => setCreateOpen(false)}
          onCreate={(form) => {
            update((d) => {
              d.exams.push({
                id: 'exm-' + uid().slice(3, 9),
                title: form.title,
                type: form.type,
                circleId: form.circleId,
                date: form.date,
                createdBy: user.id,
                results: [],
              })
            })
            setCreateOpen(false)
            toast('تم إنشاء الاختبار — سجّل النتائج من نفس البطاقة')
          }}
        />
      )}

      {editExam && (
        <Modal open onClose={() => setEditExam(null)} title={`تسجيل نتائج — ${editExam.title}`} icon={GraduationCap} wide>
          <ExamResultsEditor
            exam={editExam}
            students={db.students.filter((s) => s.circleId === editExam.circleId)}
            onSave={(results) => { saveResults(editExam.id, results); setEditExam(null) }}
            onClose={() => setEditExam(null)}
          />
        </Modal>
      )}
    </div>
  )
}

function CreateExamModal({ circles, onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', type: 'monthly', circleId: circles[0]?.id || '', date: todayStr() })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <Modal
      open
      onClose={onClose}
      title="إعداد اختبار جديد"
      icon={GraduationCap}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" disabled={!form.title || !form.circleId} onClick={() => onCreate(form)}>
            إنشاء الاختبار
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="عنوان الاختبار" required>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="مثال: اختبار الجزء الثلاثين" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نوع الاختبار">
            <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.k} value={t.k}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="الحلقة" required>
            <select className="input" value={form.circleId} onChange={(e) => set('circleId', e.target.value)}>
              {circles.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="تاريخ الاختبار">
          <input className="input" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

function ExamResultsEditor({ exam, students, onSave, onClose }) {
  const [rows, setRows] = useState(() =>
    students.map((s) => {
      const existing = exam.results.find((r) => r.studentId === s.id) || {}
      return {
        studentId: s.id,
        memorization: existing.memorization ?? 80,
        tajweed: existing.tajweed ?? 80,
        voice: existing.voice ?? 80,
      }
    }),
  )
  const setRow = (sid, k, v) => setRows((rs) => rs.map((r) => (r.studentId === sid ? { ...r, [k]: v } : r)))

  return (
    <div className="flex flex-col gap-3">
      {students.length === 0 && <Empty title="لا يوجد طلاب في هذه الحلقة" />}
      {rows.map((r) => {
        const s = students.find((x) => x.id === r.studentId)
        const total = Math.round((Number(r.memorization) + Number(r.tajweed) + Number(r.voice)) / 3)
        const g = gradeOf(total)
        return (
          <div key={r.studentId} className="rounded-xl border border-line bg-card2 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">{s?.name}</span>
              <span className={cx('text-sm font-bold tabular-nums', g.color)}>
                {total}/100 — {g.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['memorization', 'الحفظ'],
                ['tajweed', 'التجويد'],
                ['voice', 'الأداء الصوتي'],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="text-[10px] text-muted block mb-1">{label} (0-100)</label>
                  <input
                    className="input !py-1.5 !text-xs tabular-nums"
                    type="number"
                    min="0"
                    max="100"
                    value={r[k]}
                    onChange={(e) => setRow(r.studentId, k, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}
      <div className="flex justify-end gap-2 pt-1">
        <button className="btn-ghost" onClick={onClose}>إغلاق</button>
        <button className="btn-primary" onClick={() => onSave(rows)} disabled={!rows.length}>
          حفظ النتائج وحساب المعدل
        </button>
      </div>
    </div>
  )
}
