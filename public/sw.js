// GHRS Service Worker - Static Asset Caching Only
// HTML/navigation requests are NOT cached to prevent stale version issues

const CACHE_NAME = 'ghrs-static-v2'

self.addEventListener('install', (event) => {
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
  
  // Skip navigation requests - NEVER cache HTML pages to prevent stale versions
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request))
    return
  }
  
  // For all other requests (static assets), use stale-while-revalidate
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
        return new Response('Offline', { status: 503 })
      })
    })
  )
})
