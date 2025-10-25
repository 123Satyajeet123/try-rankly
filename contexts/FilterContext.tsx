'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface FilterContextType {
  selectedTopics: string[]
  selectedPersonas: string[]
  selectedPlatforms: string[]
  selectedAnalysisId: string | null
  setSelectedTopics: React.Dispatch<React.SetStateAction<string[]>>
  setSelectedPersonas: React.Dispatch<React.SetStateAction<string[]>>
  setSelectedPlatforms: React.Dispatch<React.SetStateAction<string[]>>
  setSelectedAnalysisId: React.Dispatch<React.SetStateAction<string | null>>
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['All Topics'])
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['All Personas'])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['All Platforms'])
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)

  // Debug logging for selectedAnalysisId changes
  useEffect(() => {
    console.log('🔍 [FilterContext] selectedAnalysisId changed to:', selectedAnalysisId)
  }, [selectedAnalysisId])

  return (
    <FilterContext.Provider value={{
      selectedTopics,
      selectedPersonas,
      selectedPlatforms,
      selectedAnalysisId,
      setSelectedTopics,
      setSelectedPersonas,
      setSelectedPlatforms,
      setSelectedAnalysisId
    }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}
