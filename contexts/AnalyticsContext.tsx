'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import apiService from '@/services/api'

// Types
export interface AnalyticsData {
  summary: any | null
  visibility: any | null
  prompts: any | null
  sentiment: any | null
  citations: any | null
  competitors: any | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

interface AnalyticsContextType {
  data: AnalyticsData
  refreshData: () => Promise<void>
  setDateRange: (from: string, to: string) => void
  dateFrom: string
  dateTo: string
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [data, setData] = useState<AnalyticsData>({
    summary: null,
    visibility: null,
    prompts: null,
    sentiment: null,
    citations: null,
    competitors: null,
    isLoading: true,
    error: null,
    lastUpdated: null
  })

  const fetchAllAnalytics = async () => {
    // Don't fetch if no token
    if (!apiService.token) {
      setData(prev => ({ ...prev, isLoading: false, error: null }))
      return
    }

    setData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('📊 Fetching analytics data...')

      // Try to fetch dashboard data first (new unified endpoint)
      try {
        const dashboardRes = await apiService.getAnalyticsDashboard({
          dateFrom,
          dateTo
        })

        if (dashboardRes.success && dashboardRes.data) {
          const dashboardData = dashboardRes.data
          
          setData({
            summary: {
              hasData: true,
              totalTests: dashboardData.summary?.totalTests || 0,
              lastUpdated: dashboardData.summary?.lastUpdated || new Date()
            },
            visibility: dashboardData.metrics?.visibility || null,
            prompts: await apiService.getAnalyticsPrompts(dateFrom, dateTo).then(r => r.data).catch(() => null),
            sentiment: dashboardData.metrics?.sentiment || null,
            citations: dashboardData.metrics?.citations || null,
            competitors: null, // Will be calculated from visibility data
            isLoading: false,
            error: null,
            lastUpdated: new Date()
          })

          console.log('✅ Dashboard analytics data fetched successfully')
          return
        }
      } catch (dashboardError) {
        console.log('⚠️ Dashboard endpoint not available, falling back to individual endpoints')
      }

      // Fallback to individual endpoints
      const [
        summaryRes,
        visibilityRes,
        promptsRes,
        sentimentRes,
        citationsRes,
        competitorsRes
      ] = await Promise.allSettled([
        apiService.getAnalyticsSummary(dateFrom, dateTo),
        apiService.getAnalyticsVisibility(dateFrom, dateTo),
        apiService.getAnalyticsPrompts(dateFrom, dateTo),
        apiService.getAnalyticsSentiment(dateFrom, dateTo),
        apiService.getAnalyticsCitations(dateFrom, dateTo),
        apiService.getAnalyticsCompetitors(dateFrom, dateTo)
      ])

      // Check if all requests failed with "no data" errors (expected for new users)
      const allFailed = [summaryRes, visibilityRes, promptsRes, sentimentRes, citationsRes, competitorsRes]
        .every(res => res.status === 'rejected')

      if (allFailed) {
        // No data exists yet - this is expected for new users
        console.log('ℹ️ No analytics data available yet (expected for new users)')
        setData({
          summary: null,
          visibility: null,
          prompts: null,
          sentiment: null,
          citations: null,
          competitors: null,
          isLoading: false,
          error: null, // Don't show error for missing data
          lastUpdated: null
        })
        return
      }

      // Some data exists - show what we have
      setData({
        summary: summaryRes.status === 'fulfilled' ? summaryRes.value.data : null,
        visibility: visibilityRes.status === 'fulfilled' ? visibilityRes.value.data : null,
        prompts: promptsRes.status === 'fulfilled' ? promptsRes.value.data : null,
        sentiment: sentimentRes.status === 'fulfilled' ? sentimentRes.value.data : null,
        citations: citationsRes.status === 'fulfilled' ? citationsRes.value.data : null,
        competitors: competitorsRes.status === 'fulfilled' ? competitorsRes.value.data : null,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })

      console.log('✅ Analytics data fetched successfully')
    } catch (error: any) {
      console.error('❌ Failed to fetch analytics:', error)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: null // Don't show errors to user for missing data
      }))
    }
  }

  useEffect(() => {
    if (apiService.token) {
      fetchAllAnalytics()
    } else {
      // No token - set loading to false
      setData(prev => ({ ...prev, isLoading: false }))
    }
  }, [dateFrom, dateTo])

  const setDateRange = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
  }

  const refreshData = async () => {
    await fetchAllAnalytics()
  }

  return (
    <AnalyticsContext.Provider value={{
      data,
      refreshData,
      setDateRange,
      dateFrom,
      dateTo
    }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}
