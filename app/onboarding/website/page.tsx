'use client'

import { useState, useEffect } from 'react'
import { WebsiteUrlStep } from '@/components/WebsiteUrlStep'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import apiService from '@/services/api'

export default function WebsitePage() {
  const router = useRouter()
  const { updateData } = useOnboarding()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [savedUrl, setSavedUrl] = useState('')
  const [analysisSuccess, setAnalysisSuccess] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  
  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/onboarding/signin')
    }
  }, [isAuthenticated, isLoading, router])

  // Load saved URL on mount
  useEffect(() => {
    const websiteData = localStorage.getItem('websiteData')
    if (websiteData) {
      const data = JSON.parse(websiteData)
      setSavedUrl(data.url || '')
    }
  }, [])

  const handleContinue = async (url: string) => {
    setIsAnalyzing(true)
    console.log('Analyzing website:', url)
    
    // Save URL to localStorage
    localStorage.setItem('websiteData', JSON.stringify({ url }))
    
    try {
      // First, check if this URL has already been analyzed by the user
      try {
        console.log('🔍 Checking if URL already analyzed...')
        const existingAnalysis = await apiService.findUrlAnalysisByUrl(url)
        
        if (existingAnalysis?.success && existingAnalysis?.data?.id) {
          console.log('✅ URL already analyzed, found analysis ID:', existingAnalysis.data.id)
          
          // Redirect to dashboard with existing analysis
          console.log('🔄 Redirecting to dashboard with existing analysis...')
          setIsAnalyzing(false)
          router.push(`/dashboard?analysisId=${existingAnalysis.data.id}`)
          return
        }
      } catch (error: any) {
        // If URL not found, that's fine - we'll proceed with new analysis
        // The API service throws an Error for 404, so we check the message
        const errorMessage = error?.message || ''
        if (errorMessage.includes('not found') || 
            errorMessage.includes('404') || 
            errorMessage.includes('URL analysis not found')) {
          console.log('ℹ️ URL not found in existing analyses, proceeding with new analysis')
        } else {
          // Other errors - log but continue with new analysis
          console.warn('⚠️ Error checking existing analysis, proceeding with new analysis:', error)
        }
      }

      // Clear previous data before starting new analysis
      updateData({
        websiteUrl: url,
        competitors: [],
        topics: [],
        personas: [],
        selectedCompetitors: new Set(),
        selectedTopics: new Set(),
        selectedPersonas: new Set(),
        analysisResults: null
      })

      // Call the backend API to analyze the website
      const response = await apiService.analyzeWebsite(url)

      if (response.success) {
        console.log('✅ Website analysis completed:', response.data)
        console.log('🔍 Analysis data structure:', JSON.stringify(response.data.analysis, null, 2))

        // Update local data with the analysis results and completion flag
        console.log('🏁 Setting analysisCompleted flag and storing analysis results')
        updateData({
          websiteUrl: url,
          // Store URL analysis ID for linking data
          urlAnalysisId: response.data.urlAnalysisId,
          // Store analysis results for use in later steps
          analysisResults: response.data.analysis,
          // Set flag to indicate analysis is complete
          analysisCompleted: true
        })
        
        console.log('✅ Analysis completion flag and results set successfully')
        setAnalysisSuccess(true)
        
      } else {
        console.error('❌ Website analysis failed:', response.message)
        setIsAnalyzing(false)
        setAnalysisSuccess(false)
        setAnalysisError(response.message || 'Analysis failed')
        return
      }
    } catch (error: any) {
      console.error('❌ Website analysis failed:', error)
      setIsAnalyzing(false)
      setAnalysisSuccess(false)
      setAnalysisError(error.message || 'Analysis failed')
      return
    }

    // Only enable button after API call completes successfully
    // No artificial delay - button becomes available when data is ready
    if (analysisSuccess) {
      setIsAnalyzing(false)
    }
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </main>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <WebsiteUrlStep 
      onContinue={handleContinue}
      isLoading={isAnalyzing}
      initialUrl={savedUrl}
      previousPath="/onboarding/signin"
      nextPath="/onboarding/competitors"
      analysisSuccess={analysisSuccess}
      analysisError={analysisError}
    />
  )
}