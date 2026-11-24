import { jsPDF } from 'jspdf'
import { fmtDate, todayStr } from './helpers'

export const CERT_CATEGORIES = [
  { key: 'mostMemorized', title: 'الطالب الأكثر حفظاً', desc: 'أعلى مجموع للصفحات والآيات المحفوظة في الفترة' },
  { key: 'mostDiligent', title: 'الطالب الأكثر مداومة', desc: 'أعلى نسبة حضور والتزام في الحصص' },
  { key: 'mostImproved', title: 'الطالب الأكثر تحسناً', desc: 'أكبر فارق إيجابي بين آخر تقييمين' },
  { key: 'mostCarefulParent', title: 'الولي الأكثر حرصاً', desc: 'أكثر تأكيدات متابعة + انتظام حضور الابن' },
]

const AR = {
  certTitle: 'شهادة تكريم',
  schoolLine: (name) => name,
  body: 'تمنح هذه الشهادة إلى الطالب',
  parentBody: 'يُكرَّم ولي الأمر',
  forReason: 'وذلك لتميزه في',
  dateLine: (d) => 'صدرت بتاريخ ' + d,
  signature: 'المعلم / المدير',
  seal: 'ختم المدرسة',
}

export function drawCertificate(canvas, { schoolName, recipient, categoryTitle, reason, date, signer, isParent = false }) {
  const W = 1684
  const H = 1190
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0E151B')
  bg.addColorStop(1, '#0B1014')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(200,155,84,0.85)'
  ctx.lineWidth = 4
  ctx.strokeRect(34, 34, W - 68, H - 68)
  ctx.strokeStyle = 'rgba(16,185,129,0.4)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(52, 52, W - 104, H - 104)

  const corner = (x, y, flipX, flipY) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(flipX, flipY)
    ctx.strokeStyle = 'rgba(200,155,84,0.9)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, 90)
    ctx.lineTo(0, 0)
    ctx.lineTo(90, 0)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(16,185,129,0.6)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(14, 90)
    ctx.lineTo(14, 14)
    ctx.lineTo(90, 14)
    ctx.stroke()
    ctx.restore()
  }
  corner(34, 34, 1, 1)
  corner(W - 34, 34, -1, 1)
  corner(34, H - 34, 1, -1)
  corner(W - 34, H - 34, -1, -1)

  for (let i = 0; i < 24; i++) {
    const t = i / 23
    const x = 60 + t * (W - 120)
    ctx.fillStyle = i % 2 ? 'rgba(200,155,84,0.5)' : 'rgba(16,185,129,0.45)'
    ctx.save()
    ctx.translate(x, 34)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-4, -4, 8, 8)
    ctx.restore()
    ctx.save()
    ctx.translate(x, H - 34)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-4, -4, 8, 8)
    ctx.restore()
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = '#C89B54'
  ctx.font = '44px Amiri, serif'
  ctx.fillText(schoolName, W / 2, 150)

  ctx.fillStyle = '#10B981'
  ctx.font = 'bold 92px Amiri, serif'
  ctx.fillText(AR.certTitle, W / 2, 285)

  ctx.strokeStyle = 'rgba(200,155,84,0.7)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(W / 2 - 260, 325)
  ctx.lineTo(W / 2 + 260, 325)
  ctx.stroke()

  ctx.fillStyle = '#8b98a5'
  ctx.font = '34px "IBM Plex Sans Arabic", sans-serif'
  ctx.fillText(isParent ? AR.parentBody : AR.body, W / 2, 400)

  ctx.fillStyle = '#F3EFE6'
  ctx.font = 'bold 84px Amiri, serif'
  ctx.fillText(recipient, W / 2, 510)

  ctx.strokeStyle = 'rgba(200,155,84,0.55)'
  ctx.setLineDash([2, 8])
  ctx.beginPath()
  ctx.moveTo(W / 2 - 320, 560)
  ctx.lineTo(W / 2 + 320, 560)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = '#C89B54'
  ctx.font = '36px Amiri, serif'
  ctx.fillText(AR.forReason, W / 2, 625)
  ctx.fillStyle = '#e8edf1'
  ctx.font = 'bold 52px Amiri, serif'
  ctx.fillText(categoryTitle, W / 2, 695)
  if (reason) {
    ctx.fillStyle = '#8b98a5'
    ctx.font = '28px "IBM Plex Sans Arabic", sans-serif'
    ctx.fillText(reason, W / 2, 750)
  }

  ctx.fillStyle = '#8b98a5'
  ctx.font = '30px "IBM Plex Sans Arabic", sans-serif'
  ctx.fillText(AR.dateLine(fmtDate(date || todayStr())), W / 2, H - 190)

  ctx.strokeStyle = 'rgba(139,152,165,0.5)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(W / 2 - 420, H - 120)
  ctx.lineTo(W / 2 - 180, H - 120)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(W / 2 + 180, H - 120)
  ctx.lineTo(W / 2 + 420, H - 120)
  ctx.stroke()
  ctx.fillStyle = '#8b98a5'
  ctx.font = '26px "IBM Plex Sans Arabic", sans-serif'
  ctx.fillText(AR.signature, W / 2 - 300, H - 88)
  ctx.fillText(AR.seal, W / 2 + 300, H - 88)
  ctx.fillStyle = '#C89B54'
  ctx.font = 'bold 34px Amiri, serif'
  ctx.fillText(signer || '', W / 2 - 300, H - 135)

  ctx.strokeStyle = 'rgba(200,155,84,0.8)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(W / 2 + 300, H - 160, 42, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#C89B54'
  ctx.font = 'bold 30px Amiri, serif'
  ctx.fillText('كند', W / 2 + 300, H - 148)
}

export function certificateToPNG(canvas, cb) {
  canvas.toBlob((b) => cb(b), 'image/png')
}

export function certificateToPDF(canvas, filename) {
  const img = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  pdf.addImage(img, 'PNG', 0, 0, 297, 210)
  pdf.save(filename)
}
