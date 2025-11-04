'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { NavigationArrows } from '@/components/NavigationArrows'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import Link from 'next/link'
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
      // ✅ Pass urlAnalysisId as URL parameter so dashboard can use it immediately
      const urlAnalysisId = data.urlAnalysisId
      const dashboardUrl = urlAnalysisId 
        ? `/dashboard?analysisId=${encodeURIComponent(urlAnalysisId)}`
        : '/dashboard'
      
      console.log('🔗 [ResultsPage] Navigating to dashboard with urlAnalysisId:', urlAnalysisId)
      
      // Navigate to dashboard with urlAnalysisId parameter
      setTimeout(() => {
        router.push(dashboardUrl)
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
    <main className="relative flex h-screen w-full items-center justify-center bg-background text-foreground overflow-hidden">
      <BackgroundBeams className="absolute inset-0 z-0" />
      
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggleButton />
      </div>
      
      {/* Rankly Logo - Top Left */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-logo text-foreground">
            Rankly
          </span>
        </Link>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-4xl relative z-10 px-4 py-4"
      >
        <Card className="overflow-hidden p-0 shadow-lg">
          <CardContent className="grid p-0 md:grid-cols-2 h-[600px]">
            {/* Left Section - View Dashboard (Light Background) */}
            <div className="bg-background  p-6 sm:p-8 flex flex-col justify-center relative">
              {/* Navigation Arrows positioned over the left card */}
              <NavigationArrows 
                previousPath="/onboarding/llm-platforms"
                showNext={false}
              />
              <div className="space-y-6 w-full">
                <div className="text-left">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">
                    View dashboard for detailed insights
                  </h1>
                  <p className="text-sm font-normal leading-[1.4] text-muted-foreground">
                    Open your results with live metrics and opportunities
                  </p>
                </div>
                
                <Button
                  onClick={handleOpenDashboard}
                  disabled={isOpening || dataLoading}
                  className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isOpening
                    ? 'Opening…'
                    : dataLoading
                      ? 'Preparing results…'
                      : 'Open Dashboard'}
                </Button>
                <p className="text-center text-xs font-normal text-muted-foreground">
                  You can always access this from the dashboard later
                </p>
              </div>
            </div>

            {/* Right Section - Results Summary (Dark Background) */}
            <div className="bg-muted p-6 sm:p-8 flex flex-col justify-center">
              {dataLoading ? (
                <div className="space-y-4 w-full">
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
                <div className="bg-background/50 rounded-lg p-4 w-full">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Unable to load metrics</p>
                    <p className="text-xs mt-1">{metricsError}</p>
                  </div>
                </div>
              ) : (
              <div className="space-y-4 w-full">
                  
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

                  {/* Opportunities & Insights Card */}
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="mb-2">
                      <h3 className="text-xs font-medium tracking-wide text-foreground">Opportunities & Insights</h3>
                      <p className="text-xs font-normal leading-[1.4] text-muted-foreground">Key takeaways derived from your current metrics</p>
                    </div>
                    {(() => {
                      // Derive simple insights from available metrics
                      const overall = metricsData?.overall || {}
                      const brand = overall?.brandMetrics?.[0] || {}
                      const totalPrompts = overall?.totalPrompts || metricsData?.metrics?.totalPrompts || 0

                      const whatsWorking: any[] = []
                      const needsAttention: any[] = []

                      if (typeof brand.shareOfVoice === 'number' && brand.shareOfVoice >= 70) {
                        whatsWorking.push({ title: 'Dominant Share of Voice', recommendation: `Your brand commands ${Math.round(brand.shareOfVoice)}% of mentions indicating strong market presence.` })
                      }
                      if (typeof brand.avgPosition === 'number' && brand.avgPosition <= 2) {
                        whatsWorking.push({ title: 'Excellent Average Position', recommendation: `Consistently ranking around #${Math.round(brand.avgPosition)} across prompts.` })
                      }
                      if (typeof brand.citationShare === 'number' && brand.citationShare === 0) {
                        needsAttention.push({ title: 'No Citations Yet', recommendation: 'Improve authority with source-rich content to start earning citations.' })
                      }
                      if (totalPrompts > 0 && totalPrompts < 5) {
                        needsAttention.push({ title: 'Limited Data Volume', recommendation: `Only ${totalPrompts} prompts analyzed. Run more tests for reliable insights.` })
                      }

                      const displayWorking = whatsWorking.slice(0, 3)
                      const displayAttention = needsAttention.slice(0, 3)

                      return (
                        <div className="grid grid-cols-1 gap-4">
                          {displayWorking.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold tracking-wide text-foreground">What's Working</div>
                              <ul className="space-y-2">
                                {displayWorking.map((item: any, idx: number) => (
                                  <li key={`ok-${idx}`} className="text-xs">
                                    <span className="font-medium text-foreground">{item.title}</span>
                                    {item.recommendation && (
                                      <span className="text-muted-foreground"> — {item.recommendation}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {displayAttention.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold tracking-wide text-foreground">Needs Attention</div>
                              <ul className="space-y-2">
                                {displayAttention.map((item: any, idx: number) => (
                                  <li key={`na-${idx}`} className="text-xs">
                                    <span className="font-medium text-foreground">{item.title}</span>
                                    {item.recommendation && (
                                      <span className="text-muted-foreground"> — {item.recommendation}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {displayWorking.length === 0 && displayAttention.length === 0 && (
                            <div className="text-xs text-muted-foreground">Insights will appear here once enough data is available.</div>
                          )}
                        </div>
                      )
                    })()}
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