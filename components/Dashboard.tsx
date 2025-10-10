'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './layout/Sidebar'
import { TopNav } from './layout/TopNav'
import { 
  VisibilityTab, 
  PromptsTab, 
  SentimentTab, 
  CitationsTab
} from './tabs'
import { useFilters } from '@/contexts/FilterContext'
import { useAuth } from '@/contexts/AuthContext'
import { useSkeletonLoader } from '@/hooks/useSkeletonLoader'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { SidebarSkeleton } from '@/components/layout/SidebarSkeleton'
import { TopNavSkeleton } from '@/components/layout/TopNavSkeleton'
import dashboardService from '@/services/dashboardService'
import { DashboardData } from '@/types/dashboard'

interface DashboardProps {
  initialTab?: string
}

export function Dashboard({ initialTab }: DashboardProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState(initialTab || 'visibility')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isPromptBuilderFullScreen, setIsPromptBuilderFullScreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedTopics, selectedPersonas, selectedPlatforms } = useFilters()
  
  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('🚫 [Dashboard] User not authenticated, redirecting to signin')
      router.push('/onboarding/signin')
    }
  }, [isAuthenticated, authLoading, router])
  
  // Global skeleton loading state
  const [isGlobalLoading, setIsGlobalLoading] = useState(false)
  const { showSkeleton: showGlobalSkeleton, isVisible: isGlobalVisible, setLoading: setGlobalLoading } = useSkeletonLoader({
    threshold: 300,
    debounceDelay: 250
  })

  // Load dashboard data on component mount and when filters change
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('🔄 [Dashboard] Loading dashboard data...')
        
        // Clear cache to ensure fresh data for correct user
        dashboardService.clearCache()
        
        const filters = {
          platforms: selectedPlatforms,
          topics: selectedTopics,
          personas: selectedPersonas
        }
        
        const response = await dashboardService.getDashboardData(filters)
        
        if (response.error) {
          setError(response.error)
          console.error('❌ [Dashboard] Error loading data:', response.error)
        } else if (response.data) {
          setDashboardData(response.data)
          console.log('✅ [Dashboard] Data loaded successfully:', response.data)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data'
        setError(errorMessage)
        console.error('❌ [Dashboard] Unexpected error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [selectedTopics, selectedPersonas, selectedPlatforms])

  // Simulate global loading when filters change
  useEffect(() => {
    if (selectedTopics.length > 0 || selectedPersonas.length > 0 || selectedPlatforms.length > 0) {
      setIsGlobalLoading(true)
      const timer = setTimeout(() => {
        setIsGlobalLoading(false)
      }, 1200) // Simulate 1.2s loading time for global state changes
      
      return () => clearTimeout(timer)
    }
  }, [selectedTopics, selectedPersonas, selectedPlatforms])

  useEffect(() => {
    setGlobalLoading(isGlobalLoading)
  }, [isGlobalLoading, setGlobalLoading])

  const handleTogglePromptBuilderFullScreen = (isFullScreen: boolean) => {
    setIsPromptBuilderFullScreen(isFullScreen)
  }

  const handlePlatformChange = (platformId: string, enabled: boolean) => {
    if (enabled) {
      setSelectedPlatforms(prev => [...prev, platformId])
    } else {
      setSelectedPlatforms(prev => prev.filter(id => id !== platformId))
    }
  }

  const handleTopicChange = (topicId: string, enabled: boolean) => {
    if (enabled) {
      setSelectedTopics(prev => [...prev, topicId])
    } else {
      setSelectedTopics(prev => prev.filter(id => id !== topicId))
    }
  }

  const handlePersonaChange = (personaId: string, enabled: boolean) => {
    if (enabled) {
      setSelectedPersonas(prev => [...prev, personaId])
    } else {
      setSelectedPersonas(prev => prev.filter(id => id !== personaId))
    }
  }

  const handleDateRangeChange = (from: Date, to: Date) => {
    // Handle date range change
    console.log('Date range changed:', { from, to })
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <SidebarSkeleton />
          <div className="flex-1">
            <TopNavSkeleton />
            <div className="p-6">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                <div className="text-gray-600">Checking authentication...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // Show loading while fetching dashboard data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <SidebarSkeleton />
          <div className="flex-1">
            <TopNavSkeleton />
            <div className="p-6">
              <div className="space-y-6">
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
                <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <SidebarSkeleton />
          <div className="flex-1">
            <TopNavSkeleton />
            <div className="p-6">
              <div className="text-center py-12">
                <div className="text-red-500 text-lg font-semibold mb-2">
                  Failed to load dashboard data
                </div>
                <div className="text-gray-600 mb-4">{error}</div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show no data state
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1">
            <TopNav />
            <div className="p-6">
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="text-gray-500 text-lg font-semibold mb-2">
                    {error || 'No dashboard data available'}
                  </div>
                  <div className="text-gray-400 mb-4">
                    Please complete the onboarding process to see your analytics
                  </div>
                  <a 
                    href="/onboarding" 
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Start Onboarding
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    const filterContext = {
      selectedTopics,
      selectedPersonas,
      selectedPlatforms
    }

    switch (activeTab) {
      case 'visibility':
        return <VisibilityTab filterContext={filterContext} dashboardData={dashboardData} />
      
      case 'prompts':
        return <PromptsTab onToggleFullScreen={handleTogglePromptBuilderFullScreen} filterContext={filterContext} dashboardData={dashboardData} />
      
      case 'sentiment':
        return <SentimentTab filterContext={filterContext} dashboardData={dashboardData} />
      
      case 'citations':
        return <CitationsTab filterContext={filterContext} dashboardData={dashboardData} />
      
      default:
        return <VisibilityTab filterContext={filterContext} dashboardData={dashboardData} />
    }
  }

  return (
    <div className="flex h-screen bg-background">
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

