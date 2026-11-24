import { Capacitor } from '@capacitor/core'

export async function initPush() {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    let perm = await PushNotifications.checkPermissions()
    if (perm.receive !== 'granted') perm = await PushNotifications.requestPermissions()
    if (perm.receive !== 'granted') return null
    await PushNotifications.register()
    await PushNotifications.addListener('registration', (token) => {
      try {
        localStorage.setItem('kand_fcm_token', token.value)
      } catch (e) { /* ignore */ }
    })
    await PushNotifications.addListener('registrationError', () => {})
    await PushNotifications.addListener('pushNotificationReceived', (n) => {
      window.dispatchEvent(new CustomEvent('kand_push', { detail: n }))
    })
    await PushNotifications.addListener('pushNotificationActionPerformed', () => {})
    return true
  } catch (e) {
    return null
  }
}
