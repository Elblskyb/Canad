const digits = (phone) => String(phone || '').replace(/[^\d+]/g, '')

export function buildMessage({ studentName, circleName, type, detail }) {
  const lines = [
    'السلام عليكم ورحمة الله،',
    `الطالب/ة: ${studentName}`,
    circleName ? `الحلقة: ${circleName}` : null,
    type === 'absent' ? 'تم تسجيل غياب في آخر حصة.' : type === 'call' ? 'تم استدعاء ولي الأمر من المعلم.' : `ملاحظة: ${detail || ''}`,
    detail && type !== 'absent' ? detail : null,
    'مدرسة قَنَد للقرآن الكريم',
  ]
  return lines.filter(Boolean).join('\n')
}

export function openWhatsApp(phone, message) {
  const url = `https://wa.me/${digits(phone)}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener')
}

export function openSms(phone, message) {
  const url = `sms:${digits(phone)}?body=${encodeURIComponent(message)}`
  window.location.href = url
}
