import { uid } from './helpers'

export const REGISTRY_KEY = 'kand_registry_v1'
export const SESSION_KEY = 'kand_session_v1'

export const schoolDbKey = (schoolId) => `kand_db_${schoolId}`

export function buildSchoolDb(school) {
  return {
    version: 2,
    settings: {
      schoolId: school.id,
      schoolName: school.name,
      schoolNameShort: school.name,
      adminName: school.adminName || '',
      gasUrl: '',
      fcmToken: '',
    },
    users: [],
    circles: [],
    students: [],
    attendance: [],
    recitations: [],
    exams: [],
    parentLogs: [],
    certificates: [],
    notifications: [],
    backups: [],
    archive: [],
  }
}

export function loadRegistry() {
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY)) || { schools: [], users: [] }
  } catch (e) {
    return { schools: [], users: [] }
  }
}

export function saveRegistry(r) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(r))
}

export const newSchoolCode = () =>
  Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('')

export const newSchoolId = () => 'sch-' + uid().slice(3, 11)
