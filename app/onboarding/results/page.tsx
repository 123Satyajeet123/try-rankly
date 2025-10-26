'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { NavigationArrows } from '@/components/NavigationArrows'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import apiService from '@/services/api'

export default function ResultsPage() {
  const router = useRouter()
  const { data } = useOnboarding()
  const { isAuthenticated, isLoading } = useAuth()
  const [isOpening, setIsOpening] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [metricsData, setMetricsData] = useState<any>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 ResultsPage - Onboarding data:', data)
    console.log('🔍 ResultsPage - Generated prompts:', data.generatedPrompts)
    console.log('🔍 ResultsPage - Total prompts:', data.totalPrompts)
    console.log('🔍 ResultsPage - Analysis results:', data.analysisResults)
  }, [data])
  
  // Redirect to signin if not authenticated or if analysis not completed
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/onboarding/signin')
      return
    }
    
    // Redirect to website analysis if analysis not completed
    if (!isLoading && isAuthenticated && !data.analysisCompleted) {
      console.log('⚠️ Analysis not completed, redirecting to website page')
      router.push('/onboarding/website')
      return
    }
  }, [isAuthenticated, isLoading, router, data.analysisCompleted])
  
  // Fetch real metrics data
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        console.log('📊 Fetching dashboard metrics from /api/dashboard/all...')
        const response = await apiService.getDashboardAll({ urlAnalysisId: data.urlAnalysisId })
        
        if (response.success) {
          console.log('✅ Metrics fetched successfully:', response.data)
          console.log('🔍 Overall data:', response.data.overall)
          console.log('🔍 Overall brandMetrics:', response.data.overall?.brandMetrics)
          console.log('🔍 Competitors data:', response.data.competitors)
          console.log('🔍 Metrics data:', response.data.metrics)
          console.log('🔍 Visibility Score:', response.data.metrics?.visibilityScore)
          console.log('🔍 Depth of Mention:', response.data.metrics?.depthOfMention)
          console.log('🔍 Average Position:', response.data.metrics?.averagePosition)
          console.log('🔍 Citation Share from brandMetrics:', response.data.overall?.brandMetrics?.[0]?.citationShare)
          console.log('🔍 Share of Voice from brandMetrics:', response.data.overall?.brandMetrics?.[0]?.shareOfVoice)
          setMetricsData(response.data)
        } else {
          console.error('❌ Failed to fetch metrics:', response.message)
          setMetricsError(response.message)
        }
      } catch (error) {
        console.error('❌ Error fetching metrics:', error)
        setMetricsError('Failed to load metrics')
      } finally {
        setDataLoading(false)
      }
    }

    // Always fetch real metrics data from API
    fetchMetrics()
  }, [data.generatedPrompts])

  const handleOpenDashboard = async () => {
    setIsOpening(true)
    
    try {
      // Navigate to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } catch (err) {
      console.error('Failed to open dashboard:', err)
    } finally {
      setIsOpening(false)
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
    <main className="flex min-h-screen items-center justify-center bg-background p-6 md:p-10 relative">
      <BackgroundBeams className="absolute inset-0 z-0" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-4xl relative z-10"
      >
        <Card className="w-full overflow-hidden rounded-lg h-[600px] relative">
          {/* Navigation Arrows */}
          <NavigationArrows 
            previousPath="/onboarding/llm-platforms"
            showNext={false}
          />
          <CardContent className="grid p-0 md:grid-cols-2 h-full">
            {/* Left Section - View Dashboard (Light Background) */}
            <div className="bg-background p-6 sm:p-8 flex flex-col justify-center">
              <div className="space-y-6 text-center">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">
                    View Dashboard for detailed insights
                  </h1>
                  {/* <p className="text-sm text-muted-foreground">
                    {data.totalPrompts ? `${data.totalPrompts} prompts generated` : 'Analysis complete'}
                  </p> */}
                </div>
                
                <Button
                  onClick={handleOpenDashboard}
                  disabled={isOpening}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center justify-center gap-2"
                >
                  {isOpening ? 'Opening...' : (
                    <>
                      Open Dashboard
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Section - Results Summary (Dark Background) */}
            <div className="bg-muted p-6 sm:p-8 flex flex-col justify-center">
              {dataLoading ? (
                <div className="space-y-4">
                  {/* Skeleton for Visibility Score */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                  
                  {/* Skeleton for Citation Share */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                  
                  {/* Skeleton for Opportunities */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <Skeleton className="h-4 w-40 mb-3" />
                    <Skeleton className="h-3 w-full mb-3" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </div>
              ) : metricsError ? (
                <div className="bg-background/50 rounded-lg p-4">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Unable to load metrics</p>
                    <p className="text-xs mt-1">{metricsError}</p>
                  </div>
                </div>
              ) : (
              <div className="space-y-4">
                  
                  {/* Visibility Score Card */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium tracking-wide text-foreground">Visibility Score</h3>
                      <span className="text-base font-semibold text-foreground">
                        {metricsData?.metrics?.visibilityScore?.value 
                          ? `${Math.round(metricsData.metrics.visibilityScore.value)}%`
                          : '0%'}
                      </span>
                    </div>
                    <p className="text-xs font-normal leading-[1.4] text-muted-foreground">
                      Percentage of prompts where your brand is mentioned
                    </p>
                  </div>

                  {/* Citation Share Card */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium tracking-wide text-foreground">Citation Share</h3>
                      <span className="text-base font-semibold text-foreground">
                        {(() => {
                          // Try multiple paths to find citation share
                          const citationShare = 
                            metricsData?.overall?.brandMetrics?.[0]?.citationShare ||
                            metricsData?.competitors?.find((c: any) => c.isOwner)?.citationShare ||
                            metricsData?.overall?.summary?.userBrand?.citationShare;
                          return citationShare !== undefined ? `${Math.round(citationShare)}%` : '0%';
                        })()}
                      </span>
                    </div>
                        <p className="text-xs font-normal leading-[1.4] text-muted-foreground">
                          Your brand's share of total citations across all brands
                        </p>
                  </div>

                  {/* Average Position Card */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium tracking-wide text-foreground">Average Position</h3>
                      <span className="text-base font-semibold text-foreground">
                        {metricsData?.metrics?.averagePosition?.value 
                          ? `#${Math.round(metricsData.metrics.averagePosition.value)}`
                          : '#0'}
                      </span>
                    </div>
                    <p className="text-xs font-normal leading-[1.4] text-muted-foreground">
                      Average position of your brand in responses
                    </p>
                  </div>

                  {/* Topic Rankings Card */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium tracking-wide text-foreground">Depth of Mention</h3>
                      <span className="text-base font-semibold text-foreground">
                        {metricsData?.metrics?.depthOfMention?.value 
                          ? `${metricsData.metrics.depthOfMention.value.toFixed(2)}`
                          : '0.00'}
                      </span>
                    </div>
                    <p className="text-xs font-normal leading-[1.4] text-muted-foreground">
                      Average word count when brand is mentioned
                    </p>
                  </div>

                  {/* Share of Voice Card */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium tracking-wide text-foreground">Share of Voice</h3>
                      <span className="text-base font-semibold text-foreground">
                        {(() => {
                          // Try multiple paths to find share of voice
                          const shareOfVoice = 
                            metricsData?.overall?.brandMetrics?.[0]?.shareOfVoice ||
                            metricsData?.competitors?.find((c: any) => c.isOwner)?.shareOfVoice ||
                            metricsData?.overall?.summary?.userBrand?.shareOfVoice;
                          return shareOfVoice !== undefined ? `${Math.round(shareOfVoice)}%` : '0%';
                        })()}
                      </span>
                    </div>
                    <p className="text-xs font-normal leading-[1.4] text-muted-foreground">
                      Your brand's share of all brand mentions in responses
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  )
}