'use client'

import { useEffect, useRef, useState } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { generateUniqueEndpointsSankeyData } from '@/lib/utils/sankey-generator'
import { JourneySkeleton } from '@/components/ui/journey-skeleton'

interface JourneyTabProps {
  range: { from: Date; to: Date }
  realJourneyData: any
  dateRange?: string
  isLoading?: boolean
}

interface PageData {
  pagePath?: string
  pageTitle?: string
  title?: string
  platform: string
  sessions: number
  provider?: string
}

// Strong deterministic classifier that merges sub-paths intelligently
const classifyPage = (pagePath?: string, pageTitle?: string): string => {
  if (!pagePath && !pageTitle) return '/other';

  // Normalize the path
  const rawPath = (pagePath || '').toLowerCase().split(/[?#]/)[0].trim();
  const normalizedPath = rawPath.replace(/\/+$/, '') || '/'; // remove trailing slash, default to "/"
  const title = (pageTitle || '').toLowerCase();

  // Split and extract first directory
  const parts = normalizedPath.split('/').filter(Boolean);
  const firstSegment = parts.length > 0 ? `/${parts[0]}` : '/';

  console.log('🔍 classifyPage input', { pagePath, normalizedPath, firstSegment });
  console.log('🔄 [classifyPage] Using NEW classification logic - v2.0');

  // 1️⃣ Product / Tools
  if (
    firstSegment === '/tools' ||
    firstSegment.startsWith('/tool') ||
    normalizedPath.includes('feature') ||
    normalizedPath.includes('product') ||
    normalizedPath.includes('solution') ||
    title.includes('tool') ||
    title.includes('generator')
  ) return '/tools';

  // 2️⃣ Blog / Content
  if (
    firstSegment === '/blog' ||
    firstSegment.startsWith('/article') ||
    firstSegment.startsWith('/post') ||
    normalizedPath.includes('/insights') ||
    title.includes('blog') ||
    title.includes('insight')
  ) return '/blog';

  // 3️⃣ Docs / API
  if (
    firstSegment === '/docs' ||
    firstSegment === '/doc' ||
    firstSegment === '/api' ||
    firstSegment === '/support' ||
    normalizedPath.includes('/help') ||
    title.includes('api') ||
    title.includes('docs')
  ) return '/docs';

  // 4️⃣ Pricing / Plans
  if (
    firstSegment === '/pricing' ||
    normalizedPath.includes('/plan') ||
    normalizedPath.includes('/billing') ||
    normalizedPath.includes('/checkout') ||
    title.includes('pricing')
  ) return '/pricing';

  // 5️⃣ About / Team / Company
  if (
    firstSegment === '/about' ||
    firstSegment === '/company' ||
    firstSegment === '/team' ||
    normalizedPath.includes('/career') ||
    title.includes('about') ||
    title.includes('team')
  ) return '/about';

  // 6️⃣ Conversion / Optimization
  if (
    firstSegment.startsWith('/conversion') ||
    normalizedPath.includes('optimiz') ||
    title.includes('conversion') ||
    title.includes('optimiz')
  ) return '/conversion';

  // 7️⃣ Landing / Home (moved to end)
  if (
    normalizedPath === '/' ||
    normalizedPath === '/index.html' ||
    firstSegment.startsWith('/home') ||
    firstSegment.startsWith('/landing') ||
    title.includes('home') ||
    title.includes('landing')
  ) return '/landing-page';

  // 8️⃣ Default
  return '/other';
};

// Declare window types for Google Charts
declare global {
  interface Window {
    google: any
  }
}

export function JourneyTab({ range, realJourneyData, dateRange = '7 days', isLoading = false }: JourneyTabProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartRef2 = useRef<HTMLDivElement>(null)
  const rootRef = useRef<any>(null)
  const rootRef2 = useRef<any>(null)
  const [pagesData, setPagesData] = useState<PageData[]>([])
  const [sankeyData, setSankeyData] = useState<any[]>([])
  const [platformBreakdown, setPlatformBreakdown] = useState<Map<string, Array<{page: string, sessions: number}>>>(new Map())
  
  // Fetch pages data for LLM to Page journey
  useEffect(() => {
    // Clear any cached data to force fresh classification
    setSankeyData([])
    setPagesData([])
    setPlatformBreakdown(new Map())
    
    const processPagesData = async () => {
      console.log('🔍 [JourneyTab] Processing pages data...', {
        hasRealJourneyData: !!realJourneyData,
        realJourneyData: realJourneyData,
        hasSuccess: realJourneyData?.success,
        hasData: !!realJourneyData?.data,
        hasPages: !!realJourneyData?.data?.pages,
        pagesLength: realJourneyData?.data?.pages?.length
      })
      
      // Use realJourneyData if available, otherwise fetch from API
      if (realJourneyData && realJourneyData.success && realJourneyData.data?.pages) {
        console.log('📄 [JourneyTab] Using real journey data:', realJourneyData)
        const result = realJourneyData
        
        if (result.success && result.data?.pages) {
          setPagesData(result.data.pages)
          
          // Transform pages data into Sankey format
          const sankeyLinks: any[] = []
          const platformMap = new Map()
          const pageMap = new Map()
          
        // Process each page and create links with classification
        console.log('🤖 [JourneyTab] Starting classification for', result.data.pages.length, 'pages...')
        console.log('🔄 [JourneyTab] Using NEW classification logic at:', new Date().toISOString())
        
        // Use the new deterministic classifier
        const classificationResults = result.data.pages.map((page: PageData, index: number) => {
          const platform = page.provider || page.platform || 'LLM Traffic'
          
          console.log(`🤖 [JourneyTab] Classifying page ${index + 1}/${result.data.pages.length}:`, {
            pagePath: page.pagePath,
            pageTitle: page.pageTitle,
            title: page.title,
            platform
          })
          
          // Use the new deterministic classifier
          const pageCategory = classifyPage(page.pagePath, page.pageTitle || page.title)
          
          // Debug page classification for ALL pages
          console.log(`🔍 [JourneyTab] Page ${index + 1} Classification:`, {
            pagePath: page.pagePath,
            pageTitle: page.pageTitle,
            title: page.title,
            classifiedAs: pageCategory,
            platform
          })
          
          return {
            platform,
            pageCategory,
            page,
            index
          }
        })
          
          console.log('✅ [JourneyTab] Classification completed for all pages')
          
          // Process the classification results
          classificationResults.forEach(({ platform, pageCategory, page, index }: { platform: string, pageCategory: string, page: PageData, index: number }) => {
            
            // Debug first few items
            if (index < 3) {
              console.log(`📍 [JourneyTab] Page ${index}:`, { 
                platform, 
                pageCategory, 
                pagePath: page.pagePath,
                sessions: page.sessions,
                provider: page.provider,
                hasPageTitle: !!page.pageTitle,
                hasTitle: !!page.title,
                pageTitleValue: page.pageTitle,
                titleValue: page.title,
                rawPage: page
              })
            }
            
            // Track unique platforms and page categories
            if (!platformMap.has(platform)) {
              platformMap.set(platform, platform)
            }
            if (!pageMap.has(pageCategory)) {
              pageMap.set(pageCategory, pageCategory)
            }
            
            sankeyLinks.push({
              from: platform,
              to: pageCategory,
              value: page.sessions
            })
          })
          
          // Create detailed breakdown for debugging
          const breakdown = new Map<string, Array<{page: string, sessions: number}>>()
          const breakdownResults = result.data.pages.map((page: PageData) => {
              const platform = page.provider || page.platform || 'LLM Traffic'
              const pageCategory = classifyPage(page.pagePath, page.pageTitle || page.title)
              
              return { platform, pageCategory, page }
            })
          
          breakdownResults.forEach(({ platform, pageCategory, page }: { platform: string, pageCategory: string, page: PageData }) => {
            if (!breakdown.has(platform)) {
              breakdown.set(platform, [])
            }
            breakdown.get(platform)!.push({
              page: pageCategory,
              sessions: page.sessions
            })
          })
          setPlatformBreakdown(breakdown)

          // Generate enhanced Sankey data
          const platformData = Array.from(breakdown.entries()).map(([platform, pages]) => ({
            platform: platform.toLowerCase(),
            provider: platform,
            totalSessions: pages.reduce((sum, p) => sum + p.sessions, 0),
            pages: pages.map(p => ({
              pageTitle: p.page,
              pagePath: `/${p.page.toLowerCase().replace(/\s+/g, '-')}`,
              sessions: p.sessions
            }))
          }))

          const enhancedSankeyData = sankeyLinks
          console.log('🔗 [JourneyTab] Direct sankey data:', enhancedSankeyData)
          console.log('🔗 [JourneyTab] Sankey data length:', enhancedSankeyData.length)
          
          // Debug: Show unique categories
          const uniqueCategories = new Set(enhancedSankeyData.map(link => link.to))
          console.log('🎯 [JourneyTab] Unique categories found:', Array.from(uniqueCategories))
          console.log('🎯 [JourneyTab] Total unique categories:', uniqueCategories.size)
          setSankeyData(enhancedSankeyData)
          
          // Debug: Show unique pages structure
          const uniquePages = new Set(enhancedSankeyData.map(link => link.to))
          console.log('🎯 [JourneyTab] Sankey data prepared:', {
            totalLinks: enhancedSankeyData.length,
            links: enhancedSankeyData.slice(0, 5),
            platforms: Array.from(platformMap.keys()),
            uniquePages: Array.from(uniquePages),
            totalUniquePages: uniquePages.size,
            totalPlatforms: platformMap.size
          })
          
          // Show sample of the actual data being used
          if (enhancedSankeyData.length > 0) {
            console.log('📊 [JourneyTab] Sample sankey links:', enhancedSankeyData.slice(0, 3))
            console.log('📊 [JourneyTab] All unique endpoints:', Array.from(uniquePages))
          } else {
            console.log('⚠️ [JourneyTab] No sankey data generated!')
          }
          
          console.log('📊 [JourneyTab] UNIQUE PAGE CATEGORIES STRUCTURE:')
          console.log('Left side (Platforms):', Array.from(platformMap.keys()))
          console.log('Right side (Page Categories):', Array.from(uniquePages))
          console.log('Total unique page categories:', uniquePages.size)
          
          // Detailed breakdown by platform
          console.log('📊 [JourneyTab] DETAILED PLATFORM → PAGE CATEGORY BREAKDOWN:')
          for (const [platform, pages] of breakdown.entries()) {
            const totalSessions = pages.reduce((sum, p) => sum + p.sessions, 0)
            console.log(`\n🤖 ${platform.toUpperCase()} (${totalSessions} total sessions):`)
            pages
              .sort((a, b) => b.sessions - a.sessions)
              .forEach((page, index) => {
                console.log(`  ${index + 1}. ${page.page} - ${page.sessions} sessions`)
              })
          }
        } else {
          console.warn('⚠️ [JourneyTab] No pages data found in response:', result)
        }
      } else {
        // Fallback: fetch from API if no real data provided
        console.log('🔍 [JourneyTab] No real journey data, fetching from API for dateRange:', dateRange)
        fetchPagesDataFromAPI()
      }
    }

    const fetchPagesDataFromAPI = async () => {
      try {
        const response = await fetch(`/api/ga4/pages?dateRange=${encodeURIComponent(dateRange)}`)
        const result = await response.json()
        
        console.log('📄 [JourneyTab] Pages API response:', result)
        
        if (result.success && result.data?.pages) {
          setPagesData(result.data.pages)
          
          // Transform pages data into Sankey format (same logic as above)
          const sankeyLinks: any[] = []
          const platformMap = new Map()
          const pageMap = new Map()
          
          // Process each page and create links with GPT classification
          console.log('🤖 [JourneyTab] Starting GPT classification for', result.data.pages.length, 'pages...')
          
          const classificationResults = result.data.pages.map((page: PageData, index: number) => {
              const platform = page.provider || page.platform || 'LLM Traffic'
              const pageCategory = classifyPage(page.pagePath, page.pageTitle || page.title)
            
              // Debug page classification
              if (index < 5) {
                console.log(`🔍 [JourneyTab] GPT classification:`, {
                  pagePath: page.pagePath,
                  pageTitle: page.pageTitle,
                  title: page.title,
                  classifiedAs: pageCategory,
                  platform
                })
              }
              
              return {
                platform,
                pageCategory,
                page,
                index
              }
            })
          
          console.log('✅ [JourneyTab] Classification completed for all pages')
          
          // Process the classification results
          classificationResults.forEach(({ platform, pageCategory, page, index }: { platform: string, pageCategory: string, page: PageData, index: number }) => {
            // Debug first few items
            if (index < 3) {
              console.log(`📍 [JourneyTab] Page ${index}:`, { 
                platform, 
                pageCategory, 
                pagePath: page.pagePath,
                sessions: page.sessions,
                provider: page.provider,
                hasPageTitle: !!page.pageTitle,
                hasTitle: !!page.title,
                pageTitleValue: page.pageTitle,
                titleValue: page.title,
                rawPage: page
              })
            }
            
            // Track unique platforms and page categories
            if (!platformMap.has(platform)) {
              platformMap.set(platform, platform)
            }
            if (!pageMap.has(pageCategory)) {
              pageMap.set(pageCategory, pageCategory)
            }
            
            sankeyLinks.push({
              from: platform,
              to: pageCategory,
              value: page.sessions
            })
          })
          
          // Create detailed breakdown for debugging
          const breakdown = new Map<string, Array<{page: string, sessions: number}>>()
          const breakdownResults = result.data.pages.map((page: PageData) => {
              const platform = page.provider || page.platform || 'LLM Traffic'
              const pageCategory = classifyPage(page.pagePath, page.pageTitle || page.title)
              
              return { platform, pageCategory, page }
            })
          
          breakdownResults.forEach(({ platform, pageCategory, page }: { platform: string, pageCategory: string, page: PageData }) => {
            if (!breakdown.has(platform)) {
              breakdown.set(platform, [])
            }
            breakdown.get(platform)!.push({
              page: pageCategory,
              sessions: page.sessions
            })
          })
          setPlatformBreakdown(breakdown)

          // Generate enhanced Sankey data
          const platformData = Array.from(breakdown.entries()).map(([platform, pages]) => ({
            platform: platform.toLowerCase(),
            provider: platform,
            totalSessions: pages.reduce((sum, p) => sum + p.sessions, 0),
            pages: pages.map(p => ({
              pageTitle: p.page,
              pagePath: `/${p.page.toLowerCase().replace(/\s+/g, '-')}`,
              sessions: p.sessions
            }))
          }))

          const enhancedSankeyData = sankeyLinks
          console.log('🔗 [JourneyTab] Direct sankey data:', enhancedSankeyData)
          console.log('🔗 [JourneyTab] Sankey data length:', enhancedSankeyData.length)
          
          // Debug: Show unique categories
          const uniqueCategories = new Set(enhancedSankeyData.map(link => link.to))
          console.log('🎯 [JourneyTab] Unique categories found:', Array.from(uniqueCategories))
          console.log('🎯 [JourneyTab] Total unique categories:', uniqueCategories.size)
          setSankeyData(enhancedSankeyData)
          
          // Debug: Show unique pages structure
          const uniquePages = new Set(enhancedSankeyData.map(link => link.to))
          console.log('🎯 [JourneyTab] Sankey data prepared:', {
            totalLinks: enhancedSankeyData.length,
            links: enhancedSankeyData.slice(0, 5),
            platforms: Array.from(platformMap.keys()),
            uniquePages: Array.from(uniquePages),
            totalUniquePages: uniquePages.size,
            totalPlatforms: platformMap.size
          })
          
          // Show sample of the actual data being used
          if (enhancedSankeyData.length > 0) {
            console.log('📊 [JourneyTab] Sample sankey links:', enhancedSankeyData.slice(0, 3))
            console.log('📊 [JourneyTab] All unique endpoints:', Array.from(uniquePages))
          } else {
            console.log('⚠️ [JourneyTab] No sankey data generated!')
          }
          
          console.log('📊 [JourneyTab] UNIQUE PAGE CATEGORIES STRUCTURE:')
          console.log('Left side (Platforms):', Array.from(platformMap.keys()))
          console.log('Right side (Page Categories):', Array.from(uniquePages))
          console.log('Total unique page categories:', uniquePages.size)
          
          // Detailed breakdown by platform
          console.log('📊 [JourneyTab] DETAILED PLATFORM → PAGE CATEGORY BREAKDOWN:')
          for (const [platform, pages] of breakdown.entries()) {
            const totalSessions = pages.reduce((sum, p) => sum + p.sessions, 0)
            console.log(`\n🤖 ${platform.toUpperCase()} (${totalSessions} total sessions):`)
            pages
              .sort((a, b) => b.sessions - a.sessions)
              .forEach((page, index) => {
                console.log(`  ${index + 1}. ${page.page} - ${page.sessions} sessions`)
              })
          }
        } else {
          console.warn('⚠️ [JourneyTab] No pages data found in API response:', result)
        }
      } catch (error) {
        console.error('❌ [JourneyTab] Failed to fetch pages data from API:', error)
      }
    }

    processPagesData()
  }, [dateRange, realJourneyData])

  // Define chart initialization functions outside useEffect
  const loadGoogleCharts = (): Promise<void> => {
      return new Promise((resolve, reject) => {
      // Check if Google Charts is already loaded
      if (window.google && window.google.charts) {
        console.log('Google Charts already loaded')
          resolve()
          return
        }

      console.log('Loading Google Charts...')
        const script = document.createElement('script')
      script.src = 'https://www.gstatic.com/charts/loader.js'
        script.onload = () => {
        console.log('Google Charts script loaded')
        window.google.charts.load('current', { packages: ['sankey'] })
        window.google.charts.setOnLoadCallback(() => {
          console.log('Google Charts Sankey package loaded')
          resolve()
        })
        }
        script.onerror = (error) => {
        console.error('Failed to load Google Charts:', error)
          reject(error)
        }
        document.head.appendChild(script)
      })
    }

    const initChart = () => {
    console.log('🎨 [JourneyTab] Initializing Google Charts Sankey...', { 
      hasRef: !!chartRef.current, 
      hasGoogle: !!window.google,
      sankeyDataLength: sankeyData.length
    })
    
    if (!chartRef.current || !window.google) {
      console.warn('⚠️ [JourneyTab] Missing chart ref or Google Charts:', { 
        hasRef: !!chartRef.current, 
        hasGoogle: !!window.google
      })
        return
      }

    try {
      // Create Google Charts DataTable
      const data = new window.google.visualization.DataTable()
      data.addColumn('string', 'From')
      data.addColumn('string', 'To')
      data.addColumn('number', 'Weight')

      // Add data rows - use real data if available
        const dataToUse = sankeyData.length > 0 ? sankeyData : [
        { from: "ChatGPT", to: "Loading...", value: 1 },
        { from: "Claude", to: "Loading...", value: 1 },
        { from: "Gemini", to: "Loading...", value: 1 }
      ]
      
      // If we have real data, use it
      if (sankeyData.length > 0) {
        console.log('✅ [JourneyTab] Using real sankey data with', sankeyData.length, 'links')
        console.log('📊 [JourneyTab] Sample sankey data:', sankeyData.slice(0, 3))
      } else {
        console.log('⚠️ [JourneyTab] Using fallback data - sankeyData is empty')
        console.log('🔍 [JourneyTab] Sankey data state:', sankeyData)
      }

      console.log('📊 [JourneyTab] Setting chart data:', dataToUse)
      console.log('📊 [JourneyTab] Sankey data length:', sankeyData.length)
      console.log('📊 [JourneyTab] Raw sankey data:', sankeyData)
      
      dataToUse.forEach(link => {
        data.addRow([link.from, link.to, link.value])
      })

      // Platform colors for distinct visual identity
      const platformColors: Record<string, string> = {
        'chatgpt': '#a78bfa',
        'gemini': '#60a5fa', 
        'claude': '#f472b6',
        'perplexity': '#fca5a5',
        'google': '#34d399',
        'llm traffic': '#94a3b8'
      }

      // Chart options
      const options = {
        width: '100%',
        height: 550,
        chartArea: {
          left: 180,  // extra space for left-side labels
          right: 180, // extra space for right-side labels
          top: 20,
          bottom: 20,
        },
        sankey: {
          node: {
            width: 10,
            nodePadding: 20,
            interactivity: false, // prevent highlight shifts
            label: {
              fontName: 'Inter',
              fontSize: 12,
              bold: false,
              color: document.documentElement.classList.contains('dark')
                ? '#e5e7eb'
                : '#111827',
            },
          },
          link: {
            colorMode: 'gradient',
            colors: ['#a78bfa', '#60a5fa', '#f472b6', '#fca5a5', '#34d399'],
            color: { fillOpacity: 0.35 },
          },
        },
      }

      // Debug data before drawing
      console.log('🔍 [JourneyTab] Data before drawing:', {
        dataLength: data.getNumberOfRows(),
        columns: data.getNumberOfColumns(),
        firstRow: data.getNumberOfRows() > 0 ? data.getValue(0, 0) + ' -> ' + data.getValue(0, 1) + ' (' + data.getValue(0, 2) + ')' : 'No data',
        chartArea: options.chartArea
      });

      // Create and draw chart
      const chart = new window.google.visualization.Sankey(chartRef.current)
      
      // Draw chart
      chart.draw(data, options);

      // Fix label positions once chart finishes rendering
      window.google.visualization.events.addListener(chart, 'ready', () => {
        console.log('🎯 [JourneyTab] Chart ready event fired');
        // Small delay ensures SVG labels exist
        setTimeout(() => {
          const svg = chartRef.current?.querySelector('svg')
          if (!svg) {
            console.log('❌ [JourneyTab] No SVG found after ready event');
            return;
          }

          const labels = svg.querySelectorAll('text')
          console.log('🔍 [JourneyTab] Found', labels.length, 'text labels');
          
          labels.forEach((label) => {
            const text = label.textContent?.trim() || ''
            if (!text) return

            // Move platform labels to the left (ChatGPT, Gemini, etc.)
            if (['chatgpt', 'gemini', 'perplexity', 'claude', 'google'].includes(text.toLowerCase())) {
              label.setAttribute('transform', 'translate(-90, 0)')
              label.setAttribute('text-anchor', 'end')
              label.setAttribute('font-weight', '600')
              label.setAttribute('font-size', '13')
              label.setAttribute('fill', '#1f2937')
            }

            // Move page labels to the right (starting with '/')
            if (text.startsWith('/')) {
              label.setAttribute('transform', 'translate(90, 0)')
              label.setAttribute('text-anchor', 'start')
              label.setAttribute('font-weight', '600')
              label.setAttribute('font-size', '13')
              label.setAttribute('fill', '#1f2937')
            }
          })
        }, 400) // wait 400 ms to ensure nodes are ready
      })

      // Add error listener
      window.google.visualization.events.addListener(chart, 'error', (error) => {
        console.error('❌ [JourneyTab] Chart error:', error);
      });
      
      console.log('✅ [JourneyTab] Google Charts Sankey initialized successfully')
      } catch (error) {
      console.error('❌ [JourneyTab] Error initializing Google Charts Sankey:', error)
      console.error('❌ [JourneyTab] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sankeyData: sankeyData,
        hasGoogle: !!window.google
      })
      }
    }


  useEffect(() => {
    const initializeCharts = async () => {
      console.log('🚀 [JourneyTab] Starting Google Charts loading...')
      try {
        await loadGoogleCharts()
        
        console.log('✅ [JourneyTab] Google Charts loaded, initializing charts...')
        initChart()
      } catch (error) {
        console.error('❌ [JourneyTab] Failed to load Google Charts:', error)
      }
    }

    initializeCharts()

    // Cleanup
    return () => {
      // No cleanup needed for Google Charts
    }
  }, [])

  // Reinitialize charts when sankeyData changes
  useEffect(() => {
    if (sankeyData.length > 0 && window.google && chartRef.current) {
      console.log('🔄 [JourneyTab] Reinitializing charts with new data...', {
        dataLength: sankeyData.length,
        firstItems: sankeyData.slice(0, 3)
      })
      
      // Reinitialize chart with new data
      initChart()
    }
  }, [sankeyData])

  // Show skeleton if no data and not loading
  if ((!realJourneyData || !realJourneyData.data || !realJourneyData.data.pages || realJourneyData.data.pages.length === 0) && !isLoading) {
    return <JourneySkeleton />
  }

  return (
    <div className="space-y-4">
      <UnifiedCard>
        <UnifiedCardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">LLM to Page Journey</h2>
              <p className="text-sm text-muted-foreground">Track which pages users visit from each LLM platform</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{pagesData.length}</div>
                <div className="text-xs text-muted-foreground">Total Pages</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">{pagesData.reduce((sum, p) => sum + p.sessions, 0)}</div>
                <div className="text-xs text-muted-foreground">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{sankeyData.length}</div>
                <div className="text-xs text-muted-foreground">Sankey Links</div>
              </div>
            </div>
          </div>

                      {/* Sankey Chart */}
                      <div className="w-full py-6">
                        <div 
                          ref={chartRef}
                          id="chartdiv" 
                          style={{ 
                            width: '100%', 
                            height: '600px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            padding: '0 100px', // ⬆️ wider for outside labels
                            overflow: 'hidden'
                          }}
                        />
                        {sankeyData.length === 0 && (
                          <div className="flex items-center justify-center h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                Loading Journey Data...
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-500">
                                Fetching LLM platform to page journey data
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
        </UnifiedCardContent>
      </UnifiedCard>


    </div>
  )
}
