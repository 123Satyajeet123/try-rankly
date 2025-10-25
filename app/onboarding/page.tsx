'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const step = searchParams.get('step')
  
  useEffect(() => {
    if (token) {
      // This is a Google OAuth callback, let the AuthContext handle it
      // Don't redirect, let the AuthContext process the token
      return
    }
    
    // Default redirect to signup page
    window.location.href = '/onboarding/signup'
  }, [token, step])
  
  // Show loading while processing
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
    </div>
  )
}
