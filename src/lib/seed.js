import { uid, todayStr, addDays } from './helpers'

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)]

export function buildSeed() {
  const r = rng(20240901)
  const now = new Date().toISOString()

  const users = [
    { id: 'usr-admin', name: 'أحمد المنصوري', email: 'admin@kand.school', password: '123456', role: 'admin', phone: '0500000001', createdAt: now },
    { id: 'usr-t1', name: 'الشيخ محمد الهاشمي', email: 'teacher@kand.school', password: '123456', role: 'teacher', phone: '0500000002', circleId: 'cir-1', createdAt: now },
    { id: 'usr-t2', name: 'الأستاذة فاطمة الزهراء', email: 'teacher2@kand.school', password: '123456', role: 'teacher', phone: '0500000003', circleId: 'cir-2', createdAt: now },
    { id: 'usr-p1', name: 'أبو محمد الطائي', email: 'parent@kand.school', password: '123456', role: 'parent', phone: '0511111111', createdAt: now },
    { id: 'usr-p2', name: 'أبو يوسف الأنصاري', email: 'parent2@kand.school', password: '123456', role: 'parent', phone: '0522222222', createdAt: now },
    { id: 'usr-p3', name: 'أبو خالد الراشد', email: 'parent3@kand.school', password: '123456', role: 'parent', phone: '0533333333', createdAt: now },
    { id: 'usr-p4', name: 'أبو عبد الله المالك', email: 'parent4@kand.school', password: '123456', role: 'parent', phone: '0544444444', createdAt: now },
    { id: 'usr-p5', name: 'أم سارة القحطاني', email: 'parent5@kand.school', password: '123456', role: 'parent', phone: '0555555555', createdAt: now },
  ]

  const circles = [
    { id: 'cir-1', name: 'حلقة النخبة', teacherId: 'usr-t1', schedule: [{ day: 'السبت', time: '09:00' }, { day: 'الثلاثاء', time: '17:30' }], ageGroup: '12 - 16 سنة', level: 'حفظ متقدم', room: 'القاعة الأولى', createdAt: now },
    { id: 'cir-2', name: 'حلقة المبتدئين', teacherId: 'usr-t2', schedule: [{ day: 'الأحد', time: '16:00' }, { day: 'الأربعاء', time: '16:00' }], ageGroup: '7 - 11 سنة', level: 'تلاوة وتجويد', room: 'القاعة الثانية', createdAt: now },
    { id: 'cir-3', name: 'حلقة المراجعة والتثبيت', teacherId: 'usr-t1', schedule: [{ day: 'الخميس', time: '18:00' }], ageGroup: '16 سنة فأكثر', level: 'مراجعة وتثبيت', room: 'المكتبة', createdAt: now },
  ]

  const studentsRaw = [
    ['stu-001', 'محمد الطائي', 'cir-1', 'usr-p1', '2012-05-14'],
    ['stu-002', 'أحمد السلمي', 'cir-1', 'usr-p1', '2011-09-02'],
    ['stu-003', 'يوسف الأنصاري', 'cir-1', 'usr-p2', '2012-01-27'],
    ['stu-004', 'خالد الراشد', 'cir-3', 'usr-p3', '2008-03-19'],
    ['stu-005', 'عبد الله المالك', 'cir-3', 'usr-p4', '2007-11-08'],
    ['stu-006', 'طلحة الغامدي', 'cir-3', 'usr-p4', '2009-06-23'],
    ['stu-007', 'سارة القحطاني', 'cir-2', 'usr-p5', '2016-02-11'],
    ['stu-008', 'نورة الشمري', 'cir-2', 'usr-p5', '2017-07-30'],
    ['stu-009', 'هيفاء العتيبي', 'cir-2', 'usr-p5', '2016-12-05'],
    ['stu-010', 'ريم الدوسري', 'cir-2', 'usr-p5', '2017-04-17'],
  ]

  const students = studentsRaw.map(([id, name, circleId, parentId, birthDate], i) => {
    users.push({
      id: `usr-${id}`,
      name,
      email: `student${i + 1}@kand.school`,
      password: '123456',
      role: 'student',
      phone: `056${String(1000000 + i * 137)}`,
      studentId: id,
      createdAt: now,
    })
    return {
      id,
      userId: `usr-${id}`,
      name,
      birthDate,
      circleId,
      parentId,
      qrCode: `KAND-${id.toUpperCase()}`,
      joinedAt: addDays(todayStr(), -120 + i * 6),
      createdAt: now,
    }
  })

  const attendance = []
  const sessionDays = { 'cir-1': ['2025-11-01', '2025-11-04', '2025-11-08', '2025-11-11', '2025-11-15', '2025-11-18', '2025-11-22', '2025-11-25', '2025-11-29', '2025-12-02', '2025-12-06', '2025-12-09', '2025-12-13', '2025-12-16'], 'cir-2': ['2025-11-02', '2025-11-05', '2025-11-09', '2025-11-12', '2025-11-16', '2025-11-19', '2025-11-23', '2025-11-26', '2025-11-30', '2025-12-03', '2025-12-07', '2025-12-10', '2025-12-14'], 'cir-3': ['2025-11-06', '2025-11-13', '2025-11-20', '2025-11-27', '2025-12-04', '2025-12-11', '2025-12-18'] }

  Object.entries(sessionDays).forEach(([circleId, days]) => {
    const circleStudents = students.filter((s) => s.circleId === circleId)
    days.forEach((day, di) => {
      circleStudents.forEach((s) => {
        const roll = r()
        let status = 'present'
        if (roll > 0.9) status = 'absent'
        else if (roll > 0.82) status = 'late'
        else if (roll > 0.78) status = 'excused'
        if (di === days.length - 1 && ['stu-003', 'stu-008'].includes(s.id)) status = 'absent'
        if (di === days.length - 1 && s.id === 'stu-007') status = 'absent'
        attendance.push({
          id: uid(),
          studentId: s.id,
          circleId,
          date: day,
          status,
          method: status === 'present' ? 'qr' : 'manual',
          scannedAt: status === 'present' || status === 'late' ? `${day}T${pick(r, ['08:5', '16:0', '17:3', '18:0'])}${Math.floor(r() * 9)}:${String(Math.floor(r() * 60)).padStart(2, '0')}:00` : null,
        })
      })
    })
  })

  const recitationPool = [
    [2, 1, 20], [2, 21, 40], [2, 41, 60], [2, 61, 80], [2, 141, 160], [3, 1, 15], [36, 1, 20], [36, 21, 40], [55, 1, 20], [67, 1, 15], [78, 1, 20], [112, 1, 4], [113, 1, 5], [114, 1, 6], [4, 1, 10], [5, 1, 12],
  ]
  const recitations = []
  const recDays = []
  for (let i = 45; i >= 2; i--) if (i % 3 !== 0) recDays.push(addDays(todayStr(), -i))
  recDays.forEach((day) => {
    students.forEach((s) => {
      if (r() > 0.55) return
      const [sn, fa, ta] = pick(r, recitationPool)
      const type = r() > 0.6 ? 'hifz' : 'murajaa'
      const pages = Math.max(1, Math.round((ta - fa + 1) / 5))
      const score = Math.round(55 + r() * 45)
      recitations.push({
        id: uid(),
        studentId: s.id,
        circleId: s.circleId,
        teacherId: circles.find((c) => c.id === s.circleId).teacherId,
        date: day,
        type,
        surah: sn,
        fromAyah: fa,
        toAyah: ta,
        lines: Math.round((ta - fa + 1) * 1.4),
        pages,
        score,
        notes: r() > 0.7 ? pick(r, ['أداء متميز في المدود', 'يحتاج مراجعة في الإخفاء', 'صوت هادئ وواضح', 'إتقان واضح في الحفظ', 'أداء جيد مع ملاحظة على التجويد']) : '',
        createdAt: `${day}T18:00:00.000Z`,
      })
    })
  })

  const exams = [
    {
      id: 'exm-1',
      title: 'الاختبار الشهري — نوفمبر',
      type: 'monthly',
      circleId: 'cir-1',
      date: addDays(todayStr(), -20),
      createdBy: 'usr-t1',
      results: ['stu-001', 'stu-002', 'stu-003'].map((sid) => ({
        studentId: sid,
        memorization: Math.round(60 + r() * 40),
        tajweed: Math.round(60 + r() * 40),
        voice: Math.round(60 + r() * 40),
      })),
    },
    {
      id: 'exm-2',
      title: 'اختبار الجزء الثلاثين',
      type: 'juz',
      circleId: 'cir-2',
      date: addDays(todayStr(), -8),
      createdBy: 'usr-t2',
      results: ['stu-007', 'stu-008', 'stu-009', 'stu-010'].map((sid) => ({
        studentId: sid,
        memorization: Math.round(55 + r() * 45),
        tajweed: Math.round(55 + r() * 45),
        voice: Math.round(55 + r() * 45),
      })),
    },
    {
      id: 'exm-3',
      title: 'اختبار السور القصيرة — ديسمبر',
      type: 'surah',
      circleId: 'cir-3',
      date: addDays(todayStr(), -3),
      createdBy: 'usr-t1',
      results: ['stu-004', 'stu-005', 'stu-006'].map((sid) => ({
        studentId: sid,
        memorization: Math.round(60 + r() * 40),
        tajweed: Math.round(60 + r() * 40),
        voice: Math.round(60 + r() * 40),
      })),
    },
  ]
  exams.forEach((e) => {
    e.results.forEach((res) => {
      res.total = Math.round((res.memorization + res.tajweed + res.voice) / 3)
      res.grade = res.total >= 90 ? 'ممتاز' : res.total >= 80 ? 'جيد جداً' : res.total >= 65 ? 'جيد' : res.total >= 50 ? 'مقبول' : 'ضعيف'
    })
  })

  const parentLogs = []
  const parents = users.filter((u) => u.role === 'parent')
  for (let i = 40; i >= 4; i -= 3) {
    const p = pick(r, parents)
    const kids = students.filter((s) => s.parentId === p.id)
    if (!kids.length) continue
    parentLogs.push({
      id: uid(),
      parentId: p.id,
      studentId: pick(r, kids).id,
      reportType: pick(r, ['تقرير الحضور الأسبوعي', 'تقرير التقدم الشهري', 'نتائج الاختبارات']),
      reportDate: addDays(todayStr(), -i),
      confirmedAt: `${addDays(todayStr(), -i)}T${pick(r, ['09', '13', '19', '21'])}:${String(Math.floor(r() * 60)).padStart(2, '0')}:00.000Z`,
    })
  }

  return {
    version: 1,
    settings: {
      schoolName: 'مدرسة ' + 'ك' + 'ند' + ' للقرآن الكريم',
      schoolNameShort: 'كند',
      adminName: 'أحمد المنصوري',
      gasUrl: '',
      currency: '',
    },
    users,
    circles,
    students,
    attendance,
    recitations,
    exams,
    parentLogs,
    certificates: [],
    backups: [],
    archive: [],
  }
}
