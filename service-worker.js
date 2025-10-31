/* eslint-disable no-undef */
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Немедленно активируем и берём контроль над вкладкой
self.skipWaiting()
clientsClaim()

// Кеширование сборки Next
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Примеры маршрутов как в next.config.js
registerRoute('/', new NetworkFirst({
  cacheName: 'start-url',
  plugins: [{
    cacheWillUpdate: async ({ response }) => {
      return response && response.type === 'opaqueredirect'
        ? new Response(response.body, { status: 200, statusText: 'OK', headers: response.headers })
        : response
    }
  }]
}), 'GET')

registerRoute(/^https?.*/, new NetworkFirst({
  cacheName: 'offlineCache',
  plugins: [new ExpirationPlugin({ maxEntries: 200 })]
}), 'GET')

// Обработчик push — нужен для кнопки DevTools Push и реальных пушей
// push event handler
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {}
    if (event.data) {
      try { payload = event.data.json() } catch {
        try { payload = { message: await event.data.text() } } catch {}
      }
    }

    const title = payload.title || 'Spendly'
    const body = payload.message || payload.body || 'Push received'
    const icon = payload.icon || '/icons/icon-192x192.png'
    const tag = payload.tag || 'spendly'
    const actions = payload.actions || [{ action: 'open', title: 'Open' }]
    const renotify = typeof payload.renotify === 'boolean' ? payload.renotify : true
    const data = { deepLink: (payload.data && payload.data.deepLink) || payload.deepLink || '/dashboard' }
    const badge = payload.badge || '/icons/icon-192x192.png'

    if (Notification.permission !== 'granted') {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientsList) client.postMessage({ type: 'DEVTOOLS_PUSH', message: body })
      return
    }

    await self.registration.showNotification(title, { body, icon, tag, actions, renotify, data, badge })
  })())
})

// Клик по уведомлению — открываем/фокусируем приложение
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.deepLink || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.includes(url)) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

// Смена подписки — пробрасываем сообщение на страницу
self.addEventListener('pushsubscriptionchange', () => {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' })
  })
})