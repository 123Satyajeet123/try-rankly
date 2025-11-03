'use client'

import { useState, useEffect } from 'react'
import { PlatformsTab } from '@/components/agent-analytics/platforms/PlatformsTab'
import { PagesTab } from '@/components/agent-analytics/pages/PagesTab'
import { GeoTab } from '@/components/agent-analytics/geo-device/GeoTab'
import { DeviceTab } from '@/components/agent-analytics/geo-device/DeviceTab'
import { JourneyTab } from '@/components/agent-analytics/journey/JourneyTab'
import { getLLMPlatforms, getPlatformSplit, getPages, getGeo, getDevices, getDateRange, getConversionEvents } from '@/services/ga4Api'
import { toast } from 'sonner'

interface GA4AgentAnalyticsTabProps {
  activeTab?: string
  selectedDateRange?: string
  onTabChange?: (tab: string) => void
  onDateRangeChange?: (range: string) => void
  refreshTrigger?: number
}

export function GA4AgentAnalyticsTab({ 
  activeTab: externalActiveTab = 'platform',
  selectedDateRange: externalDateRange = '7 days',
  onTabChange,
  onDateRangeChange,
  refreshTrigger = 0
}: GA4AgentAnalyticsTabProps) {
  const [activeTab, setActiveTab] = useState(externalActiveTab)
  const [realLLMData, setRealLLMData] = useState<any>(null)
  const [realPlatformData, setRealPlatformData] = useState<any>(null)
  const [realPagesData, setRealPagesData] = useState<any>(null)
  const [realGeoData, setRealGeoData] = useState<any>(null)
  const [realDeviceData, setRealDeviceData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState(externalDateRange)
  const [selectedConversionEvent, setSelectedConversionEvent] = useState('conversions')

  // Sync external activeTab with internal state
  useEffect(() => {
    setActiveTab(externalActiveTab)
  }, [externalActiveTab])

  // Sync external dateRange with internal state
  useEffect(() => {
    setSelectedDateRange(externalDateRange)
  }, [externalDateRange])

  // Fetch data when tab/date range/conversion event changes
  // Use a cache key to avoid refetching when switching tabs
  const getCacheKey = (tab: string, dateRange: string, conversionEvent: string) => {
    return `${tab}_${dateRange}_${conversionEvent}`
  }

  // Track which data has been fetched
  const [fetchedCacheKeys, setFetchedCacheKeys] = useState<Set<string>>(new Set())

  // Fetch data when tab/date range/conversion event changes
  useEffect(() => {
    const cacheKey = getCacheKey(activeTab, selectedDateRange, selectedConversionEvent)
    
    // Only fetch if we don't have this data cached yet
    if (!fetchedCacheKeys.has(cacheKey)) {
      console.log('🔄 [GA4AgentAnalyticsTab] Fetching data for cache key:', cacheKey)
      fetchGA4Data() // This sets isLoadingData inside
      setFetchedCacheKeys(prev => new Set([...prev, cacheKey]))
    } else {
      console.log('✅ [GA4AgentAnalyticsTab] Using cached data for:', cacheKey)
      // Don't show loading state for cached data
      setIsLoadingData(false)
    }
  }, [activeTab, selectedDateRange, selectedConversionEvent])

  // Fetch fresh data when refresh trigger changes (sync now button)
  // This clears cache and forces fresh fetch
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Refresh triggered, clearing cache and fetching fresh data...')
      setFetchedCacheKeys(new Set()) // Clear all cached keys
      fetchGA4Data()
      // Mark current cache key as fetched after refresh
      const cacheKey = getCacheKey(activeTab, selectedDateRange, selectedConversionEvent)
      setFetchedCacheKeys(prev => new Set([...prev, cacheKey]))
    }
  }, [refreshTrigger])

  const fetchGA4Data = async () => {
    setIsLoadingData(true)
    try {
      // Parse date range string to number
      const days = parseInt(selectedDateRange.split(' ')[0])
      const { startDate, endDate } = getDateRange(days)
      
      console.log('🔄 Fetching GA4 data for date range:', { startDate, endDate, activeTab })
      
      // Fetch based on active tab
      if (activeTab === 'platform') {
        const [platformSplitResponse, llmPlatformsResponse] = await Promise.all([
          getPlatformSplit(startDate, endDate, selectedDateRange, selectedConversionEvent),
          getLLMPlatforms(startDate, endDate, selectedDateRange, selectedConversionEvent)
        ])

        console.log('📊 Platform data received:', {
          platformSplitSuccess: platformSplitResponse.success,
          platformSplitData: platformSplitResponse.data,
          llmPlatformsSuccess: llmPlatformsResponse.success,
          llmPlatformsData: llmPlatformsResponse.data
        })

        // Check for errors
        if (!platformSplitResponse.success) {
          console.error('❌ Platform split API failed:', platformSplitResponse.error)
          toast.error('Failed to fetch platform data')
          setIsLoadingData(false)
          return
        }

        if (!llmPlatformsResponse.success) {
          console.error('❌ LLM platforms API failed:', llmPlatformsResponse.error)
          toast.error('Failed to fetch LLM platforms data')
          setIsLoadingData(false)
          return
        }

        // Backend already transforms the data, so use it directly
        const platformSplitData = {
          data: {
            platformSplit: platformSplitResponse.data?.platformSplit || [],
            rankings: platformSplitResponse.data?.rankings || [],
            performanceData: platformSplitResponse.data?.performanceData || [],
            totalSessions: platformSplitResponse.data?.totalSessions || 0,
            summary: platformSplitResponse.data?.summary || {}
          }
        }
        
        const llmPlatformsData = {
          data: {
            platforms: llmPlatformsResponse.data?.platforms || [],
            llmSummary: llmPlatformsResponse.data?.summary || {},
            llmPerformanceData: llmPlatformsResponse.data?.performanceData || []
          }
        }
        
        console.log('✅ Using backend-transformed data:', {
          platformSplitData,
          llmPlatformsData,
          platformSplitCount: platformSplitData.data.platformSplit.length,
          llmPlatformsCount: llmPlatformsData.data.platforms.length,
          llmPerformanceDataCount: llmPlatformsData.data.llmPerformanceData.length
        })
        
        // Set both data structures
        setRealPlatformData(platformSplitData)
        setRealLLMData(llmPlatformsData)
      }

      if (activeTab === 'pages') {
        const pagesResponse = await getPages(startDate, endDate, 100, selectedDateRange, selectedConversionEvent)
        console.log('📄 Pages data received:', pagesResponse)
        if (pagesResponse.success) {
          setRealPagesData(pagesResponse)
        }
      }

      if (activeTab === 'geo-device') {
        const [geoResponse, deviceResponse] = await Promise.all([
          getGeo(startDate, endDate, selectedDateRange),
          getDevices(startDate, endDate, selectedDateRange, selectedConversionEvent)
        ])
        console.log('🌍 Geo data received:', geoResponse)
        console.log('📱 Device data received:', deviceResponse)
        if (geoResponse.success) {
          setRealGeoData(geoResponse)
        }
        if (deviceResponse.success) {
          setRealDeviceData(deviceResponse)
        }
      }

      if (activeTab === 'journey') {
        const pagesResponse = await getPages(startDate, endDate, 100, selectedDateRange, selectedConversionEvent)
        console.log('📄 Journey data received:', pagesResponse)
        if (pagesResponse.success) {
          setRealPagesData(pagesResponse)
        }
      }
    } catch (error) {
      console.error('Error fetching GA4 data:', error)
      toast.error('Failed to fetch GA4 data')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleDateRangeChange = (range: string) => {
    setSelectedDateRange(range)
    onDateRangeChange?.(range)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  const renderTabContent = () => {
    const range = {
      from: new Date(Date.now() - parseInt(selectedDateRange) * 24 * 60 * 60 * 1000),
      to: new Date()
    }

    switch (activeTab) {
      case 'platform':
        return (
          <PlatformsTab
            range={range}
            realLLMData={realLLMData}
            realPlatformData={realPlatformData}
            dateRange={selectedDateRange}
            isLoading={isLoadingData}
            selectedConversionEvent={selectedConversionEvent}
            onConversionEventChange={setSelectedConversionEvent}
          />
        )
      case 'pages':
        return (
          <PagesTab
            range={range}
            realPagesData={realPagesData}
            dateRange={selectedDateRange}
            isLoading={isLoadingData}
            selectedConversionEvent={selectedConversionEvent}
            onConversionEventChange={setSelectedConversionEvent}
          />
        )
      case 'journey':
        return (
          <JourneyTab
            range={range}
            realJourneyData={realPagesData}
            dateRange={selectedDateRange}
            isLoading={isLoadingData}
          />
        )
      case 'geo-device':
        return (
          <div className="space-y-6">
            <GeoTab
              range={range}
              realGeoData={realGeoData}
              dateRange={selectedDateRange}
              isLoading={isLoadingData}
            />
            <DeviceTab
              range={range}
              realDeviceData={realDeviceData}
              dateRange={selectedDateRange}
              isLoading={isLoadingData}
              selectedConversionEvent={selectedConversionEvent}
              onConversionEventChange={setSelectedConversionEvent}
            />
          </div>
        )
      default:
        return null
    }
  }

  return renderTabContent()
}

