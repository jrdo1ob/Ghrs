'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CapacitorRouteHandler() {
  const router = useRouter()

  useEffect(() => {
    const setupListener = async () => {
      try {
        const { App } = await import('@capacitor/app')

        App.addListener('appUrlOpen', async (data: any) => {
          console.log('App opened with URL:', data.url)

          const url = new URL(data.url)

          // Handle ghrs:// scheme
          if (url.protocol === 'ghrs:' || url.protocol === 'capacitor:') {
            const path = url.pathname
            const accessToken = url.searchParams.get('access_token') || url.hash?.split('access_token=')[1]?.split('&')[0]
            const refreshToken = url.searchParams.get('refresh_token') || url.hash?.split('refresh_token=')[1]?.split('&')[0]

            // If we have tokens, inject session into WebView
            if (accessToken && refreshToken) {
              try {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()

                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                })

                console.log('Session injected into WebView')
                router.push('/dashboard')
                return
              } catch (err) {
                console.error('Failed to inject session:', err)
              }
            }

            // Handle specific paths
            if (path.includes('auth-callback')) {
              router.push('/auth/callback' + url.search)
            } else if (path.includes('family-login')) {
              const code = url.searchParams.get('code')
              router.push(code ? `/family-login?code=${code}` : '/family-login')
            } else if (path.includes('owner-login')) {
              router.push('/owner-login')
            } else if (path.includes('dashboard')) {
              router.push('/dashboard')
            } else if (path.includes('child-mode')) {
              router.push('/child-mode')
            } else {
              router.push('/')
            }
          }

          // Handle https://ghrs-cyan.vercel.app links
          if (url.hostname === 'ghrs-cyan.vercel.app') {
            const path = url.pathname
            const accessToken = url.searchParams.get('access_token') || url.hash?.split('access_token=')[1]?.split('&')[0]
            const refreshToken = url.searchParams.get('refresh_token') || url.hash?.split('refresh_token=')[1]?.split('&')[0]

            // If we have tokens, inject session
            if (accessToken && refreshToken) {
              try {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()

                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                })

                console.log('Session injected into WebView')
                router.push('/dashboard')
                return
              } catch (err) {
                console.error('Failed to inject session:', err)
              }
            }

            // Handle specific paths
            const code = url.searchParams.get('code')
            if (path.includes('family-login')) {
              router.push(code ? `/family-login?code=${code}` : '/family-login')
            } else if (path.includes('owner-login')) {
              router.push('/owner-login')
            } else if (path.includes('dashboard')) {
              router.push('/dashboard')
            } else if (path.includes('child-mode')) {
              router.push('/child-mode')
            } else {
              router.push(path || '/')
            }
          }
        })

        console.log('Capacitor route listener set up')
      } catch (err) {
        // Not running in Capacitor
        console.log('Not running in Capacitor, skipping route listener')
      }
    }

    setupListener()
  }, [router])

  return null
}
