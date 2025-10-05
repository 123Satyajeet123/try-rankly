'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Removed recharts import for now to avoid build issues
import { Users, Bot, TrendingUp, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Mock data for the charts
const humanTrafficData = [
  { platform: 'ChatGPT', visits: 1250, percentage: 35 },
  { platform: 'Perplexity', visits: 980, percentage: 28 },
  { platform: 'Gemini', visits: 720, percentage: 20 },
  { platform: 'Claude', visits: 610, percentage: 17 },
]

const agentTrafficData = [
  { platform: 'ChatGPT', visits: 850, percentage: 32 },
  { platform: 'Perplexity', visits: 680, percentage: 26 },
  { platform: 'Gemini', visits: 520, percentage: 20 },
  { platform: 'Claude', visits: 590, percentage: 22 },
]

// Removed unused data arrays for now

interface HumanAIVisitsSectionProps {
  selectedPlatforms: {
    all: boolean
    chatgpt: boolean
    perplexity: boolean
    gemini: boolean
    claude: boolean
  }
}

export function HumanAIVisitsSection({ selectedPlatforms }: HumanAIVisitsSectionProps) {
  const [activeTab, setActiveTab] = useState('human')

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto border-0">
          <TabsTrigger 
            value="human" 
            className="relative px-6 py-3 text-sm font-medium rounded-none border-0 bg-transparent hover:text-gray-900 text-gray-600 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 transition-colors"
          >
            <Users className="mr-2 h-4 w-4" />
            Human AI Visits
          </TabsTrigger>
          <TabsTrigger 
            value="agent" 
            className="relative px-6 py-3 text-sm font-medium rounded-none border-0 bg-transparent hover:text-gray-900 text-gray-600 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 transition-colors"
          >
            <Bot className="mr-2 h-4 w-4" />
            Agent Traffic
          </TabsTrigger>
        </TabsList>

        {/* Human AI Visits Tab */}
        <TabsContent value="human" className="mt-6">
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Human Traffic Across Platforms
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="ml-2 h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Human visitors accessing your content through AI platforms</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">3,560</div>
                  <div className="text-sm text-green-600 flex items-center">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    +12.5% vs last week
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {humanTrafficData.map((item) => (
                  <div key={item.platform} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{item.platform}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-foreground">{item.visits.toLocaleString()}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Traffic Tab */}
        <TabsContent value="agent" className="mt-6">
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center">
                  <Bot className="mr-2 h-5 w-5" />
                  Agent Traffic (Bots/Crawlers)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="ml-2 h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Automated bot and crawler traffic from AI platforms</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">1,920</div>
                  <div className="text-sm text-green-600 flex items-center">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    +8.3% vs last week
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentTrafficData.map((item) => (
                  <div key={item.platform} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{item.platform}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-foreground">{item.visits.toLocaleString()}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
