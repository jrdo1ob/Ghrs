'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CapacitorRouteHandler() {
  const router = useRouter()

  useEffect(() => {
    const setupListener = async () => {
      try {
        const { App } = await import('@capacitor/app')

        App.addListener('appUrlOpen', (data: any) => {
          console.log('App opened with URL:', data.url)

          const url = new URL(data.url)

          // Handle ghrs:// scheme
          if (url.protocol === 'ghrs:') {
            const path = url.pathname
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
              router.push('/')
            }
          }

          // Handle https://ghrs-cyan.vercel.app links
          if (url.hostname === 'ghrs-cyan.vercel.app') {
            const path = url.pathname
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
