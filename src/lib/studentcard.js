import { jsPDF } from 'jspdf'
import { downloadBlob } from './helpers'

export function drawStudentCard(canvas, { photo, name, schoolName, circleName, qrSvg, qrCode }) {
  const W = 1050
  const H = 660
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#121920'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(200,155,84,0.9)'
  ctx.lineWidth = 5
  ctx.strokeRect(22, 22, W - 44, H - 44)
  ctx.strokeStyle = 'rgba(16,185,129,0.4)'
  ctx.lineWidth = 2
  ctx.strokeRect(36, 36, W - 72, H - 72)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#C89B54'
  ctx.font = 'bold 40px Amiri, serif'
  ctx.fillText(schoolName || '', W - 60, 95)
  ctx.fillStyle = '#10B981'
  ctx.font = 'bold 34px Amiri, serif'
  ctx.fillText('بطاقة طالب', W - 60, 145)

  if (photo) {
    const img = new Image()
    img.src = photo
    try {
      ctx.save()
      ctx.beginPath()
      ctx.arc(150, 190, 78, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, 72, 112, 156, 156)
      ctx.restore()
      ctx.strokeStyle = '#C89B54'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(150, 190, 80, 0, Math.PI * 2)
      ctx.stroke()
    } catch (e) { /* photo optional */ }
  } else {
    ctx.fillStyle = 'rgba(16,185,129,0.15)'
    ctx.beginPath()
    ctx.arc(150, 190, 78, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#10B981'
    ctx.font = 'bold 64px Amiri, serif'
    ctx.textAlign = 'center'
    ctx.fillText((name || '?').charAt(0), 150, 212)
  }

  ctx.textAlign = 'right'
  ctx.fillStyle = '#F3EFE6'
  ctx.font = 'bold 52px Amiri, serif'
  ctx.fillText(name || '', W - 60, 300)
  ctx.fillStyle = '#8b98a5'
  ctx.font = '26px "IBM Plex Sans Arabic", sans-serif'
  ctx.fillText(`الحلقة: ${circleName || '—'}`, W - 60, 350)
  ctx.fillText(`رقم البطاقة: ${qrCode || ''}`, W - 60, 392)

  if (qrSvg) {
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qrSvg)
    img.onload = () => ctx.drawImage(img, 80, 330, 220, 220)
  }
  return canvas
}

export function studentCardPNG(canvas, filename) {
  canvas.toBlob((b) => b && downloadBlob(b, filename), 'image/png')
}

export function studentCardPDF(canvas, filename) {
  const img = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' })
  pdf.addImage(img, 'PNG', 0, 0, 210, 148)
  pdf.save(filename)
}
