'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AuthCard } from './AuthCard'
import apiService from '@/services/api'

export function SigninPageWrapper() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleAuthenticatedUser = async () => {
      if (isAuthenticated && !isLoading) {
        console.log('🔍 [SigninPageWrapper] User already authenticated, checking for existing analysis...')
        
        try {
          const response = await apiService.getAggregatedMetrics({ scope: 'overall' })
          if (response.success && response.data) {
            console.log('✅ [SigninPageWrapper] Found existing analysis data, redirecting to dashboard')
            router.push('/dashboard')
          } else {
            console.log('ℹ️ [SigninPageWrapper] No existing analysis data, redirecting to onboarding')
            router.push('/onboarding/website')
          }
        } catch (error) {
          console.log('ℹ️ [SigninPageWrapper] No existing analysis data (or error checking), redirecting to onboarding')
          router.push('/onboarding/website')
        }
      }
    }

    handleAuthenticatedUser()
  }, [isAuthenticated, isLoading, router])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </main>
    )
  }

  // Don't render signin form if user is already authenticated (will redirect)
  if (isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <div className="text-gray-600">Redirecting...</div>
        </div>
      </main>
    )
  }

  return <AuthCard mode="signin" />
}


