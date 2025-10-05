'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  Trash2, 
  Upload, 
  Settings, 
  Sparkles,
  X,
  FileSpreadsheet,
  ChevronUp,
  Search,
  Layers
} from 'lucide-react'

interface PromptBuilderModalProps {
  children: React.ReactNode
  onGenerate?: () => void
}

export function PromptBuilderModal({ children, onGenerate }: PromptBuilderModalProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [topics, setTopics] = useState([{ id: 1, name: "Conversion Rate Optimization" }])
  const [promptsPerTopic, setPromptsPerTopic] = useState("10")
  const [region, setRegion] = useState("us")
  const [language, setLanguage] = useState("en-US")
  const [platforms, setPlatforms] = useState(["chatgpt", "perplexity", "google", "microsoft"])
  const [additionalInstructions, setAdditionalInstructions] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [platformSearch, setPlatformSearch] = useState("")

  const addTopic = () => {
    const newTopic = {
      id: topics.length + 1,
      name: `New Topic ${topics.length + 1}`
    }
    setTopics([...topics, newTopic])
  }

  const removeTopic = (id: number) => {
    setTopics(topics.filter(topic => topic.id !== id))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const togglePlatform = (platformId: string) => {
    setPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const handleGenerate = () => {
    // Handle AI prompt generation logic here
    console.log('Generating prompts with:', {
      topics,
      promptsPerTopic,
      region,
      language,
      platforms,
      additionalInstructions,
      uploadedFile
    })
    
    // Close modal
    setIsOpen(false)
    
    // Call the onGenerate callback if provided
    if (onGenerate) {
      onGenerate()
    }
  }

  const platformData = [
    { id: "chatgpt", name: "ChatGPT", icon: "🤖" },
    { id: "perplexity", name: "Perplexity", icon: "🔍" },
    { id: "google", name: "Google AI Overviews", icon: "🌐" },
    { id: "microsoft", name: "Microsoft Copilot", icon: "🔵" }
  ]

  const platformIcons = {
    chatgpt: "🤖",
    perplexity: "🔍",
    google: "🌐",
    microsoft: "🔵"
  }

  const regionFlags = {
    us: "🇺🇸",
    uk: "🇬🇧",
    ca: "🇨🇦",
    au: "🇦🇺"
  }

  const languageIcons = {
    "en-US": "🇺🇸",
    "en-GB": "🇬🇧", 
    "es-ES": "🇪🇸",
    "fr-FR": "🇫🇷"
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Prompt Builder</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          {/* Left Side - Description */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Configure topics, regions, and platforms</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select or create the topics to generate prompts that will refine the data you can analyze across Profound.
              </p>
              <p className="text-sm text-muted-foreground">
                Also, configure the regions, languages, and platforms that you would like to run the new prompts in.
              </p>
            </div>

            {/* Brand Context */}
            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Help us understand your brand. The more context you share, the better we can track how you show up in AI-generated answers.
              </p>
            </div>
          </div>

          {/* Right Side - Configuration Form */}
          <div className="space-y-6">
            {/* Topic Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Topics</label>
              <div className="space-y-2">
                {topics.map((topic) => (
                  <div key={topic.id} className="flex items-center gap-2">
                    <Select defaultValue={topic.name}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Conversion Rate Optimization">Conversion Rate Optimization</SelectItem>
                        <SelectItem value="Personalization">Personalization</SelectItem>
                        <SelectItem value="A/B Testing">A/B Testing</SelectItem>
                        <SelectItem value="User Experience">User Experience</SelectItem>
                        <SelectItem value="Marketing Analytics">Marketing Analytics</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTopic(topic.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addTopic} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Topic
                </Button>
              </div>
            </div>

            {/* Prompts per topic */}
            <div>
              <label className="text-sm font-medium mb-2 block">Prompts per topic</label>
              <Input
                type="number"
                value={promptsPerTopic}
                onChange={(e) => setPromptsPerTopic(e.target.value)}
                className="w-32"
              />
            </div>

            {/* Region */}
            <div>
              <label className="text-sm font-medium mb-2 block">Region</label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">{regionFlags.us} United States</SelectItem>
                  <SelectItem value="uk">{regionFlags.uk} United Kingdom</SelectItem>
                  <SelectItem value="ca">{regionFlags.ca} Canada</SelectItem>
                  <SelectItem value="au">{regionFlags.au} Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div>
              <label className="text-sm font-medium mb-2 block">Language</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">{languageIcons["en-US"]} English (en-US)</SelectItem>
                  <SelectItem value="en-GB">{languageIcons["en-GB"]} English (en-GB)</SelectItem>
                  <SelectItem value="es-ES">{languageIcons["es-ES"]} Spanish (es-ES)</SelectItem>
                  <SelectItem value="fr-FR">{languageIcons["fr-FR"]} French (fr-FR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Platforms */}
            <div>
              <label className="text-sm font-medium mb-2 block">Platforms</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>{platforms.length} platforms</span>
                      <div className="flex gap-1">
                        {platforms.slice(0, 4).map((platformId) => (
                          <div key={platformId} className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                            {platformIcons[platformId as keyof typeof platformIcons]}
                          </div>
                        ))}
                      </div>
                    </div>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <div className="p-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search"
                        value={platformSearch}
                        onChange={(e) => setPlatformSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="border-t">
                    {platformData
                      .filter(platform => 
                        platform.name.toLowerCase().includes(platformSearch.toLowerCase())
                      )
                      .map((platform) => (
                        <div
                          key={platform.id}
                          className="flex items-center space-x-3 p-3 hover:bg-muted/50 cursor-pointer"
                          onClick={() => togglePlatform(platform.id)}
                        >
                          <Checkbox
                            checked={platforms.includes(platform.id)}
                            onChange={() => togglePlatform(platform.id)}
                          />
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-sm">
                            {platform.icon}
                          </div>
                          <span className="text-sm font-medium">{platform.name}</span>
                        </div>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Additional Instructions */}
            <div>
              <label className="text-sm font-medium mb-2 block">Additional instructions</label>
              <Textarea
                placeholder="Enter any additional instructions for prompt generation..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="text-sm font-medium mb-2 block">Upload Excel Sheet (Optional)</label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {uploadedFile ? uploadedFile.name : "Click to upload Excel file"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports .xlsx, .xls, .csv files
                  </p>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            Help us understand your brand. The more context you share, the better we can track how you show up in AI-generated answers.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Generate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
