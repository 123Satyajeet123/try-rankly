'use client'

import { useState } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronRight, Settings } from 'lucide-react'

// Mock data for topics and prompts
const topicsData = [
  {
    id: 'topic-1',
    name: 'Topic 1',
    totalPrompts: 15,
    positiveSentiment: 8,
    negativeSentiment: 5,
    neutralSentiment: 2,
    prompts: [
      {
        id: 'prompt-1-1',
        text: 'Prompt 1',
        sentiment: 'positive',
        sentimentScore: 85,
        frequency: 12
      },
      {
        id: 'prompt-1-2',
        text: 'Prompt 2',
        sentiment: 'positive',
        sentimentScore: 92,
        frequency: 8
      },
      {
        id: 'prompt-1-3',
        text: 'Prompt 3',
        sentiment: 'negative',
        sentimentScore: 35,
        frequency: 15
      },
      {
        id: 'prompt-1-4',
        text: 'Prompt 4',
        sentiment: 'neutral',
        sentimentScore: 55,
        frequency: 6
      }
    ]
  },
  {
    id: 'topic-2',
    name: 'Topic 2',
    totalPrompts: 12,
    positiveSentiment: 6,
    negativeSentiment: 4,
    neutralSentiment: 2,
    prompts: [
      {
        id: 'prompt-2-1',
        text: 'Prompt 1',
        sentiment: 'positive',
        sentimentScore: 78,
        frequency: 10
      },
      {
        id: 'prompt-2-2',
        text: 'Prompt 2',
        sentiment: 'negative',
        sentimentScore: 42,
        frequency: 14
      },
      {
        id: 'prompt-2-3',
        text: 'Prompt 3',
        sentiment: 'neutral',
        sentimentScore: 60,
        frequency: 9
      }
    ]
  },
  {
    id: 'topic-3',
    name: 'Topic 3',
    totalPrompts: 18,
    positiveSentiment: 10,
    negativeSentiment: 6,
    neutralSentiment: 2,
    prompts: [
      {
        id: 'prompt-3-1',
        text: 'Prompt 1',
        sentiment: 'positive',
        sentimentScore: 88,
        frequency: 11
      },
      {
        id: 'prompt-3-2',
        text: 'Prompt 2',
        sentiment: 'negative',
        sentimentScore: 30,
        frequency: 18
      },
      {
        id: 'prompt-3-3',
        text: 'Prompt 3',
        sentiment: 'positive',
        sentimentScore: 75,
        frequency: 13
      },
      {
        id: 'prompt-3-4',
        text: 'Prompt 4',
        sentiment: 'positive',
        sentimentScore: 82,
        frequency: 16
      },
      {
        id: 'prompt-3-5',
        text: 'Prompt 5',
        sentiment: 'negative',
        sentimentScore: 25,
        frequency: 20
      }
    ]
  }
]

export function SentimentTopicsTable() {
  const [expandedTopics, setExpandedTopics] = useState<string[]>([])

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    )
  }


  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">All Topics & Prompts</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Detailed sentiment analysis for all topics and their associated prompts.
          </p>
        </div>
        
        {/* Chart Config Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-sm">
              <Settings className="mr-2 h-4 w-4" />
              View Config
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Table View</DropdownMenuItem>
            <DropdownMenuItem>List View</DropdownMenuItem>
            <DropdownMenuItem>Compact View</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {topicsData.length} topics • {topicsData.reduce((sum, topic) => sum + topic.totalPrompts, 0)} total prompts
            </div>

          <div className="space-y-1">
            <div className="flex items-center pb-2">
              <div className="text-sm font-medium text-muted-foreground w-1/2">Topic</div>
              <div className="text-sm font-medium text-muted-foreground w-1/4">Sentiment</div>
              <div className="text-sm font-medium text-muted-foreground w-1/4">Frequency</div>
            </div>
            
            {topicsData.map((topic) => (
              <div key={topic.id} className="border-b border-gray-200 dark:border-gray-700">
                {/* Topic Row */}
                <div 
                  className="flex items-center py-3 cursor-pointer hover:bg-muted/50 rounded-md px-2"
                  onClick={() => toggleTopic(topic.id)}
                >
                  <div className="mr-3">
                    {expandedTopics.includes(topic.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center w-full">
                    <div className="w-1/2">
                      <span className="font-medium">{topic.name}</span>
                    </div>
                    <div className="w-1/4">
                      <span className="text-sm text-muted-foreground">-</span>
                    </div>
                    <div className="w-1/4">
                      <span className="text-sm text-muted-foreground">-</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Prompts */}
                {expandedTopics.includes(topic.id) && (
                  <div className="pl-8 pb-2">
                    {topic.prompts.map((prompt) => (
                      <div key={prompt.id} className="flex items-center py-2 hover:bg-muted/30 rounded-md px-2">
                        <div className="w-1/2">
                          <span className="text-sm text-muted-foreground">{prompt.text}</span>
                        </div>
                        <div className="w-1/4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            prompt.sentiment === 'positive' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : prompt.sentiment === 'negative'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {prompt.sentiment === 'positive' ? 'Positive' : prompt.sentiment === 'negative' ? 'Negative' : 'Neutral'}
                          </span>
                        </div>
                        <div className="w-1/4">
                          <span className="text-xs text-muted-foreground">{prompt.frequency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}
