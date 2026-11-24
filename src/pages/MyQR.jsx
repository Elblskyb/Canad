import React from 'react'
import { QrCode } from 'lucide-react'
import { useStore, useAuth } from '../lib/storage'
import { Card, CardTitle, Empty } from '../components/ui'
import { StudentQRCard } from '../components/qr'
import { circleById } from '../lib/analytics'

export default function MyQR() {
  const { db } = useStore()
  const { user } = useAuth()
  const student = db.students.find((s) => s.id === user.studentId || s.userId === user.id)
  if (!student) {
    return (
      <Card>
        <Empty icon={QrCode} title="لم يتم ربط حسابك ببطاقة طالب" hint="تواصل مع مدير المدرسة" />
      </Card>
    )
  }
  const circle = circleById(db, student.circleId)
  return (
    <div className="max-w-md mx-auto flex flex-col gap-4">
      <Card>
        <CardTitle icon={QrCode} title="بطاقتي الرقمية" subtitle="اعرضها للمعلم عند دخول الحصة — تُقرأ بالـ QR لتسجيل حضورك فوراً" />
        <div className="text-sm leading-7 text-muted">
          <p>الاسم: <span className="font-bold text-ink">{student.name}</span></p>
          <p>الحلقة: <span className="font-semibold text-ink">{circle?.name || '—'}</span></p>
          <p>رقم البطاقة: <span className="tabular-nums font-bold" dir="ltr">{student.qrCode}</span></p>
        </div>
      </Card>
      <StudentQRCard student={{ ...student, circleName: circle?.name }} schoolName={db.settings.schoolName} />
    </div>
  )
}
