/**
 * Geo Tab - Geographic Analytics Module
 *
 * Shows country-level traffic performance with choropleth map
 */

'use client'

import React, { useState } from 'react'
import type { Range } from '@/types/traffic'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Info, Expand, X } from 'lucide-react'
import { ChoroplethMap } from '@/components/charts/ChoroplethMap'
import { GeoDeviceSkeleton } from '@/components/ui/geo-device-skeleton'

interface GeoTabProps {
  range: Range
  realGeoData?: any
  dateRange?: string
  isLoading?: boolean
}

export function GeoTab({ range, realGeoData, dateRange = '30 days', isLoading = false }: GeoTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // If no real data, show skeleton loading state
  if (!realGeoData || !realGeoData.data?.countries || realGeoData.data.countries.length === 0) {
    return <GeoDeviceSkeleton />
  }

  const countries = realGeoData.data?.countries || []
  const totalSessions = realGeoData.data?.totalSessions || 0
  const topCountries = countries.slice(0, 10)

  // Calculate LLM platform breakdown from country data
  const platformBreakdown = realGeoData.data?.platformBreakdown || []

  return (
    <div>
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">LLM Geographic Performance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  LLM traffic metrics by country
                </p>
              </div>
              
              {/* Spacer */}
              <div className="flex-1"></div>
              
              <div className="flex items-center gap-4">
                {/* Platform Breakdown */}
                {platformBreakdown.length > 0 && (
                  <div className="flex items-center gap-3">
                    {platformBreakdown.map((platform: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <img 
                          src={platform.favicon} 
                          alt={platform.name}
                          className="w-6 h-6 rounded object-contain"
                          title={platform.name}
                          onError={(e) => {
                            // Fallback to a generic icon if favicon fails to load
                            if (platform.name === 'Perplexity') {
                              // Use a specific fallback for Perplexity with orange background
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3E%3Ccircle cx="12" cy="12" r="10" fill="%23ff6b35"/%3E%3Ctext x="12" y="16" font-size="12" text-anchor="middle" fill="white" font-weight="bold"%3EP%3C/text%3E%3C/svg%3E'
                            } else {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3E%3Ctext x="12" y="16" font-size="16" text-anchor="middle" fill="%236366f1"%3E{platform.name[0]}%3C/text%3E%3C/svg%3E'
                            }
                          }}
                        />
                        <span className="text-sm font-semibold text-foreground">{platform.sessions}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground">
                  Total Sessions <span className="text-lg font-semibold text-foreground ml-1">{totalSessions}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Countries <span className="text-lg font-semibold text-foreground ml-1">{countries.length}</span>
                </div>
              </div>
            </div>

            {/* Main Content - 3/4 Choropleth + 1/4 Countries List */}
            <div className="grid grid-cols-4 gap-2">
              {/* Choropleth Map - 3/4 width */}
              <div className="col-span-3">
                <div className="border rounded-lg overflow-hidden">
                  <ChoroplethMap countries={countries} totalSessions={totalSessions} />
                </div>
              </div>

              {/* Countries List - 1/4 width */}
              <div className="col-span-1">
                <div className="border rounded-lg p-4 h-[500px] flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-foreground">Top Countries</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsModalOpen(true)}
                      className="h-8 px-2"
                    >
                      <Expand className="h-3 w-3 mr-1" />
                      Expand
                    </Button>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {topCountries.map((country: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {country.country}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {country.sessions} sessions ({country.percentage.toFixed(1)}%)
                          </div>
                        </div>
                        <div className="w-16 h-2 bg-muted rounded-full ml-2">
                          <div 
                            className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${(country.sessions / topCountries[0]?.sessions) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Modal for All Countries - Only shows table, no map */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col border-2 shadow-2xl z-[9999]">
                    <DialogHeader className="border-b pb-4">
                      <DialogTitle className="text-xl font-semibold">All Countries - LLM Geographic Performance</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="space-y-2">
                        {countries.map((country: any, index: number) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-semibold text-xs">
                                  {index + 1}
                                </div>
                                <div className="text-sm font-medium">
                                  {country.country}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground ml-8">
                                {country.sessions} sessions ({country.percentage.toFixed(1)}%)
                              </div>
                            </div>
                            <div className="w-16 h-2 bg-muted rounded-full ml-2">
                              <div
                                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${(country.sessions / countries[0]?.sessions) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
