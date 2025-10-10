'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Filter, Globe, ChevronDown, Users, Plus } from 'lucide-react'
import { URLSelector } from '@/components/URLSelector'
import { useAnalytics } from '@/contexts/AnalyticsContext'

interface TopNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  const router = useRouter()
  const { setUrlAnalysisId, urlAnalysisId } = useAnalytics()
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['All Platforms'])
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['All Topics'])
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['All Personas'])
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleStartNewAnalysis = () => {
    router.push('/onboarding')
  }
  
  const tabs = [
    { id: 'visibility', label: 'Visibility' },
    { id: 'prompts', label: 'Prompts' },
    { id: 'sentiment', label: 'Sentiment' },
    { id: 'citations', label: 'Citations' },
  ]

  const topicOptions = [
    { value: 'All Topics', label: 'All Topics' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Support', label: 'Support' }
  ]

  const personaOptions = [
    { value: 'All Personas', label: 'All Personas' },
    { value: 'Marketing Manager', label: 'Marketing Manager' },
    { value: 'Sales Rep', label: 'Sales Rep' },
    { value: 'Customer Support', label: 'Customer Support' },
    { value: 'Product Manager', label: 'Product Manager' }
  ]

  const platformOptions = [
    { value: 'All Platforms', label: 'All Platforms' },
    { value: 'ChatGPT', label: 'ChatGPT' },
    { value: 'Claude', label: 'Claude' },
    { value: 'Gemini', label: 'Gemini' },
    { value: 'Perplexity', label: 'Perplexity' }
  ]

  const handleTopicChange = (topic: string, checked: boolean) => {
    if (topic === 'All Topics') {
      setSelectedTopics(checked ? ['All Topics'] : [])
    } else {
      setSelectedTopics(prev => {
        if (checked) {
          // If 'All Topics' was selected, deselect it when another topic is chosen
          const newSelection = prev.filter(p => p !== 'All Topics')
          return [...newSelection, topic]
        } else {
          const newSelection = prev.filter(p => p !== topic)
          // If no other topics are selected, default to 'All Topics'
          return newSelection.length === 0 ? ['All Topics'] : newSelection
        }
      })
    }
  }

  const handlePersonaChange = (persona: string, checked: boolean) => {
    if (persona === 'All Personas') {
      setSelectedPersonas(checked ? ['All Personas'] : [])
    } else {
      setSelectedPersonas(prev => {
        if (checked) {
          // If 'All Personas' was selected, deselect it when another persona is chosen
          const newSelection = prev.filter(p => p !== 'All Personas')
          return [...newSelection, persona]
        } else {
          const newSelection = prev.filter(p => p !== persona)
          // If no other personas are selected, default to 'All Personas'
          return newSelection.length === 0 ? ['All Personas'] : newSelection
        }
      })
    }
  }

  const handlePlatformChange = (platform: string, checked: boolean) => {
    if (platform === 'All Platforms') {
      setSelectedPlatforms(checked ? ['All Platforms'] : [])
    } else {
      setSelectedPlatforms(prev => {
        if (checked) {
          // If 'All Platforms' was selected, deselect it when another platform is chosen
          const newSelection = prev.filter(p => p !== 'All Platforms')
          return [...newSelection, platform]
        } else {
          const newSelection = prev.filter(p => p !== platform)
          // If no other platforms are selected, default to 'All Platforms'
          return newSelection.length === 0 ? ['All Platforms'] : newSelection
        }
      })
    }
  }

  const getTopicButtonText = () => {
    if (selectedTopics.includes('All Topics') || selectedTopics.length === 0) {
      return '# Topics'
    }
    
    // Check if all individual topics are selected (excluding 'All Topics' itself)
    const allIndividualTopicsSelected = topicOptions
      .filter(option => option.value !== 'All Topics')
      .every(option => selectedTopics.includes(option.value));

    if (allIndividualTopicsSelected) {
      return '# Topics';
    }
    
    return `${selectedTopics.length} selected`
  }

  const getPersonaButtonText = () => {
    if (selectedPersonas.includes('All Personas') || selectedPersonas.length === 0) {
      return 'User Personas'
    }
    
    // Check if all individual personas are selected (excluding 'All Personas' itself)
    const allIndividualPersonasSelected = personaOptions
      .filter(option => option.value !== 'All Personas')
      .every(option => selectedPersonas.includes(option.value));

    if (allIndividualPersonasSelected) {
      return 'User Personas';
    }
    
    return `${selectedPersonas.length} selected`
  }

  const getPlatformButtonText = () => {
    if (selectedPlatforms.includes('All Platforms') || selectedPlatforms.length === 0) {
      return 'All Platforms'
    }
    
    // Check if all individual platforms are selected (excluding 'All Platforms' itself)
    const allIndividualPlatformsSelected = platformOptions
      .filter(option => option.value !== 'All Platforms')
      .every(option => selectedPlatforms.includes(option.value));

    if (allIndividualPlatformsSelected) {
      return 'All Platforms';
    }
    
    return `${selectedPlatforms.length} selected`
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="relative">
        <div className="pl-4 pt-4 flex justify-between items-center">
          <div className="flex space-x-0">
            {tabs.map((tab) => (
              <div 
                key={tab.id} 
                className="relative px-4 py-2 body-text rounded-none border-0 bg-transparent text-gray-600"
              >
                {tab.label}
              </div>
            ))}
          </div>
          <div className="flex space-x-3 pr-4">
            <div className="px-3 py-1 text-sm border rounded">New Analysis</div>
            <div className="px-3 py-1 text-sm border rounded"># Topics</div>
            <div className="px-3 py-1 text-sm border rounded">User Personas</div>
            <div className="px-3 py-1 text-sm border rounded">All Platforms</div>
          </div>
        </div>
        <div className="border-b border-gray-200 mt-2"></div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Navigation Tabs and Filter Controls - Same row */}
      <div className="pl-4 pt-4 flex justify-between items-center">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="bg-transparent p-0 h-auto border-0 flex space-x-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative px-4 py-2 body-text rounded-none border-0 bg-transparent hover:text-gray-900 text-gray-600 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 transition-colors"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* URL Selector and Filter controls - Top right */}
        <div className="flex space-x-3 pr-4">
          <URLSelector value={urlAnalysisId || undefined} onChange={setUrlAnalysisId} />
          <Button
            variant="default"
            size="sm"
            className="body-text"
            onClick={handleStartNewAnalysis}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Analysis
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="body-text">
                <Filter className="mr-2 h-4 w-4" />
                {getTopicButtonText()}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
              {topicOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedTopics.includes(option.value)}
                  onCheckedChange={(checked) => handleTopicChange(option.value, checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="body-text">
                <Users className="mr-2 h-4 w-4" />
                {getPersonaButtonText()}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
              {personaOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedPersonas.includes(option.value)}
                  onCheckedChange={(checked) => handlePersonaChange(option.value, checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="body-text">
                <Globe className="mr-2 h-4 w-4" />
                {getPlatformButtonText()}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
              {platformOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedPlatforms.includes(option.value)}
                  onCheckedChange={(checked) => handlePlatformChange(option.value, checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Section Divider - Moved up */}
      <div className="border-b border-gray-200 mt-2"></div>
    </div>
  )
}