export const CODE_GS = `// ============================================================
//  kind (كند) — كود الربط مع Google Sheets و Google Drive
//  انسخ هذا الكود بالكامل وضعه في مشروع Apps Script جديد
//  ثم انشر (Deploy) كتطبيق ويب واختر الوصول: "أي شخص" (Anyone)
//  والصق resulting URL في إعدادات تطبيق kind
// ============================================================

const SHEETS = {
  Users: ['id', 'name', 'email', 'password', 'role', 'phone', 'circleId', 'studentId', 'createdAt'],
  Circles: ['id', 'name', 'teacherId', 'schedule', 'ageGroup', 'level', 'room', 'createdAt'],
  Students: ['id', 'userId', 'name', 'birthDate', 'circleId', 'parentId', 'qrCode', 'joinedAt', 'createdAt'],
  Attendance: ['id', 'studentId', 'circleId', 'date', 'status', 'method', 'scannedAt'],
  Recitations: ['id', 'studentId', 'circleId', 'teacherId', 'date', 'type', 'surah', 'fromAyah', 'toAyah', 'lines', 'pages', 'score', 'notes', 'createdAt'],
  Exams: ['id', 'title', 'type', 'circleId', 'date', 'createdBy', 'results'],
  ParentLogs: ['id', 'parentId', 'studentId', 'reportType', 'reportDate', 'confirmedAt'],
  Certificates: ['id', 'studentId', 'category', 'title', 'issuedAt', 'issuedBy'],
  Backups: ['id', 'name', 'createdAt', 'driveFileId'],
  Archive: ['id', 'kind', 'deletedAt', 'record'],
  Settings: ['schoolName', 'schoolNameShort', 'adminName', 'gasUrl'],
}

const BACKUP_FOLDER = 'Kand_Backups'
const DB_SHEET = 'Kand_DB'

function getSpreadsheet() {
  // أول تشغيل يتم إنشاء الجداول تلقائياً، أو استخدام جدول موجود مسبقاً
  const existing = DriveApp.getFilesByName(DB_SHEET)
  if (existing.hasNext()) return SpreadsheetApp.open(existing.next())
  const ss = SpreadsheetApp.create(DB_SHEET)
  Object.keys(SHEETS).forEach((name) => {
    const sh = ss.insertSheet(name)
    sh.appendRow(SHEETS[name])
  })
  return ss
}

function sheetToObjects(name) {
  const ss = getSpreadsheet()
  const sh = ss.getSheetByName(name)
  if (!sh) return []
  const rows = sh.getDataRange().getValues()
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).filter((r) => r[0]).map((r) => {
    const obj = {}
    headers.forEach((h, i) => {
      let v = r[i]
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        try { v = JSON.parse(v) } catch (e) { /* keep string */ }
      }
      obj[h] = v === '' ? null : v
    })
    return obj
  })
}

function objectsToSheet(name, list) {
  const ss = getSpreadsheet()
  let sh = ss.getSheetByName(name)
  if (!sh) {
    sh = ss.insertSheet(name)
    sh.appendRow(SHEETS[name])
  } else {
    sh.clearContents()
    sh.appendRow(SHEETS[name])
  }
  if (!list || !list.length) return
  const headers = SHEETS[name]
  const rows = list.map((obj) =>
    headers.map((h) => {
      const v = obj[h]
      if (v === null || v === undefined) return ''
      if (typeof v === 'object') return JSON.stringify(v)
      return v
    })
  )
  sh.getRange(2, 1, rows.length, headers.length).setValues(rows)
}

function getBackupFolder() {
  const folders = DriveApp.getFoldersByName(BACKUP_FOLDER)
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER)
}

function loadDb() {
  const db = { version: 1 }
  Object.keys(SHEETS).forEach((name) => {
    const key = name.charAt(0).toLowerCase() + name.slice(1)
    db[key] = sheetToObjects(name)
  })
  if (!db.settings || !db.settings.length) {
    db.settings = [{ schoolName: 'مدرسة ' + 'ك' + 'ند' + ' للقرآن الكريم', schoolNameShort: 'كند', adminName: '', gasUrl: '' }]
  } else {
    db.settings = db.settings[0]
  }
  return db
}

function saveDb(db) {
  Object.keys(SHEETS).forEach((name) => {
    const key = name.charAt(0).toLowerCase() + name.slice(1)
    if (name === 'Settings') {
      objectsToSheet('Settings', [db.settings || {}])
    } else {
      objectsToSheet(name, db[key] || [])
    }
  })
}

function doPost(e) {
  const req = JSON.parse(e.postData.contents)
  const action = req.action
  try {
    if (action === 'getAll') {
      return json({ ok: true, data: loadDb() })
    }
    if (action === 'saveAll') {
      saveDb(req.data)
      return json({ ok: true })
    }
    if (action === 'backup') {
      const folder = getBackupFolder()
      const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm')
      const name = (req.name || 'نسخة احتياطية') + ' — ' + stamp + '.json'
      const file = folder.createFile(name, JSON.stringify(req.data, null, 2), MimeType.PLAIN_TEXT)
      const ss = getSpreadsheet()
      let sh = ss.getSheetByName('Backups')
      if (!sh) { sh = ss.insertSheet('Backups'); sh.appendRow(SHEETS.Backups) }
      sh.appendRow([new Date().toISOString().slice(0, 10) + '-' + Math.random().toString(36).slice(2, 8), req.name || name, new Date().toISOString(), file.getId()])
      return json({ ok: true, fileId: file.getId(), name: name })
    }
    if (action === 'listBackups') {
      const folder = getBackupFolder()
      const files = []
      const it = folder.getFiles()
      while (it.hasNext()) {
        const f = it.next()
        files.push({ id: f.getId(), name: f.getName(), date: f.getDateCreated().toISOString() })
      }
      files.sort((a, b) => (a.date < b.date ? 1 : -1))
      return json({ ok: true, files: files })
    }
    if (action === 'restoreBackup') {
      const file = DriveApp.getFileById(req.fileId)
      const data = JSON.parse(file.getBlob().getDataAsString())
      return json({ ok: true, data: data })
    }
    return json({ ok: false, error: 'إجراء غير معروف: ' + action })
  } catch (err) {
    return json({ ok: false, error: String(err) })
  }
}

function doGet(e) {
  return doPost(e)
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
`
