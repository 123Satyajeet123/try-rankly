'use client'

import React from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'
import { PromptBuilderModal } from './PromptBuilderModal'
import { 
  ChevronDown, 
  ChevronRight, 
  Settings, 
  Download, 
  Search, 
  Filter,
  Info,
  ArrowUpDown,
  ExternalLink,
  Star,
  Check,
  Eye,
  X,
  Save,
  ArrowLeft,
  Sparkles,
  Upload,
  Plus,
  MoreHorizontal,
  ChevronsUpDown,
  Layers,
  Flag,
  FileText
} from 'lucide-react'
import { useState, useEffect } from 'react'

// Mock data for prompts - matching the exact values from the images
const promptsData = [
  {
    topic: "Personalization",
    promptCount: 1,
    visibilityRank: "#1",
    visibilityScore: "95%",
    averagePosition: "1",
    citationShare: "26.9%",
    citationRank: "#2",
    executions: 32,
    depthOfMention: "High",
    subjectiveImpression: "Positive",
    trend: "neutral",
    promptPreview: "is fibr a good tool for personalization",
    subjectiveMetrics: {
      relevance: "The citation directly addresses personalization strategies and provides actionable insights for user engagement.",
      influence: "Strong influence on user's understanding of personalization techniques and their impact on engagement metrics.",
      uniqueness: "Provides unique insights into advanced personalization methods not commonly found in generic marketing content.",
      position: "Positioned prominently in the response, making it highly visible to users seeking personalization guidance.",
      clickProbability: "High probability of user clicks due to relevant content and clear value proposition.",
      diversity: "Brings diverse perspectives from multiple personalization frameworks and real-world implementation examples."
    }
  },
  {
    topic: "Conversion Rate Optimization",
    promptCount: 5,
    visibilityRank: "#8",
    visibilityScore: "18.1%",
    averagePosition: "4.4",
    citationShare: "2.7%",
    citationRank: "#5",
    executions: 157,
    depthOfMention: "Medium",
    subjectiveImpression: "Neutral",
    trend: "up",
    promptPreview: "What are the best practices for conversion rate optimization?",
    subjectiveMetrics: {
      relevance: "Moderately relevant to conversion optimization queries but could be more specific to current trends.",
      influence: "Moderate influence on user decision-making for CRO strategies and implementation approaches.",
      uniqueness: "Standard CRO practices without unique insights or innovative approaches.",
      position: "Adequately positioned but not prominently featured in responses.",
      clickProbability: "Medium probability due to standard content that users might find elsewhere.",
      diversity: "Limited diversity in approaches, focusing mainly on traditional CRO methods."
    }
  },
  {
    topic: "Customer Engagement",
    promptCount: 2,
    visibilityRank: "#9",
    visibilityScore: "78%",
    averagePosition: "4.0",
    citationShare: "24.6%",
    citationRank: "#3",
    executions: 31,
    depthOfMention: "Medium",
    subjectiveImpression: "Positive",
    trend: "neutral",
    promptPreview: "how to improve customer engagement with AI tools",
    subjectiveMetrics: {
      relevance: "Highly relevant to customer engagement queries with specific AI tool recommendations.",
      influence: "Strong influence on customer engagement strategy and AI tool selection.",
      uniqueness: "Unique insights into AI-powered customer engagement techniques.",
      position: "Well-positioned in responses for engagement-related queries.",
      clickProbability: "High click probability due to practical AI tool recommendations.",
      diversity: "Diverse coverage of AI engagement tools and strategies."
    }
  },
  {
    topic: "Email Marketing",
    promptCount: 2,
    visibilityRank: "#5",
    visibilityScore: "82%",
    averagePosition: "2.9",
    citationShare: "20.4%",
    citationRank: "#7",
    executions: 33,
    depthOfMention: "Medium",
    subjectiveImpression: "Positive",
    trend: "up",
    promptPreview: "email marketing automation strategies",
    subjectiveMetrics: {
      relevance: "Highly relevant to email marketing automation queries.",
      influence: "Strong influence on email marketing strategy and automation decisions.",
      uniqueness: "Unique insights into advanced email marketing automation techniques.",
      position: "Well-positioned for email marketing related queries.",
      clickProbability: "High click probability due to actionable automation strategies.",
      diversity: "Diverse coverage of email marketing automation tools and techniques."
    }
  },
  {
    topic: "Customer Support",
    promptCount: 2,
    visibilityRank: "#1",
    visibilityScore: "99%",
    averagePosition: "3.8",
    citationShare: "13.1%",
    citationRank: "#8",
    executions: 25,
    depthOfMention: "High",
    subjectiveImpression: "Positive",
    trend: "neutral",
    promptPreview: "customer support chatbot implementation guide",
    subjectiveMetrics: {
      relevance: "Highly relevant to customer support automation queries with specific implementation guidance.",
      influence: "Strong influence on customer support strategy decisions and chatbot selection.",
      uniqueness: "Unique insights into AI-powered customer support workflows and automation best practices.",
      position: "Well-positioned in responses with clear visibility for support-related queries.",
      clickProbability: "High click probability due to practical implementation value and actionable insights.",
      diversity: "Diverse coverage of AI support tools, automation strategies, and implementation approaches."
    }
  }
]

interface PromptsSectionProps {
  onToggleFullScreen?: (isFullScreen: boolean) => void
}

function PromptsSection({ onToggleFullScreen }: PromptsSectionProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState("all")
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showPromptBuilder, setShowPromptBuilder] = useState(false)
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(["Personalization"]))
  const [selectedPrompts, setSelectedPrompts] = useState<Set<number>>(new Set())
  const [editingPrompt, setEditingPrompt] = useState<number | null>(null)
  const [editingTopic, setEditingTopic] = useState<number | null>(null)
  const [isAddingTopic, setIsAddingTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState("")
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>("All Topics")
  const [availableTopics, setAvailableTopics] = useState([
    "All Topics",
    "Conversion Rate Optimization", 
    "Personalization",
    "Customer Engagement",
    "Email Marketing",
    "Customer Support"
  ])
  const [prompts, setPrompts] = useState([
    {
      id: 1,
      prompt: "is fibr a good tool for personalization",
      topic: "Personalization",
      language: "English (en-US)",
      region: "🇺🇸 US",
      persona: "Marketing Manager",
      platforms: ["🤖", "🔍", "🌐", "💙"],
      updatedAt: "4 days ago",
      createdAt: "4 days ago",
      icon: "dots",
      isNew: false,
      isEmpty: false
    },
    {
      id: 2,
      prompt: "best conversion rate optimization services using AI",
      topic: "Conversion Rate Optimization",
      language: "English (en-US)",
      region: "🇬🇧 UK",
      persona: "Growth Hacker",
      platforms: ["🤖", "🔍", "🌐", "💙"],
      updatedAt: "3 days ago",
      createdAt: "3 days ago",
      icon: "dots",
      isNew: false,
      isEmpty: false
    },
    {
      id: 3,
      prompt: "how to improve customer engagement with AI tools",
      topic: "Customer Engagement",
      language: "English (en-US)",
      region: "🇨🇦 Canada",
      persona: "Customer Success Manager",
      platforms: ["🤖", "🔍", "🌐", "💙"],
      updatedAt: "2 days ago",
      createdAt: "2 days ago",
      icon: "dots",
      isNew: false,
      isEmpty: false
    },
    {
      id: 4,
      prompt: "email marketing automation strategies",
      topic: "Email Marketing",
      language: "English (en-US)",
      region: "🇺🇸 US",
      persona: "Email Marketing Specialist",
      platforms: ["🤖", "🔍", "🌐", "💙"],
      updatedAt: "1 day ago",
      createdAt: "1 day ago",
      icon: "dots",
      isNew: false,
      isEmpty: false
    },
    {
      id: 5,
      prompt: "customer support chatbot implementation guide",
      topic: "Customer Support",
      language: "English (en-US)",
      region: "🇦🇺 Australia",
      persona: "Support Manager",
      platforms: ["🤖", "🔍", "🌐", "💙"],
      updatedAt: "5 days ago",
      createdAt: "5 days ago",
      icon: "dots",
      isNew: false,
      isEmpty: false
    },
    {
      id: 6,
      prompt: "automated customer support chatbot implementation",
      topic: "Customer Support",
      language: "English (en-US)",
      region: "🇩🇪 Germany",
      persona: "Technical Lead",
      platforms: ["🤖", "🔍", "🌐", "💙"],
      updatedAt: "6 days ago",
      createdAt: "6 days ago",
      icon: "dots",
      isNew: false,
      isEmpty: false
    }
  ])

  console.log('PromptsSection rendered, showPromptBuilder:', showPromptBuilder)

  // Toggle full screen mode when Prompt Builder is shown
  useEffect(() => {
    if (onToggleFullScreen) {
      onToggleFullScreen(showPromptBuilder)
    }
  }, [showPromptBuilder, onToggleFullScreen])

  // Handle prompt selection
  const handlePromptSelect = (promptId: number) => {
    const newSelected = new Set(selectedPrompts)
    if (newSelected.has(promptId)) {
      newSelected.delete(promptId)
    } else {
      newSelected.add(promptId)
    }
    setSelectedPrompts(newSelected)
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedPrompts.size === prompts.length) {
      setSelectedPrompts(new Set())
    } else {
      setSelectedPrompts(new Set(prompts.map(p => p.id)))
    }
  }

  // Handle prompt editing
  const handlePromptEdit = (promptId: number, newText: string) => {
    setPrompts(prev => prev.map(p => 
      p.id === promptId ? { ...p, prompt: newText } : p
    ))
  }

  // Handle prompt save
  const handlePromptSave = (promptId: number) => {
    setEditingPrompt(null)
  }

  // Handle adding new prompt
  const handleAddPrompt = (newPromptText: string) => {
    // Assign to selected topic, or "New Topic" if "All Topics" is selected
    const assignedTopic = selectedTopicFilter === "All Topics" ? "New Topic" : selectedTopicFilter

    const newPrompt = {
      id: Date.now(),
      prompt: newPromptText,
      topic: assignedTopic,
      language: "English (en-US)",
      region: "🇺🇸 US",
      persona: "Default",
      platforms: ["🤖", "🔍", "🌐", "💙"],
      updatedAt: "just now",
      createdAt: "just now",
      icon: "dots",
      isNew: true,
      isEmpty: false
    }
    setPrompts(prev => [...prev, newPrompt])
    
    // Remove the new flag after 3 seconds
    setTimeout(() => {
      setPrompts(prev => prev.map(p => 
        p.id === newPrompt.id ? { ...p, isNew: false } : p
      ))
    }, 3000)
  }

  // Handle topic editing for a specific prompt
  const handleTopicEdit = (promptId: number) => {
    setEditingTopic(promptId)
  }

  // Handle topic selection for a prompt
  const handleTopicSelect = (promptId: number, selectedTopic: string) => {
    setPrompts(prev => prev.map(p => 
      p.id === promptId ? {...p, topic: selectedTopic, isNew: false} : p
    ))
    setEditingTopic(null)
  }

  // Handle adding a new prompt from sidebar topic selection
  const handleAddPromptFromTopic = (topicName: string) => {
    if (topicName === "All Topics") return // Don't add prompt for "All Topics"

    const newPrompt = {
      id: Date.now(),
      prompt: "", // Empty prompt to be filled by user
      topic: topicName,
      language: "English (en-US)",
      region: "🇺🇸 US",
      persona: "Default",
      platforms: ["🤖", "🔍", "🌐", "💙"],
      updatedAt: "just now",
      createdAt: "just now",
      icon: "dots",
      isNew: true,
      isEmpty: true // Flag to indicate this is an empty prompt from topic selection
    }
    setPrompts(prev => [...prev, newPrompt])
    setEditingPrompt(newPrompt.id) // Auto-edit the prompt field
    
    // Remove the new flag after 3 seconds
    setTimeout(() => {
      setPrompts(prev => prev.map(p => p.id === newPrompt.id ? {...p, isNew: false, isEmpty: false} : p))
    }, 3000)
  }

  // Handle adding a new topic
  const handleAddTopic = () => {
    if (newTopicName.trim() && !availableTopics.includes(newTopicName.trim())) {
      const topicName = newTopicName.trim()
      setAvailableTopics(prev => [...prev.filter(t => t !== "All Topics"), topicName, "All Topics"])
      setNewTopicName("")
      setIsAddingTopic(false)
      
      // Automatically select the newly created topic
      setSelectedTopicFilter(topicName)
    }
  }

  // Handle canceling topic creation
  const handleCancelAddTopic = () => {
    setIsAddingTopic(false)
    setNewTopicName("")
  }

  // Handle topic selection from sidebar
  const handleTopicFilterSelect = (topicName: string) => {
    setSelectedTopicFilter(topicName)
  }

  // Handle group expansion toggle
  const handleTopicToggle = (groupValue: string) => {
    const newExpanded = new Set(expandedTopics)
    if (newExpanded.has(groupValue)) {
      newExpanded.delete(groupValue)
    } else {
      newExpanded.add(groupValue)
    }
    setExpandedTopics(newExpanded)
  }

  // Filter prompts based on selected topic
  const getFilteredPrompts = () => {
    if (selectedTopicFilter === "All Topics") {
      return prompts
    }
    return prompts.filter(prompt => prompt.topic === selectedTopicFilter)
  }

  // Group prompts by selected sort option
  const getGroupedPromptsBySort = () => {
    const filtered = getFilteredPrompts()
    let groupKey: string
    let groupLabel: string
    
    switch (sortBy) {
      case 'topic':
        groupKey = 'topic'
        groupLabel = 'Topic'
        break
      case 'region':
        groupKey = 'region'
        groupLabel = 'Region'
        break
      case 'persona':
        groupKey = 'persona'
        groupLabel = 'Persona'
        break
      default:
        groupKey = 'topic'
        groupLabel = 'Topic'
    }
    
    const grouped = filtered.reduce((acc, prompt) => {
      const groupValue = prompt[groupKey as keyof typeof prompt] as string
      if (!acc[groupValue]) {
        acc[groupValue] = []
      }
      acc[groupValue].push(prompt)
      return acc
    }, {} as Record<string, typeof prompts>)

    return Object.entries(grouped).map(([groupValue, groupPrompts]) => {
      // Find the corresponding data from promptsData based on the primary topic
      const primaryTopic = groupPrompts[0]?.topic
      const topicData = promptsData.find(data => data.topic === primaryTopic)
      
      return {
        groupKey,
        groupLabel,
        groupValue,
        prompts: groupPrompts,
        visibilityRank: topicData?.visibilityRank || `#${Math.floor(Math.random() * 10) + 1}`,
        visibilityScore: topicData?.visibilityScore || `${Math.floor(Math.random() * 40) + 60}%`,
        averagePosition: topicData?.averagePosition || `${(Math.random() * 3 + 1).toFixed(1)}`,
        citationShare: topicData?.citationShare || `${(Math.random() * 20 + 5).toFixed(1)}%`,
        citationRank: topicData?.citationRank || `#${Math.floor(Math.random() * 8) + 1}`,
        executions: topicData?.executions || groupPrompts.length * (Math.floor(Math.random() * 50) + 10)
      }
    })
  }

  const filteredPrompts = getFilteredPrompts()
  const groupedData = getGroupedPromptsBySort()

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <span className="w-3 h-3 text-green-600">↗</span>
      case 'down':
        return <span className="w-3 h-3 text-red-600">↘</span>
      case 'neutral':
        return <span className="w-3 h-3 text-center">-</span>
      default:
        return <span className="w-3 h-3 text-center">-</span>
    }
  }

  // Show Prompt Builder if requested
  if (showPromptBuilder) {
    return (
      <div className="min-h-screen bg-background">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" className="gap-2" onClick={() => setShowPromptBuilder(false)}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Edits are temporary until saved</span>
            <Button className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        <div className="flex">
          {/* Left Sidebar */}
          <div className="w-48 border-r bg-background">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Topics ({availableTopics.length - 1})</h3>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
              </div>
              
              <div className="space-y-1">
                {availableTopics.map((topic) => {
                  const promptCount = prompts.filter(p => p.topic === topic || topic === "All Topics").length
                  const isSelected = selectedTopicFilter === topic
                  
                  return (
                    <div key={topic}>
                      {topic === "All Topics" ? (
                        <div 
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                          }`}
                          onClick={() => handleTopicFilterSelect(topic)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{topic}</span>
                            <span className="text-xs text-muted-foreground">{promptCount}</span>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                          }`}
                          onClick={() => handleTopicFilterSelect(topic)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{topic}</span>
                            <span className="text-xs text-muted-foreground">{promptCount}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {/* Add Topic Section */}
                {isAddingTopic ? (
                  <div className="p-2 border rounded">
                    <Input
                      placeholder="Topic name"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      className="mb-2 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTopic()
                        if (e.key === 'Escape') handleCancelAddTopic()
                      }}
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={handleAddTopic} className="flex-1">
                        Add
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelAddTopic}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsAddingTopic(true)}
                    className="w-full justify-start gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Topic
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Prompt Designer</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedTopicFilter === "All Topics" 
                    ? `All prompts (${prompts.length})` 
                    : `${selectedTopicFilter} prompts (${filteredPrompts.length})`}
                </p>
              </div>
            </div>

            {/* Prompts Table */}
            <div className="border rounded-lg">
              {/* Table Header */}
              <div className="grid grid-cols-[40px_minmax(120px,2fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(80px,1fr)_minmax(100px,1fr)_minmax(60px,1fr)_minmax(60px,1fr)] gap-0 bg-muted/30 p-2 text-sm font-medium border-b">
                <div className="flex items-center justify-center">
                  <Checkbox 
                    checked={selectedPrompts.size === prompts.length && prompts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </div>
                <div className="px-2">Prompts</div>
                <div className="px-2">Topic</div>
                <div className="px-2">Language</div>
                <div className="px-2">Region</div>
                <div className="px-2">Tags</div>
                <div className="px-2">Platforms</div>
                <div className="px-2">Updated</div>
                <div className="px-2">Created</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y">
                {filteredPrompts.map((row) => (
                  <div 
                    key={row.id} 
                    className={`grid grid-cols-[40px_minmax(120px,2fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(80px,1fr)_minmax(100px,1fr)_minmax(60px,1fr)_minmax(60px,1fr)] gap-0 items-center p-2 text-sm hover:bg-muted/30 transition-colors ${
                      row.isNew ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <Checkbox 
                        checked={selectedPrompts.has(row.id)}
                        onCheckedChange={() => handlePromptSelect(row.id)}
                      />
                    </div>
                    <div className="px-2">
                      {editingPrompt === row.id ? (
                        <Input
                          value={row.prompt}
                          onChange={(e) => handlePromptEdit(row.id, e.target.value)}
                          onBlur={() => handlePromptSave(row.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePromptSave(row.id)
                            if (e.key === 'Escape') setEditingPrompt(null)
                          }}
                          className="text-sm border rounded bg-background"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="cursor-pointer hover:bg-muted/30 px-1 py-1 rounded block"
                          onClick={() => setEditingPrompt(row.id)}
                        >
                          {row.prompt || (row.isEmpty ? "Click to add prompt..." : "Empty prompt")}
                        </span>
                      )}
                    </div>
                    <div className="px-2">
                      {editingTopic === row.id ? (
                        <select
                          value={row.topic}
                          onChange={(e) => handleTopicSelect(row.id, e.target.value)}
                          onBlur={() => setEditingTopic(null)}
                          className="w-full px-1 py-1 text-sm border rounded bg-background"
                          autoFocus
                        >
                          {availableTopics.filter(topic => topic !== "All Topics").map((topic) => (
                            <option key={topic} value={topic}>{topic}</option>
                          ))}
                        </select>
                      ) : row.isNew ? (
                        <span 
                          className="cursor-pointer hover:bg-muted/30 px-1 py-1 rounded"
                          onClick={() => handleTopicEdit(row.id)}
                        >
                          + Topic
                        </span>
                      ) : (
                        <span 
                          className="cursor-pointer hover:bg-muted/30 px-1 py-1 rounded"
                          onClick={() => handleTopicEdit(row.id)}
                        >
                          {row.topic}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground truncate px-2">{row.language}</div>
                    <div className="text-muted-foreground truncate px-2">{row.region}</div>
                    <div className="text-muted-foreground px-2">
                      <span className="cursor-pointer hover:bg-muted/30 px-1 py-1 rounded">
                        + Tag
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-2">
                      {row.platforms?.map((platform, i) => (
                        <div key={i} className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs" title={platform}>
                          {platform}
                        </div>
                      ))}
                    </div>
                    <div className="text-muted-foreground text-xs px-2">{row.updatedAt}</div>
                    <div className="text-muted-foreground text-xs px-2">{row.createdAt}</div>
                  </div>
                ))}

                {/* Empty State Row */}
                {filteredPrompts.length === 0 && (
                  <div className="grid grid-cols-[40px_minmax(120px,2fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(80px,1fr)_minmax(100px,1fr)_minmax(60px,1fr)_minmax(60px,1fr)] gap-0 items-center min-h-[200px]">
                    {/* Empty checkbox column */}
                    <div></div>
                    
                    {/* Empty state content spanning all remaining columns */}
                    <div className="col-span-8 flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No prompts found</h3>
                      <p className="text-muted-foreground mb-4">
                        {selectedTopicFilter === "All Topics" 
                          ? "No prompts have been created yet." 
                          : `No prompts found for "${selectedTopicFilter}".`}
                      </p>
                      <Button 
                        onClick={() => {
                          // Create a new empty prompt for the selected topic
                          const assignedTopic = selectedTopicFilter === "All Topics" ? "New Topic" : selectedTopicFilter
                          
                          const newPrompt = {
                            id: Date.now(),
                            prompt: "",
                            topic: assignedTopic,
                            language: "English (en-US)",
                            region: "🇺🇸 US",
                            persona: "Default",
                            platforms: ["🤖", "🔍", "🌐", "💙"],
                            updatedAt: "just now",
                            createdAt: "just now",
                            icon: "dots",
                            isNew: true,
                            isEmpty: true
                          }
                          setPrompts(prev => [...prev, newPrompt])
                          setEditingPrompt(newPrompt.id) // Auto-edit the prompt field
                          
                          // Remove the new flag after 3 seconds
                          setTimeout(() => {
                            setPrompts(prev => prev.map(p => p.id === newPrompt.id ? {...p, isNew: false, isEmpty: false} : p))
                          }, 3000)
                        }}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Your First Prompt
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Control Panel - Only show when prompts are selected */}
            {selectedPrompts.size > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {selectedPrompts.size} prompt{selectedPrompts.size !== 1 ? 's' : ''} selected
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => setSelectedPrompts(new Set())}
                    >
                      <X className="w-4 h-4" />
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">Edit Tags</Button>
                    <Button variant="ghost" size="sm">Edit Regions</Button>
                    <Button variant="ghost" size="sm">Edit Platforms</Button>
                    <Button variant="ghost" size="sm">Duplicate</Button>
                    <Button variant="ghost" size="sm">Disable</Button>
                    <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">6 prompts</h2>
          <p className="text-sm text-muted-foreground mt-2">
            The Fibr configuration includes 6 unique prompts across 2 topics, which are run daily.
          </p>
        </div>
        
        {/* Modify Prompts Button */}
        <PromptBuilderModal onGenerate={() => setShowPromptBuilder(true)}>
          <Button variant="default" size="sm" className="gap-2 bg-gray-900 text-white hover:bg-gray-800">
            <Settings className="w-4 h-4" />
            Modify Prompts
          </Button>
        </PromptBuilderModal>
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="space-y-4">
            {/* Control Bar */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-4">
                <Select defaultValue="yesterday">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 days</SelectItem>
                    <SelectItem value="last30days">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ArrowUpDown className="w-4 h-4" />
                      Sort by: {sortBy}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSortBy("all")}>
                      <div className="flex items-center gap-2">
                        All
                        {sortBy === "all" && <Check className="w-4 h-4" />}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("topic")}>
                      <div className="flex items-center gap-2">
                        Topic
                        {sortBy === "topic" && <Check className="w-4 h-4" />}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("region")}>
                      <div className="flex items-center gap-2">
                        Region
                        {sortBy === "region" && <Check className="w-4 h-4" />}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("persona")}>
                      <div className="flex items-center gap-2">
                        Persona
                        {sortBy === "persona" && <Check className="w-4 h-4" />}
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search prompts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </div>

            {/* Collapsible Topics Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        {groupedData[0]?.groupLabel || 'Topic'}
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Visibility Rank
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Visibility Score
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        Average Position
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Citation Share
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Citation Rank
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        Executions
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead className="w-12">
                      <Download className="w-4 h-4" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedData.map((group, index) => {
                    const isExpanded = expandedTopics.has(group.groupValue)

                    return (
                      <React.Fragment key={`group-${group.groupValue}-${index}`}>
                        {/* Group Header Row */}
                        <TableRow className="hover:bg-muted/50">
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleTopicToggle(group.groupValue)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span>{group.groupValue}</span>
                                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 border-gray-200">
                                  # {group.groupLabel}
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {group.prompts.length} prompt{group.prompts.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{group.visibilityRank} -</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {group.groupValue === "Conversion Rate Optimization" ? (
                                <div className="w-3 h-3 border border-gray-300 rounded-full relative">
                                  <div className="absolute inset-0 rounded-full bg-gray-200" style={{clipPath: 'polygon(0 0, 18% 0, 18% 100%, 0 100%)'}}></div>
                                </div>
                              ) : (
                                <div className="w-3 h-3 border border-gray-300 rounded-full"></div>
                              )}
                              {group.visibilityScore} -
                            </div>
                          </TableCell>
                          <TableCell>{group.averagePosition} -</TableCell>
                          <TableCell>{group.citationShare} -</TableCell>
                          <TableCell className="font-mono">{group.citationRank} -</TableCell>
                          <TableCell>{group.executions}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>

                        {/* Expanded Prompts */}
                        {isExpanded && group.prompts.map((prompt, promptIndex) => (
                          <TableRow key={`prompt-${prompt.id}`} className="bg-muted/20 hover:bg-muted/40">
                            <TableCell></TableCell>
                            <TableCell className="pl-8 text-muted-foreground">
                              <span className="text-sm">{prompt.prompt}</span>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {group.visibilityRank} -
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border border-gray-300 rounded-full"></div>
                                {group.visibilityScore} -
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {group.averagePosition} -
                            </TableCell>
                            <TableCell className="text-sm">
                              {group.citationShare} -
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {group.citationRank} -
                            </TableCell>
                            <TableCell className="text-sm">
                              {group.executions}
                            </TableCell>
                            <TableCell>
                              <Star className="w-4 h-4 text-yellow-500" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Subjective Impression Analysis Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[600px] sm:w-[700px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Subjective Impression Analysis
            </SheetTitle>
            <SheetDescription>
              Detailed analysis for: <span className="font-semibold">{selectedPrompt?.topic}</span>
            </SheetDescription>
          </SheetHeader>

          {selectedPrompt && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Prompt Summary</h4>
                <p className="text-sm text-muted-foreground">{selectedPrompt.promptPreview}</p>
              </div>

              {/* Subjective Metrics */}
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
                      value={selectedPrompt.subjectiveMetrics.relevance}
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
                      value={selectedPrompt.subjectiveMetrics.influence}
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
                      value={selectedPrompt.subjectiveMetrics.uniqueness}
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
                      value={selectedPrompt.subjectiveMetrics.position}
                      readOnly
                      className="min-h-[120px] resize-none"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="click-probability">
                  <AccordionTrigger className="text-sm font-medium">
                    <div className="flex flex-col items-start">
                      <span>Click Probability</span>
                      <span className="text-xs text-muted-foreground font-normal">Would the user click the citation if links are shown?</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Textarea
                      value={selectedPrompt.subjectiveMetrics.clickProbability}
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
                      value={selectedPrompt.subjectiveMetrics.diversity}
                      readOnly
                      className="min-h-[120px] resize-none"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t">
            <Button variant="outline" size="sm" className="gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
            <Button variant="default" size="sm" className="gap-2" onClick={() => setIsSheetOpen(false)}>
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export { PromptsSection }