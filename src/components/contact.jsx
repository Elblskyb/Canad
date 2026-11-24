import React from 'react'
import { MessageCircle, MessageSquareText } from 'lucide-react'
import { Modal } from './ui'
import { buildMessage, openWhatsApp, openSms } from '../lib/contact'

export function ContactParentModal({ open, onClose, student, circleName, parentPhone, parentName, type = 'absent', detail = '' }) {
  if (!open || !student) return null
  const msg = buildMessage({ studentName: student.name, circleName, type, detail })
  return (
    <Modal open={open} onClose={onClose} title={`مراسلة ولي أمر ${student.name}`} subtitle={parentName ? `${parentName} — ${parentPhone || 'بدون رقم'}` : '—'} icon={MessageCircle}>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-line bg-card2 px-4 py-3 text-sm leading-7 whitespace-pre-wrap">{msg}</div>
        <button
          className="btn-primary w-full"
          disabled={!parentPhone}
          onClick={() => { openWhatsApp(parentPhone, msg); onClose() }}
        >
          <MessageCircle size={16} /> إرسال عبر واتساب
        </button>
        <button
          className="btn-ghost w-full"
          disabled={!parentPhone}
          onClick={() => { openSms(parentPhone, msg); onClose() }}
        >
          <MessageSquareText size={16} /> إرسال رسالة نصية
        </button>
        {!parentPhone && <p className="text-xs text-danger text-center">لا يوجد رقم هاتف مسجل لولي الأمر</p>}
      </div>
    </Modal>
  )
}
