import JSZip from 'jszip'
import { downloadBlob } from './helpers'

export async function createBackupZip(db) {
  const zip = new JSZip()
  zip.file('kand-database.json', JSON.stringify(db, null, 2))
  const photos = []
  const collect = (obj, label) => {
    if (obj && obj.photo && String(obj.photo).startsWith('data:image')) photos.push({ label, data: obj.photo })
  }
  db.users.forEach((u) => collect(u, `user-${u.id}`))
  db.students.forEach((s) => collect(s, `student-${s.id}`))
  for (const p of photos) {
    const base64 = p.data.split(',')[1]
    zip.file(`photos/${p.label}.jpg`, base64, { base64: true })
  }
  zip.file('manifest.json', JSON.stringify({ app: 'Kand', version: db.version || 2, exportedAt: new Date().toISOString(), photoCount: photos.length }, null, 2))
  return zip.generateAsync({ type: 'blob' })
}

export async function downloadBackupZip(db) {
  const blob = await createBackupZip(db)
  downloadBlob(blob, `kand-backup-${new Date().toISOString().slice(0, 10)}.zip`)
  return blob
}

export async function restoreFromZip(file) {
  const zip = await JSZip.loadAsync(file)
  const dbFile = zip.file('kand-database.json')
  if (!dbFile) throw new Error('ملف ZIP غير صالح: لا يحتوي على kand-database.json')
  const text = await dbFile.async('string')
  const db = JSON.parse(text)
  if (!db || !Array.isArray(db.students) || !Array.isArray(db.users)) throw new Error('بنية قاعدة البيانات غير متوقعة')
  return db
}
