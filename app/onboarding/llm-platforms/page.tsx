'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { NavigationArrows } from '@/components/NavigationArrows'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'
import apiService from '@/services/api'

const llmPlatforms = [
  {
    name: 'ChatGPT',
    favicon: 'https://chatgpt.com/favicon.ico',
    description: 'OpenAI\'s conversational AI'
  },
  {
    name: 'Perplexity',
    favicon: 'https://www.perplexity.ai/favicon.ico',
    description: 'AI-powered search engine'
  },
  {
    name: 'Gemini',
    favicon: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
    description: 'Google\'s AI assistant'
  },
  {
    name: 'Claude',
    favicon: 'https://claude.ai/favicon.ico',
    description: 'Anthropic\'s AI assistant'
  },
  {
    name: 'Grok',
    favicon: 'https://img.icons8.com/?size=512&id=USGXKHXKl9X7&format=png',
    description: 'X\'s AI assistant'
  }
]

export default function LLMPlatformsPage() {
  const router = useRouter()
  const { data, updateData } = useOnboarding()
  const { isAuthenticated, isLoading } = useAuth()
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['ChatGPT', 'Gemini'])
  const [isGenerating, setIsGenerating] = useState(false)
  const [buttonText, setButtonText] = useState('Generate Prompts')
  const [showResults, setShowResults] = useState(false)
  
  // Redirect to signin if not authenticated or if analysis not completed
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/onboarding/signin')
      return
    }
    
    // Redirect to website analysis if analysis not completed
    if (!isLoading && isAuthenticated && !data.analysisCompleted) {
      console.log('⚠️ Analysis not completed, redirecting to website page')
      router.push('/onboarding/website')
      return
    }
  }, [isAuthenticated, isLoading, router, data.analysisCompleted])

  const togglePlatform = (platformName: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformName) 
        ? prev.filter(p => p !== platformName)
        : [...prev, platformName]
    )
  }

  const handleContinue = async () => {
    if (showResults) {
      // Navigate to results page
      router.push('/onboarding/results')
      return
    }

    setIsGenerating(true)
    setButtonText('Generating Prompts')
    
    try {
      // Get selected data for prompt generation
      // The selectedCompetitors, selectedTopics, selectedPersonas are already arrays/sets of the actual values
      const selectedCompetitorUrls = Array.from(data.selectedCompetitors)
      const selectedTopicNames = Array.from(data.selectedTopics)
      const selectedPersonaTypes = Array.from(data.selectedPersonas)

      console.log('🎯 Starting prompt generation...')
      console.log('Selected competitors:', selectedCompetitorUrls)
      console.log('Selected topics:', selectedTopicNames)
      console.log('Selected personas:', selectedPersonaTypes)
      console.log('🔍 Current onboarding data:', data)

      // First, update selections in the backend database
      const selectionResponse = await apiService.updateSelections(
        selectedCompetitorUrls,
        selectedTopicNames,
        selectedPersonaTypes
      )

      console.log('✅ Selections saved:', selectionResponse)

      // Now generate prompts
      const response = await apiService.generatePrompts()

      if (response.success) {
        console.log('✅ Prompts generated successfully:', response.data)
        console.log(`📊 Total prompts: ${response.data.totalPrompts}`)
        console.log('📝 Generated prompts:', response.data.prompts)

        // Update onboarding data with generated prompts
        console.log('📝 Updating OnboardingContext with generated prompts:', {
          prompts: response.data.prompts,
          totalPrompts: response.data.totalPrompts
        })
        
        updateData({
          region: 'Global',
          language: 'English',
          generatedPrompts: response.data.prompts,
          totalPrompts: response.data.totalPrompts
        })

        // Now test prompts with multi-LLM and calculate metrics
        console.log('🧪 Starting multi-LLM testing...')
        setButtonText('Testing with LLMs...')
        
        try {
          // STEP 1: Test prompts with all LLMs
          console.log('🧪 [Step 1/2] Starting multi-LLM testing...')
          setButtonText('Testing with LLMs...')
          const testResponse = await apiService.testPrompts()
          console.log('✅ [Step 1/2] Multi-LLM testing completed:', testResponse.data)
          
          // STEP 2: Calculate and aggregate metrics from test results (includes AI insights generation)
          console.log('📊 [Step 2/2] Calculating and aggregating metrics...')
          setButtonText('Calculating metrics...')
          const metricsResponse = await apiService.calculateMetrics()
          
          if (!metricsResponse.success) {
            throw new Error('Metrics calculation failed: ' + (metricsResponse.message || 'Unknown error'))
          }
          
          console.log('✅ [Step 2/3] Metrics calculated and aggregated:', metricsResponse.data)
          console.log(`   📈 Total metric sets: ${metricsResponse.data.totalCalculations || 'N/A'}`)
          console.log(`   🧠 AI Insights generated: ${metricsResponse.data.insightsGenerated ? 'Yes' : 'No'}`)
          
          // Insights are automatically generated during metrics aggregation
          // No separate step needed
          
          // All steps completed successfully!
          console.log('🎉 All processing complete! Ready for dashboard.')
          
          // Show "See Results" button only after API calls complete
          setIsGenerating(false)
          setButtonText('See Results')
          setShowResults(true)
          
        } catch (processingError) {
          console.error('❌ Processing failed:', processingError)
          setIsGenerating(false)
          setButtonText('Generate Prompts')
          // Show error to user
          alert(`Processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}. Please try again.`)
        }
      } else {
        console.error('❌ Prompt generation failed:', response.message)
        setIsGenerating(false)
        setButtonText('Generate Prompts')
      }
    } catch (error: any) {
      console.error('❌ Prompt generation error:', error)
      setIsGenerating(false)
      setButtonText('Generate Prompts')
    }
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </main>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 md:p-10 relative">
      <BackgroundBeams className="absolute inset-0 z-0" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-4xl relative z-10"
      >
        <Card className="w-full overflow-hidden rounded-lg h-[600px] relative">
          {/* Navigation Arrows */}
          <NavigationArrows 
            previousPath="/onboarding/personas"
            nextPath="/onboarding/results"
          />
          <CardContent className="grid p-0 md:grid-cols-2 h-full">
            {/* Left Section - Region & Language Selection (Light Background) */}
            <div className="bg-background p-6 sm:p-8 flex flex-col justify-center">
              <div className="space-y-6">
                <div className="text-left">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">
                    Region & Language
                  </h1>
                  <p className="text-sm font-normal leading-[1.4] text-muted-foreground">
                    Select target region and language for prompt generation
                  </p>
                </div>
                
                <div className="space-y-4">
                  {/* Region Section */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium tracking-wide text-muted-foreground">Region</label>
                    <div className="flex items-center justify-between w-full h-10 bg-muted border border-border text-foreground rounded-md px-3">
                      <span className="flex items-center space-x-2 text-sm">
                        <span>🌍</span>
                        <span>Global</span>
                      </span>
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>

                  {/* Language Section */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium tracking-wide text-muted-foreground">Language</label>
                    <div className="flex items-center justify-between w-full h-10 bg-muted border border-border text-foreground rounded-md px-3">
                      <span className="flex items-center space-x-2 text-sm">
                        <span>🇺🇸</span>
                        <span>English</span>
                      </span>
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handleContinue}
                  disabled={isGenerating && !showResults}
                  className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  {isGenerating ? (
                    <>
                      {buttonText}
                      <span className="animate-pulse">...</span>
                    </>
                  ) : (
                    buttonText
                  )}
                </Button>
                
                <p className="text-center text-xs font-normal text-muted-foreground">
                  More regions and languages soon…
                </p>
              </div>
            </div>

            {/* Right Section - LLM Platform Display (Dark Background) */}
            <div className="bg-muted p-6 sm:p-8 flex flex-col justify-center">
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground mb-1">
                    Generating prompts based on
                  </h2>
                  <p className="text-sm font-normal leading-[1.4] text-muted-foreground">
                    Topics × User Personas × Region × Language
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-6">
                  {/* First row - 3 icons */}
                  <div className="flex items-center justify-center gap-8">
                    {llmPlatforms.slice(0, 3).map((platform) => (
                      <motion.div
                        key={platform.name}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: llmPlatforms.indexOf(platform) * 0.1 }}
                        className="flex flex-col items-center space-y-2"
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shadow-lg">
                            <img
                              src={platform.favicon}
                              alt={`${platform.name} favicon`}
                              className="w-7 h-7"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  // Create fallback based on platform
                                  let bgColor = 'bg-blue-500'
                                  const text = platform.name[0]
                                  
                                  if (platform.name === 'ChatGPT') bgColor = 'bg-teal-500'
                                  else if (platform.name === 'Gemini') bgColor = 'bg-blue-600'
                                  else if (platform.name === 'Claude') bgColor = 'bg-orange-500'
                                  else if (platform.name === 'Perplexity') bgColor = 'bg-purple-500'
                                  else if (platform.name === 'Grok') bgColor = 'bg-black'
                                  
                                  parent.innerHTML = `<div class="w-7 h-7 rounded-full ${bgColor} text-white flex items-center justify-center font-bold text-sm">${text}</div>`
                                }
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-foreground font-medium text-xs text-center">{platform.name}</span>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Second row - 2 icons */}
                  <div className="flex items-center justify-center gap-8">
                    {llmPlatforms.slice(3, 5).map((platform) => (
                      <motion.div
                        key={platform.name}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: llmPlatforms.indexOf(platform) * 0.1 }}
                        className="flex flex-col items-center space-y-2"
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shadow-lg">
                            <img
                              src={platform.favicon}
                              alt={`${platform.name} favicon`}
                              className="w-7 h-7"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  // Create fallback based on platform
                                  let bgColor = 'bg-blue-500'
                                  const text = platform.name[0]
                                  
                                  if (platform.name === 'ChatGPT') bgColor = 'bg-teal-500'
                                  else if (platform.name === 'Gemini') bgColor = 'bg-blue-600'
                                  else if (platform.name === 'Claude') bgColor = 'bg-orange-500'
                                  else if (platform.name === 'Perplexity') bgColor = 'bg-purple-500'
                                  else if (platform.name === 'Grok') bgColor = 'bg-black'
                                  
                                  parent.innerHTML = `<div class="w-7 h-7 rounded-full ${bgColor} text-white flex items-center justify-center font-bold text-sm">${text}</div>`
                                }
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-foreground font-medium text-xs text-center">{platform.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="text-center pt-4">
                  <p className="text-xs font-normal text-muted-foreground">
                    More LLMs coming soon…
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  )
}
