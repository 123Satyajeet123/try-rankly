'use client'

import { useState } from 'react'
import { Sidebar } from './layout/Sidebar'
import { TopNav } from './layout/TopNav'
import { 
  VisibilityTab, 
  PromptsTab, 
  SentimentTab, 
  CitationsTab
} from './tabs'
import { mockDashboardData } from '@/data/mockData'

interface DashboardProps {
  initialTab?: string
}

export function Dashboard({ initialTab }: DashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab || 'visibility')
  const [dashboardData, setDashboardData] = useState(mockDashboardData)
  const [isPromptBuilderFullScreen, setIsPromptBuilderFullScreen] = useState(false)

  const handleTogglePromptBuilderFullScreen = (isFullScreen: boolean) => {
    setIsPromptBuilderFullScreen(isFullScreen)
  }

  const handlePlatformChange = (platformId: string, enabled: boolean) => {
    setDashboardData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        platforms: prev.filters.platforms.map(p => 
          p.id === platformId ? { ...p, enabled } : p
        )
      }
    }))
  }

  const handleTopicChange = (topicId: string, enabled: boolean) => {
    setDashboardData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        topics: prev.filters.topics.map(t => 
          t.id === topicId ? { ...t, enabled } : t
        )
      }
    }))
  }

  const handlePersonaChange = (personaId: string, enabled: boolean) => {
    setDashboardData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        personas: prev.filters.personas.map(p => 
          p.id === personaId ? { ...p, enabled } : p
        )
      }
    }))
  }

  const handleDateRangeChange = (from: Date, to: Date) => {
    // Handle date range change
    console.log('Date range changed:', { from, to })
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

