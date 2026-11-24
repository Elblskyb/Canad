import { Capacitor } from '@capacitor/core'

/* Push notifications — fully guarded: must NEVER crash the app when Firebase
   (google-services.json) is not configured. All calls wrapped in try/catch. */
export async function initPush() {
  try {
    if (!Capacitor.isNativePlatform()) return null
    if (localStorage.getItem('kand_push_disabled') === '1') return null
    const mod = await import('@capacitor/push-notifications')
    const PushNotifications = mod.PushNotifications
    if (!PushNotifications) return null

    let perm
    try {
      perm = await PushNotifications.checkPermissions()
    } catch (e) {
      return null
    }
    if (perm?.receive !== 'granted') {
      try {
        perm = await PushNotifications.requestPermissions()
      } catch (e) {
        return null
      }
    }
    if (perm?.receive !== 'granted') return null

    try {
      await PushNotifications.register()
    } catch (e) {
      // Firebase not configured (no google-services.json) → push disabled silently
      localStorage.setItem('kand_push_disabled', '1')
      return null
    }

    try {
      await PushNotifications.addListener('registration', (token) => {
        try {
          localStorage.setItem('kand_fcm_token', token.value)
        } catch (e) { /* ignore */ }
      })
      await PushNotifications.addListener('registrationError', () => {
        localStorage.setItem('kand_push_disabled', '1')
      })
      await PushNotifications.addListener('pushNotificationReceived', (n) => {
        window.dispatchEvent(new CustomEvent('kand_push', { detail: n }))
      })
      await PushNotifications.addListener('pushNotificationActionPerformed', () => {})
    } catch (e) { /* listeners optional */ }
    return true
  } catch (e) {
    return null
  }
}
