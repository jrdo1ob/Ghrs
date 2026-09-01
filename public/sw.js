const CACHE_NAME = 'ghrs-v1'
const STATIC_ASSETS = [
  '/',
  '/owner-login',
  '/family-login',
  '/child-mode',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Skip non-GET requests
  if (request.method !== 'GET') return
  
  // Skip Supabase API calls (always go to network)
  if (request.url.includes('supabase')) return
  
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version, fetch update in background
        event.waitUntil(
          fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone())
              })
            }
          }).catch(() => {})
        )
        return cachedResponse
      }
      
      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return networkResponse
      }).catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/')
        }
        return new Response('Offline', { status: 503 })
      })
    })
  )
})
