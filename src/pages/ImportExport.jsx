import React, { useRef, useState } from 'react'
import { FileSpreadsheet, Download, Upload, FileDown, Users, BookOpen, CalendarCheck, GraduationCap, Table2 } from 'lucide-react'
import { useStore } from '../lib/storage'
import { useToast, Card, CardTitle, Empty } from '../components/ui'
import { exportAll, exportStudents, exportCircles, exportAttendance, exportRecitations, studentTemplate, importStudentsFromFile } from '../lib/excel'

export default function ImportExport() {
  const { db, update } = useStore()
  const toast = useToast()
  const fileRef = useRef(null)
  const [importing, setImporting] = useState(false)

  const onImport = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setImporting(true)
    try {
      const snapshot = structuredClone(db)
      const { added, newCircles } = await importStudentsFromFile(f, snapshot, () => {})
      if (!added.length) {
        toast('لم يتم العثور على طلاب صالحين في الملف', 'error')
      } else {
        update((d) => {
          d.students.push(...snapshot.students.filter((s) => !d.students.some((x) => x.id === s.id)))
          d.circles.push(...newCircles)
          d.users.push(...snapshot.users.filter((u) => !d.users.some((x) => x.id === u.id)))
        })
        toast(`تم استيراد ${added.length} طالب${newCircles.length ? ` وإنشاء ${newCircles.length} حلقة جديدة` : ''}`)
      }
    } catch (err) {
      toast('تعذر قراءة ملف جدول البيانات: ' + err.message, 'error')
    }
    setImporting(false)
    e.target.value = ''
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 xl:col-span-6">
        <CardTitle icon={FileSpreadsheet} title="تصدير شامل" subtitle="كل بيانات المدرسة في ملف جدول بيانات واحد متعدد الأوراق" />
        <div className="flex flex-col gap-2.5">
          <button className="btn-primary" onClick={() => { exportAll(db); toast('تم تصدير ملف جدول البيانات الشامل') }}>
            <Download size={16} /> تصدير شامل لكل البيانات (متعدد الأوراق)
          </button>
          <p className="text-xs text-muted leading-6">الأوراق: الطلاب، الحلقات، الحضور، الحفظ، الاختبارات</p>
        </div>
      </Card>

      <Card className="col-span-12 xl:col-span-6">
        <CardTitle icon={Upload} title="استيراد الطلاب من جدول بيانات" subtitle="يقرأ الملف ويضيف الطلاب، وينشئ الحلقات غير الموجودة تلقائياً" />
        <div className="flex flex-col gap-2.5">
          <button className="btn-ghost w-fit" onClick={() => { studentTemplate(); toast('تم تنزيل قالب جدول البيانات للطلاب') }}>
            <FileDown size={15} /> إنشاء قالب جدول البيانات للطلاب (فارغ)
          </button>
          <button className="btn-primary w-fit" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload size={15} /> {importing ? 'جارٍ الاستيراد...' : ' استيراد الطلاب من ملف جدول بيانات'}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} />
          <p className="text-xs text-muted leading-6">الأعمدة المطلوبة: الاسم، تاريخ الميلاد، اسم الحلقة، اسم ولي الأمر، هاتف ولي الأمر</p>
        </div>
      </Card>

      <Card className="col-span-12">
        <CardTitle icon={Table2} title="تصدير منفصل" subtitle="كل جدول في ملف مستقل" />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          <button className="btn-ghost justify-start" onClick={() => { exportStudents(db); toast('تم تصدير الطلاب') }}>
            <Users size={15} className="text-accent" /> الطلاب ({db.students.length})
          </button>
          <button className="btn-ghost justify-start" onClick={() => { exportCircles(db); toast('تم تصدير الحلقات') }}>
            <BookOpen size={15} className="text-teal2" /> الحلقات ({db.circles.length})
          </button>
          <button className="btn-ghost justify-start" onClick={() => { exportAttendance(db); toast('تم تصدير الحضور') }}>
            <CalendarCheck size={15} className="text-bronze" /> الحضور ({db.attendance.length})
          </button>
          <button className="btn-ghost justify-start" onClick={() => { exportRecitations(db); toast('تم تصدير الحفظ') }}>
            <GraduationCap size={15} className="text-danger" /> الحفظ ({db.recitations.length})
          </button>
        </div>
      </Card>

      {db.students.length === 0 && (
        <div className="col-span-12">
          <Card>
            <Empty icon={FileSpreadsheet} title="لا توجد بيانات بعد" hint="سجّل طلاباً من صفحة الحلقات والطلاب، أو استوردهم من ملف جدول بيانات" />
          </Card>
        </div>
      )}
    </div>
  )
}
