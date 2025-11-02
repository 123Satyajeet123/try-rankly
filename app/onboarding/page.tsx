'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

function OnboardingContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const error = searchParams.get('error')
  const step = searchParams.get('step')
  const { isAuthenticated, isLoading } = useAuth()
  const [hasRedirected, setHasRedirected] = useState(false)
  
  useEffect(() => {
    // If there's a token in URL, AuthContext is handling it - just wait
    if (token || isLoading) {
      return
    }
    
    // If there's an error, redirect to signup
    if (error) {
      if (!hasRedirected) {
        setHasRedirected(true)
        window.location.href = '/onboarding/signup'
      }
      return
    }
    
    // If authenticated, redirect to dashboard (this handles the case when AuthContext already processed the token)
    if (isAuthenticated && !hasRedirected) {
      setHasRedirected(true)
      window.location.href = '/dashboard'
      return
    }
    
    // If not authenticated and no token, redirect to signup
    if (!isAuthenticated && !token && !hasRedirected) {
      setHasRedirected(true)
      window.location.href = '/onboarding/signup'
    }
  }, [token, error, step, isAuthenticated, isLoading, hasRedirected])
  
  // Show loading while processing
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
