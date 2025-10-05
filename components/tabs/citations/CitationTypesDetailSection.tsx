'use client'

import { useState } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ChevronDown, 
  ChevronRight,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  X,
  Save
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Textarea } from '@/components/ui/textarea'

// Mock data for detailed citation types
const citationTypesDetail = [
  {
    type: "Brand",
    links: [
      { 
        title: "Acme Inc.com", 
        url: "https://acme-inc.com", 
        type: "Website",
        sentiment: "Positive",
        citationShare: "45.2%",
        citationRank: "#1",
        promptSummary: "How can I personalize user experiences to increase engagement?",
        subjectiveMetrics: {
          relevance: "The citation directly addresses personalization strategies and provides actionable insights for user engagement. Key points include:\n• Real-time data processing capabilities\n• Machine learning algorithms for behavior analysis\n• A/B testing frameworks for optimization\n• Integration with customer data platforms",
          influence: "Strong influence on user's understanding of personalization techniques and their impact on engagement metrics. Notable aspects:\n• Case studies showing 25% increase in conversion rates\n• Best practices for segment-based targeting\n• ROI calculations and performance benchmarks\n• Industry comparison with competitors",
          uniqueness: "Provides unique insights into advanced personalization methods not commonly found in generic marketing content. Distinctive elements:\n• Proprietary AI algorithms for user profiling\n• Custom integration APIs for enterprise clients\n• Advanced analytics dashboard with predictive modeling\n• White-label solutions for agencies",
          position: "Subjectively positioned as a comprehensive guide that users would find valuable and trustworthy. Positioning factors:\n• Featured in top industry publications\n• Endorsed by leading marketing experts\n• High domain authority and backlink profile\n• Positive user reviews and testimonials",
          clickProbability: "High probability of clicks due to practical examples and clear value proposition. Engagement drivers:\n• Interactive demo and free trial offer\n• Detailed pricing information upfront\n• Customer success stories and case studies\n• Clear call-to-action buttons",
          diversity: "Brings diverse perspectives from multiple personalization approaches and industry best practices. Variety includes:\n• E-commerce personalization strategies\n• SaaS product customization techniques\n• B2B lead nurturing automation\n• Cross-platform data synchronization"
        }
      },
      { 
        title: "TechCorp Solutions", 
        url: "https://techcorp-solutions.com", 
        type: "Website",
        sentiment: "Positive",
        citationShare: "32.1%",
        citationRank: "#2"
      },
      { 
        title: "InnovateNow Blog", 
        url: "https://innovatnow.com/blog", 
        type: "Blog",
        sentiment: "Neutral",
        citationShare: "14.6%",
        citationRank: "#3"
      },
      { 
        title: "BrandPress Release", 
        url: "https://brandpress.com/news", 
        type: "Press",
        sentiment: "Positive",
        citationShare: "8.1%",
        citationRank: "#4"
      }
    ]
  },
  {
    type: "Earned",
    links: [
      { 
        title: "ReviewTech.io", 
        url: "https://reviewtech.io/acme-review", 
        type: "Review",
        sentiment: "Positive",
        citationShare: "0.4%",
        citationRank: "#1"
      },
      { 
        title: "CompareTools.net", 
        url: "https://comparetools.net/comparison", 
        type: "Comparison",
        sentiment: "Neutral",
        citationShare: "0.2%",
        citationRank: "#2"
      },
      { 
        title: "ExpertInsights.com", 
        url: "https://expertinsights.com/opinion", 
        type: "Opinion",
        sentiment: "Positive",
        citationShare: "0.1%",
        citationRank: "#3"
      }
    ]
  },
  {
    type: "Social",
    links: [
      { 
        title: "LinkedIn Acme Inc", 
        url: "https://linkedin.com/company/acme-inc", 
        type: "Social Media",
        sentiment: "Positive",
        citationShare: "4.2%",
        citationRank: "#1"
      },
      { 
        title: "Twitter @AcmeInc", 
        url: "https://twitter.com/acmeinc", 
        type: "Social Media",
        sentiment: "Positive",
        citationShare: "2.1%",
        citationRank: "#2"
      },
      { 
        title: "Reddit r/technology", 
        url: "https://reddit.com/r/technology/acme", 
        type: "Community",
        sentiment: "Neutral",
        citationShare: "0.8%",
        citationRank: "#3"
      },
      { 
        title: "YouTube TechReview", 
        url: "https://youtube.com/watch?v=acme-review", 
        type: "Video",
        sentiment: "Positive",
        citationShare: "0.3%",
        citationRank: "#4"
      }
    ]
  }
]

export function CitationTypesDetailSection() {
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [selectedLink, setSelectedLink] = useState<any>(null)

  const toggleRow = (type: string) => {
    setExpandedRows(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const handleViewClick = (link: any) => {
    setSelectedLink(link)
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Neutral':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Negative':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-600" />
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div id="citation-types-detail">
      <UnifiedCard>
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">All Citation Types</h3>
              <Badge variant="outline" className="text-sm">
                3 citation types
              </Badge>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Citation Type</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Citation Share</TableHead>
                    <TableHead>Citation Rank</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {citationTypesDetail.map((item, index) => (
                    <>
                      <TableRow 
                        key={item.type}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        onClick={() => toggleRow(item.type)}
                      >
                        <TableCell>
                          {expandedRows.includes(item.type) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.type}</TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      
                      {/* Expanded content */}
                      {expandedRows.includes(item.type) && 
                        item.links.map((link, linkIndex) => (
                          <TableRow key={`${item.type}-${linkIndex}`} className="bg-gray-50 dark:bg-gray-900/50">
                            <TableCell></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{link.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {link.type}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getSentimentColor(link.sentiment)}>
                                {link.sentiment}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {link.citationShare}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {link.citationRank}
                            </TableCell>
                            <TableCell>
                              <Sheet>
                                <SheetTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-auto p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                                    onClick={() => handleViewClick(link)}
                                  >
                                    <span>View</span>
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                  </Button>
                                </SheetTrigger>
                                <SheetContent className="w-[600px] sm:w-[700px]">
                                  <SheetHeader>
                                    <SheetTitle className="flex items-center gap-2">
                                      <ExternalLink className="w-5 h-5" />
                                      Subjective Impression Analysis
                                    </SheetTitle>
                                    <SheetDescription>
                                      Detailed analysis for: <span className="font-semibold">{link.title}</span>
                                    </SheetDescription>
                                  </SheetHeader>
                                  
                                  <div className="mt-6 space-y-4">
                                    <div className="p-4 bg-muted/50 rounded-lg">
                                      <h4 className="font-semibold text-sm mb-2">Prompt Summary</h4>
                                      <p className="text-sm text-muted-foreground">{link.promptSummary}</p>
                                    </div>
                                    
                                    <Accordion type="multiple" className="w-full">
                                      <AccordionItem value="relevance">
                                        <AccordionTrigger className="text-sm font-medium">
                                          <div className="flex flex-col items-start">
                                            <span>Relevance</span>
                                            <span className="text-xs text-muted-foreground font-normal">Is the citation actually answering the query?</span>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <Textarea
                                            value={link.subjectiveMetrics?.relevance || ""}
                                            readOnly
                                            className="min-h-[120px] resize-none"
                                          />
                                        </AccordionContent>
                                      </AccordionItem>
                                      
                                      <AccordionItem value="influence">
                                        <AccordionTrigger className="text-sm font-medium">
                                          <div className="flex flex-col items-start">
                                            <span>Influence</span>
                                            <span className="text-xs text-muted-foreground font-normal">Does it shape the user's takeaway?</span>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <Textarea
                                            value={link.subjectiveMetrics?.influence || ""}
                                            readOnly
                                            className="min-h-[120px] resize-none"
                                          />
                                        </AccordionContent>
                                      </AccordionItem>
                                      
                                      <AccordionItem value="uniqueness">
                                        <AccordionTrigger className="text-sm font-medium">
                                          <div className="flex flex-col items-start">
                                            <span>Uniqueness</span>
                                            <span className="text-xs text-muted-foreground font-normal">Is the info special, or just repeated elsewhere?</span>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <Textarea
                                            value={link.subjectiveMetrics?.uniqueness || ""}
                                            readOnly
                                            className="min-h-[120px] resize-none"
                                          />
                                        </AccordionContent>
                                      </AccordionItem>
                                      
                                      <AccordionItem value="position">
                                        <AccordionTrigger className="text-sm font-medium">
                                          <div className="flex flex-col items-start">
                                            <span>Position</span>
                                            <span className="text-xs text-muted-foreground font-normal">Subjectively measured, not just raw position.</span>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <Textarea
                                            value={link.subjectiveMetrics?.position || ""}
                                            readOnly
                                            className="min-h-[120px] resize-none"
                                          />
                                        </AccordionContent>
                                      </AccordionItem>
                                      
                                      <AccordionItem value="clickProbability">
                                        <AccordionTrigger className="text-sm font-medium">
                                          <div className="flex flex-col items-start">
                                            <span>Click Probability</span>
                                            <span className="text-xs text-muted-foreground font-normal">Would the user click the citation if links are shown?</span>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <Textarea
                                            value={link.subjectiveMetrics?.clickProbability || ""}
                                            readOnly
                                            className="min-h-[120px] resize-none"
                                          />
                                        </AccordionContent>
                                      </AccordionItem>
                                      
                                      <AccordionItem value="diversity">
                                        <AccordionTrigger className="text-sm font-medium">
                                          <div className="flex flex-col items-start">
                                            <span>Diversity</span>
                                            <span className="text-xs text-muted-foreground font-normal">Does the citation bring in a new perspective?</span>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <Textarea
                                            value={link.subjectiveMetrics?.diversity || ""}
                                            readOnly
                                            className="min-h-[120px] resize-none"
                                          />
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  </div>
                                  
                                  <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t">
                                    <Button variant="outline" size="sm" className="gap-2">
                                      <Save className="w-4 h-4" />
                                      Save Changes
                                    </Button>
                                    <SheetTrigger asChild>
                                      <Button variant="default" size="sm" className="gap-2">
                                        <X className="w-4 h-4" />
                                        Close
                                      </Button>
                                    </SheetTrigger>
                                  </div>
                                </SheetContent>
                              </Sheet>
                            </TableCell>
                          </TableRow>
                        ))
                      }
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}
