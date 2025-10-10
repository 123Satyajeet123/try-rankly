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
  const { isAuthenticated, isLoading } = useAuth()
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

    // Keep loading state true for the entire duration of loaders
    // Initial loader: 3s + 4 sequential loaders: 8s = 11s total
    // Only if API call was successful
    if (analysisSuccess) {
      setTimeout(() => {
        setIsAnalyzing(false)
      }, 11000) // 11 seconds total for all loaders to complete
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