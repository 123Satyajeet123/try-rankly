'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { 
  Info, 
  Settings, 
  ChevronDown,
  TrendingUp,
  TrendingDown,
  ExternalLink
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Mock data for citation share trend
const citationShareData = [
  { date: '24 Sept', share: 4.1 },
  { date: '25 Sept', share: 8.2 },
  { date: '26 Sept', share: 12.2 },
  { date: '27 Sept', share: 10.8 },
  { date: '28 Sept', share: 14.5 },
  { date: '29 Sept', share: 13.2 },
  { date: '30 Sept', share: 7.4 },
]

// Mock data for domain rankings
const domainRankings = [
  { domain: 'Company 1', share: 10.8, icon: '🔵', change: '+1.2%' },
  { domain: 'Company 2', share: 7.4, icon: '🎯', change: '+7.4%', isSelected: true },
  { domain: 'Company 3', share: 6.8, icon: '🔴', change: '-0.8%' },
  { domain: 'Company 4', share: 5.4, icon: '🟣', change: '+0.3%' },
  { domain: 'Company 5', share: 4.7, icon: '🟢', change: '-1.1%' },
]

function CitationShareSection() {
  const [currentPeriod, setCurrentPeriod] = useState(true)
  const [timeRange, setTimeRange] = useState('Last 3 Days')
  const [frequency, setFrequency] = useState('Daily')

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-blue-600">
            Citation Share: {payload[0].value}%
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Citation Share</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Citation share over time and domain rankings for your brand.
          </p>
        </div>
        
        {/* Chart Config Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-sm">
              <Settings className="mr-2 h-4 w-4" />
              Chart Config
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Line Chart</DropdownMenuItem>
            <DropdownMenuItem>Bar Chart</DropdownMenuItem>
            <DropdownMenuItem>Area Chart</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="space-y-4">
            {/* Control Bar */}
            <div className="flex items-center gap-4">
              {/* Time Range Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {timeRange}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setTimeRange('Last 3 Days')}>
                    Last 3 Days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeRange('Last 7 Days')}>
                    Last 7 Days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeRange('Last 30 Days')}>
                    Last 30 Days
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Frequency Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {frequency}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFrequency('Daily')}>
                    Daily
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFrequency('Weekly')}>
                    Weekly
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFrequency('Monthly')}>
                    Monthly
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

        {/* Container with full-height divider */}
        <div className="relative">
          {/* Full-height vertical divider touching top and bottom */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60 transform -translate-x-1/2"></div>
          
          <div className="grid grid-cols-2 gap-8">
          {/* Left Section: Citation Share Chart */}
          <div className="space-y-6">
            {/* Title and Score Display */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Citation Share</h3>
              <div className="text-2xl font-bold text-foreground">8.2%</div>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={citationShareData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    domain={[0, 20]}
                  />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="share" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Current Period Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current Period</span>
              <Switch 
                checked={currentPeriod} 
                onCheckedChange={setCurrentPeriod}
              />
            </div>
          </div>

          {/* Right Section: Citation Rank Table */}
          <div className="space-y-6 pl-8">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Citation Rank</h3>
              <div className="text-2xl font-bold text-foreground">#2</div>
            </div>

            {/* Simple Table */}
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="text-xs font-medium text-muted-foreground py-2 px-3">
                      Domain
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground py-2 px-3">
                      Citation Share
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domainRankings.map((item, index) => (
                    <TableRow 
                      key={index} 
                      className="border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <span className="text-lg">{item.icon}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${item.isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {item.domain}
                            </span>
                            {item.isSelected && (
                              <Badge variant="outline" className="text-xs h-5 px-2 border-primary text-primary bg-primary/10">
                                Owned
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 px-3">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-medium text-foreground">{item.share}%</span>
                          <div className={`flex items-center gap-1 text-xs ${
                            item.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.change.startsWith('+') ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span>{item.change}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Expand Button */}
            <div className="flex justify-end pt-2">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-6 px-2">
                Expand
              </Button>
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

export { CitationShareSection }
