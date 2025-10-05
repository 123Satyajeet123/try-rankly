'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { 
  Info, 
  ChevronDown,
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Mock data for sentiment trend
const sentimentTrendData = [
  { date: '24 Sept', positive: 64.2, negative: 35.8 },
  { date: '25 Sept', positive: 54.8, negative: 45.2 },
  { date: '26 Sept', positive: 63.1, negative: 36.9 },
]

// Mock data for sentiment highlights
const sentimentHighlights = {
  positive: [
    {
      id: 1,
      label: 'AI-Powered Personalization, Strong Personalization Capabilities, Cost Efficiency',
      frequency: 61.2,
    }
  ],
  negative: [
    {
      id: 2,
      label: 'Limited Integration Options, Complex Setup Process, High Learning Curve',
      frequency: 38.8,
    }
  ]
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.dataKey === 'positive' ? 'Positive' : 'Negative'}: {entry.value}%
          </p>
        ))}
      </div>
    )
  }
  return null
}

function SentimentAnalysisSection() {
  const [selectedSentiment, setSelectedSentiment] = useState<'positive' | 'negative'>('positive')
  const [currentPeriod, setCurrentPeriod] = useState(false)

  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Sentiment Analysis</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">How positively AI responses reference your brand</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-sm">
              Chart Config
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Line Chart</DropdownMenuItem>
            <DropdownMenuItem>Bar Chart</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <p className="text-sm text-muted-foreground">
        How positively AI responses reference your brand and sentiment trends over time.
      </p>

      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Trend Chart */}
            <div className="space-y-4">
              {/* Chart Header */}
              <div className="flex items-center justify-between">
                <Select value={selectedSentiment} onValueChange={(value: 'positive' | 'negative') => setSelectedSentiment(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive Sentiment</SelectItem>
                    <SelectItem value="negative">Negative Sentiment</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="current-period"
                    checked={currentPeriod}
                    onCheckedChange={setCurrentPeriod}
                  />
                  <label htmlFor="current-period" className="text-sm font-medium text-foreground">
                    Current Period
                  </label>
                </div>
              </div>

              {/* Current Value Display */}
              <div className="text-3xl font-bold text-foreground">
                {selectedSentiment === 'positive' ? '61.2%' : '38.8%'}
              </div>

              {/* Line Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sentimentTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={selectedSentiment === 'positive' ? [50, 70] : [30, 50]}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey={selectedSentiment}
                      stroke={selectedSentiment === 'positive' ? '#10B981' : '#EF4444'}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Side - Sentiment Summary */}
            <div className="space-y-4">
              <div className="space-y-4">
                {/* Positive Sentiment Card */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">61.2% Positive</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    Key positive impressions from AI responses
                  </p>
                  {sentimentHighlights.positive.map((highlight) => (
                    <div key={highlight.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700 mb-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">🟢 {highlight.label}</span>
                      <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        {highlight.frequency}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Negative Sentiment Card */}
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">38.8% Negative</span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                    Areas of concern or confusion mentioned
                  </p>
                  {sentimentHighlights.negative.map((highlight) => (
                    <div key={highlight.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-700 mb-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">🔴 {highlight.label}</span>
                      <span className="text-xs bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-1 rounded">
                        {highlight.frequency}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Horizontal Sentiment Distribution Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>38.8%</span>
                    <span>61.2%</span>
                  </div>
                  <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-400 flex items-center justify-center text-white text-sm font-medium"
                      style={{ width: '38.8%' }}
                    >
                      38.8%
                    </div>
                    <div 
                      className="bg-green-400 flex items-center justify-center text-white text-sm font-medium"
                      style={{ width: '61.2%' }}
                    >
                      61.2%
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>38.8%</span>
                    <span>61.2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

export { SentimentAnalysisSection }
