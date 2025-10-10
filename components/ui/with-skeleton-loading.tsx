'use client'

import React from 'react'
import { useSkeletonLoader } from '@/hooks/useSkeletonLoader'
import { SkeletonWrapper } from './skeleton-wrapper'
import { UnifiedCardSkeleton } from './unified-card-skeleton'

interface WithSkeletonLoadingOptions {
  threshold?: number
  debounceDelay?: number
  skeletonType?: 'metric' | 'chart' | 'table' | 'mixed'
  chartType?: 'bar' | 'line' | 'donut'
  tableColumns?: number
  tableRows?: number
}

/**
 * Higher-order component that automatically adds skeleton loading to any component
 */
export function withSkeletonLoading<T extends object>(
  Component: React.ComponentType<T>,
  options: WithSkeletonLoadingOptions = {}
) {
  const {
    threshold = 300,
    debounceDelay = 250,
    skeletonType = 'mixed',
    chartType = 'bar',
    tableColumns = 4,
    tableRows = 5
  } = options

  return function SkeletonWrappedComponent(props: T & { 
    filterContext?: {
      selectedTopics: string[]
      selectedPersonas: string[]
      selectedPlatforms: string[]
    }
  }) {
    const { filterContext, ...componentProps } = props
    
    // Skeleton loading state
    const [isDataLoading, setIsDataLoading] = React.useState(false)
    const { showSkeleton, isVisible, setLoading } = useSkeletonLoader({
      threshold,
      debounceDelay
    })

    // Simulate data loading when filter context changes
    React.useEffect(() => {
      if (filterContext) {
        setIsDataLoading(true)
        const timer = setTimeout(() => {
          setIsDataLoading(false)
        }, 800) // Simulate 800ms loading time
        
        return () => clearTimeout(timer)
      }
    }, [filterContext])

    React.useEffect(() => {
      setLoading(isDataLoading)
    }, [isDataLoading, setLoading])

    return (
      <SkeletonWrapper
        show={showSkeleton}
        isVisible={isVisible}
        skeleton={
          <UnifiedCardSkeleton 
            type={skeletonType}
            chartType={chartType}
            tableColumns={tableColumns}
            tableRows={tableRows}
          />
        }
      >
        <Component {...(componentProps as T)} />
      </SkeletonWrapper>
    )
  }
}

/**
 * Hook for adding skeleton loading to components manually
 */
export function useSkeletonLoading(
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  },
  options: WithSkeletonLoadingOptions = {}
) {
  const {
    threshold = 300,
    debounceDelay = 250
  } = options

  const [isDataLoading, setIsDataLoading] = React.useState(false)
  const { showSkeleton, isVisible, setLoading } = useSkeletonLoader({
    threshold,
    debounceDelay
  })

  React.useEffect(() => {
    if (filterContext) {
      setIsDataLoading(true)
      const timer = setTimeout(() => {
        setIsDataLoading(false)
      }, 800)
      
      return () => clearTimeout(timer)
    }
  }, [filterContext])

  React.useEffect(() => {
    setLoading(isDataLoading)
  }, [isDataLoading, setLoading])

  return { showSkeleton, isVisible }
}
