'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Sidebar } from './layout/Sidebar'
import { TopNav } from './layout/TopNav'
import {
  VisibilityTab,
  PromptsTab,
  SentimentTab,
  CitationsTab
} from './tabs'
import apiService from '@/services/api'
import { Card, CardContent } from './ui/card'
import { useAnalytics } from '@/contexts/AnalyticsContext'

interface DashboardProps {
  initialTab?: string
}

export function Dashboard({ initialTab }: DashboardProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshData, setDateRange } = useAnalytics()
  const [activeTab, setActiveTab] = useState(initialTab || 'visibility')
  const [isPromptBuilderFullScreen, setIsPromptBuilderFullScreen] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testingStatus, setTestingStatus] = useState<string>('')
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Handle startTesting query parameter
  useEffect(() => {
    const startTesting = searchParams?.get('startTesting')

    if (startTesting === 'true' && !isTesting) {
      handleStartTesting()
    }
  }, [searchParams])

  const handleStartTesting = async () => {
    setIsTesting(true)
    setTestingStatus('Testing prompts across 4 LLM platforms...')

    try {
      console.log('🧪 Starting prompt testing...')

      // Test prompts across all LLMs
      const testResponse = await apiService.testPrompts()

      if (testResponse.success) {
        console.log('✅ Prompt testing completed:', testResponse.data)
        setTestingStatus('Calculating metrics...')

        // Calculate metrics from test results
        const metricsResponse = await apiService.calculateMetrics()

        if (metricsResponse.success) {
          console.log('✅ Metrics calculated successfully')
          setTestingStatus('Loading dashboard data...')

          // Refresh analytics data
          await refreshData()

          setTestingStatus('Analysis complete!')

          // Wait a moment then clear the status
          setTimeout(() => {
            setIsTesting(false)
            setTestingStatus('')

            // Remove query parameter from URL
            router.replace('/dashboard')
          }, 2000)
        } else {
          throw new Error(metricsResponse.message || 'Metrics calculation failed')
        }
      } else {
        throw new Error(testResponse.message || 'Prompt testing failed')
      }

    } catch (error: any) {
      console.error('❌ Testing/metrics error:', error)
      setTestingStatus(`Error: ${error.message}`)

      setTimeout(() => {
        setIsTesting(false)
        setTestingStatus('')
      }, 3000)
    }
  }

  const handleTogglePromptBuilderFullScreen = (isFullScreen: boolean) => {
    setIsPromptBuilderFullScreen(isFullScreen)
  }

  const handlePlatformChange = (platformId: string, enabled: boolean) => {
    // Filter changes are handled by TopNav - just refresh data
    refreshData()
  }

  const handleTopicChange = (topicId: string, enabled: boolean) => {
    // Filter changes are handled by TopNav - just refresh data
    refreshData()
  }

  const handlePersonaChange = (personaId: string, enabled: boolean) => {
    // Filter changes are handled by TopNav - just refresh data
    refreshData()
  }

  const handleDateRangeChange = (from: Date, to: Date) => {
    // Handle date range change
    console.log('Date range changed:', { from, to })
    
    // Update date range in analytics context
    setDateRange(from.toISOString(), to.toISOString())
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'visibility':
        return <VisibilityTab />
      
      case 'prompts':
        return <PromptsTab onToggleFullScreen={handleTogglePromptBuilderFullScreen} />
      
      case 'sentiment':
        return <SentimentTab />
      
      case 'citations':
        return <CitationsTab />
      
      default:
        return null
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="flex h-screen bg-background relative">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="pl-4 pt-4 flex justify-between items-center">
            <div className="flex space-x-0">
              <div className="relative px-4 py-2 text-sm rounded-none border-0 bg-transparent text-gray-600">Visibility</div>
              <div className="relative px-4 py-2 text-sm rounded-none border-0 bg-transparent text-gray-600">Prompts</div>
              <div className="relative px-4 py-2 text-sm rounded-none border-0 bg-transparent text-gray-600">Sentiment</div>
              <div className="relative px-4 py-2 text-sm rounded-none border-0 bg-transparent text-gray-600">Citations</div>
            </div>
            <div className="flex space-x-3 pr-4">
              <div className="px-3 py-1 text-sm border rounded"># Topics</div>
              <div className="px-3 py-1 text-sm border rounded">User Personas</div>
              <div className="px-3 py-1 text-sm border rounded">All Platforms</div>
            </div>
          </div>
          <div className="border-b border-gray-200 mt-2"></div>
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-neutral-950">
            <div className="px-2 py-4">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full border-4 border-transparent w-12 h-12 border-t-blue-500 border-r-blue-500"></div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Loading dashboard...</h3>
                      <p className="text-sm text-gray-500">Initializing components</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background relative">
      {/* Testing Overlay */}
      {isTesting && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="animate-spin rounded-full border-4 border-transparent"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderTopColor: 'hsl(var(--primary))',
                    borderRightColor: 'hsl(var(--primary))',
                    borderWidth: '4px'
                  }}
                />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {testingStatus}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This may take a few moments...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sidebar - hidden when Prompt Builder is full screen */}
      {!isPromptBuilderFullScreen && (
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation - hidden when Prompt Builder is full screen */}
        {!isPromptBuilderFullScreen && (
          <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
        )}

        {/* Content Area */}
        <main className={`flex-1 overflow-auto ${isPromptBuilderFullScreen ? 'bg-background' : 'bg-gray-50 dark:bg-neutral-950'}`}>
          <div className={isPromptBuilderFullScreen ? '' : 'px-2 py-4'}>
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

