'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Search, ChevronUp, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface PageData {
  id: number
  url: string
  humanVisits: number
  agentVisits: number
  humanPercentage: number
  agentPercentage: number
}

const initialPageData: PageData[] = [
  {
    id: 1,
    url: 'https://rankly.com/features/ai-analytics',
    humanVisits: 2340,
    agentVisits: 1560,
    humanPercentage: 60,
    agentPercentage: 40
  },
  {
    id: 2,
    url: 'https://rankly.com/blog/optimizing-for-ai-search',
    humanVisits: 1890,
    agentVisits: 1230,
    humanPercentage: 61,
    agentPercentage: 39
  },
  {
    id: 3,
    url: 'https://rankly.com/pricing',
    humanVisits: 1450,
    agentVisits: 890,
    humanPercentage: 62,
    agentPercentage: 38
  },
  {
    id: 4,
    url: 'https://rankly.com/docs/getting-started',
    humanVisits: 1230,
    agentVisits: 2100,
    humanPercentage: 37,
    agentPercentage: 63
  },
  {
    id: 5,
    url: 'https://rankly.com/api/reference',
    humanVisits: 890,
    agentVisits: 3450,
    humanPercentage: 20,
    agentPercentage: 80
  },
  {
    id: 6,
    url: 'https://rankly.com/integrations',
    humanVisits: 1120,
    agentVisits: 680,
    humanPercentage: 62,
    agentPercentage: 38
  },
  {
    id: 7,
    url: 'https://rankly.com/support/faq',
    humanVisits: 980,
    agentVisits: 1420,
    humanPercentage: 41,
    agentPercentage: 59
  },
  {
    id: 8,
    url: 'https://rankly.com/case-studies',
    humanVisits: 760,
    agentVisits: 590,
    humanPercentage: 56,
    agentPercentage: 44
  },
  {
    id: 9,
    url: 'https://rankly.com/security',
    humanVisits: 650,
    agentVisits: 480,
    humanPercentage: 58,
    agentPercentage: 42
  },
  {
    id: 10,
    url: 'https://rankly.com/company/about',
    humanVisits: 420,
    agentVisits: 290,
    humanPercentage: 59,
    agentPercentage: 41
  },
]

type SortField = 'url' | 'humanVisits' | 'agentVisits' | 'humanPercentage'
type SortDirection = 'asc' | 'desc'

export function TopPagesTable() {
  const [searchTerm, setSearchTerm] = useState('')
  const [pageData, setPageData] = useState<PageData[]>(initialPageData)
  const [sortField, setSortField] = useState<SortField>('humanVisits')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Filter data based on search term
  const filteredData = pageData.filter(page =>
    page.url.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    return 0
  })

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  const truncateUrl = (url: string, maxLength: number = 35) => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />
  }

  return (
    <div className="w-full space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Top Pages by Traffic</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            
            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead 
                    className="text-xs font-medium text-muted-foreground py-2 px-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('url')}
                  >
                    <div className="flex items-center gap-2">
                      Page URL
                      {renderSortIcon('url')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right text-xs font-medium text-muted-foreground py-2 px-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('humanVisits')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Human Visits
                      {renderSortIcon('humanVisits')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right text-xs font-medium text-muted-foreground py-2 px-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('agentVisits')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Agent Visits
                      {renderSortIcon('agentVisits')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-xs font-medium text-muted-foreground py-2 px-3">
                    % Split
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((page) => (
                  <TableRow 
                    key={page.id} 
                    className="border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="py-3 px-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-foreground cursor-help">
                              {truncateUrl(page.url)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm max-w-xs break-all">{page.url}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right py-3 px-3">
                      <span className="text-sm font-medium text-foreground">
                        {page.humanVisits.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3 px-3">
                      <span className="text-sm font-medium text-foreground">
                        {page.agentVisits.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* Human percentage bar */}
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden flex">
                          <div 
                            className="bg-green-500 h-full"
                            style={{ width: `${page.humanPercentage}%` }}
                          />
                          <div 
                            className="bg-purple-500 h-full"
                            style={{ width: `${page.agentPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-left">
                          {page.humanPercentage}% / {page.agentPercentage}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}
