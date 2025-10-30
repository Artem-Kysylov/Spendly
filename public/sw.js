const CACHE_NAME = 'spendly-v2'

// Кешируем только реально существующие статические ассеты из /public
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/Spendly-logo.svg',
  '/illustration-404.svg',
  '/sparkles.svg',
  '/google.svg'
]

// Install event: безопасно кешируем, не падаем на 404
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await Promise.allSettled(PRECACHE_ASSETS.map((url) => cache.add(url)))
    // Сразу активируем новый SW
    self.skipWaiting()
  })())
})

// Activate: чистим старые кэши и забираем клиентов
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => {
      if (key !== CACHE_NAME) return caches.delete(key)
    }))
    await self.clients.claim()
  })())
})

// Fetch: перехватываем только GET, только same-origin и только статические ассеты
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  if (req.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  const isStaticAsset =
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname.endsWith('.svg')

  if (!isStaticAsset) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(req)
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone())
      return res
    }).catch(() => cached)

    return cached || network
  })())
})

// Push event: используем существующие иконки
self.addEventListener('push', (event) => {
  const baseOptions = {
    body: 'You have new financial insights!',
    icon: '/icons/icon-512x512.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: 'View Details', icon: '/icons/icon-192x192.png' },
      { action: 'close', title: 'Close', icon: '/icons/icon-192x192.png' }
    ]
  }

  const data = event.data ? event.data.json() : null
  const title = (data && data.title) || 'Spendly'
  const options = data ? {
    ...baseOptions,
    body: data.message || baseOptions.body,
    icon: data.icon || baseOptions.icon,
    data: { ...baseOptions.data, ...data }
  } : baseOptions

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Notification click: оставляем поведение
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.url

  if (event.action === 'explore') {
    event.waitUntil(clients.openWindow(url || '/dashboard'))
  } else if (event.action === 'close') {
    return
  } else {
    event.waitUntil(clients.openWindow(url || '/'))
  }
})

// Автопереподписка: уведомляем страницы, чтобы клиент инициировал повторную подписку
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of allClients) {
      client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' })
    }
  })())
})