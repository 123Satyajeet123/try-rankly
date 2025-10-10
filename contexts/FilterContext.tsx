'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface FilterContextType {
  selectedTopics: string[]
  selectedPersonas: string[]
  selectedPlatforms: string[]
  setSelectedTopics: React.Dispatch<React.SetStateAction<string[]>>
  setSelectedPersonas: React.Dispatch<React.SetStateAction<string[]>>
  setSelectedPlatforms: React.Dispatch<React.SetStateAction<string[]>>
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['All Topics'])
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['All Personas'])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['All Platforms'])

  return (
    <FilterContext.Provider value={{
      selectedTopics,
      selectedPersonas,
      selectedPlatforms,
      setSelectedTopics,
      setSelectedPersonas,
      setSelectedPlatforms
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
