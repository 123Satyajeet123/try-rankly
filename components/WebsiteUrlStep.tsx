'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NavigationArrows } from '@/components/NavigationArrows'

const loaderSteps = [
  "Scraping your website and understanding brand context",
  "Identifying closest competitors",
  "Analyzing key topics mentioned on your page",
  "Detecting user personas from your brand context"
]

export function WebsiteUrlStep({ onContinue, isLoading, initialUrl, previousPath, nextPath, analysisSuccess, analysisError }: any) {
  const router = useRouter()
  const [url, setUrl] = useState(initialUrl || '')
  const [currentStep, setCurrentStep] = useState(0)
  const [allDone, setAllDone] = useState(false)
  const [start, setStart] = useState(false)
  const [startSpinning, setStartSpinning] = useState(false)
  const [showAnalyzing, setShowAnalyzing] = useState(false)

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  const runSequentialLoaders = async () => {
    setStart(true)
    for (let i = 0; i < loaderSteps.length; i++) {
      setCurrentStep(i) // Use 0-based indexing: 0, 1, 2, 3
      await new Promise((resolve) => setTimeout(resolve, 1800))
    }
    // After all loaders complete, set currentStep to 4 to show all as completed
    setCurrentStep(4)
    setAllDone(true)
  }

  const handleSubmit = (e: any) => {
    e.preventDefault()
    if (isValidUrl(url)) {
      setShowAnalyzing(true)
      setStartSpinning(true)
      onContinue?.(url)
      
      // Hide "Analyzing..." button after primary loader completes (2 seconds)
      setTimeout(() => {
        setShowAnalyzing(false)
        runSequentialLoaders()
      }, 2000)
    }
  }

  const handleNext = () => {
    console.log('🚀 WebsiteUrlStep - Navigating to:', nextPath || '/onboarding/competitors')
    router.push(nextPath || '/onboarding/competitors')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 md:p-10 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-4xl relative z-10"
      >
        <Card className="w-full overflow-hidden rounded-lg h-[600px] relative">
          <NavigationArrows previousPath={previousPath} nextPath={allDone && analysisSuccess ? nextPath : undefined} showNext={allDone && analysisSuccess} />

          <CardContent className="grid p-0 md:grid-cols-2 h-full">
            {/* Left: Form */}
            <div className="bg-background p-8 flex flex-col justify-start items-start relative">
              <div className="text-left space-y-6 max-w-md mt-32">
                <div>
                  <h1 className="text-xl font-semibold mb-2 text-foreground">Enter any page or website URL</h1>
                  <p className="text-sm text-muted-foreground">
                    Rankly runs a page-level scan to extract brand context, topics, personas and direct competitors.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="url" className="text-xs text-muted-foreground">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-10 bg-background border border-border"
                  />
                </div>
                
                {!start && (
                  <form onSubmit={handleSubmit} className="w-full">
                    <Button
                      type="submit"
                      disabled={!isValidUrl(url) || showAnalyzing}
                      className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {showAnalyzing ? (
                        <span className="flex items-center gap-1">
                          Analyzing
                          <span className="flex gap-1">
                            <span className="animate-pulse">.</span>
                            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                          </span>
                        </span>
                      ) : (
                        "Analyze"
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* Right: Primary loader and Sequential loaders */}
            <div className="bg-muted flex flex-col justify-start items-center text-center p-8 h-full relative">
              {/* Primary loader - always visible */}
              {!start && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto bg-muted-foreground/10 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    {/* Spinning boundary - only when analysis starts */}
                    {startSpinning && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 w-20 h-20 border-2 border-foreground border-t-transparent rounded-full"
                      />
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col items-center justify-start gap-5 w-full max-w-md mt-32">
                
                {/* Sequential loaders - when analysis starts */}
                {start && (
                  <div className="flex flex-col items-center justify-start gap-5 w-full max-w-xs">
                    {loaderSteps.map((step, index) => {
                      // Only show completed and current loaders (currentStep: 0,1,2,3,4)
                      if (index > currentStep) return null
                      
                      return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-start gap-3 w-full"
                      >
                        <div className="flex-shrink-0 w-5 h-5">
                          {index < currentStep || currentStep === 4 ? (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          ) : index === currentStep ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded-full" />
                          )}
                        </div>
                          <span className="text-sm text-foreground text-left">{step}</span>
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                {/* Button - only when all loaders complete AND API call was successful */}
                {allDone && analysisSuccess && (
                  <div className="w-full max-w-xs">
                    <Button
                      onClick={handleNext}
                      className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold flex items-center justify-center gap-2"
                    >
                      <span>Identify your competitors</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                )}

                {/* Error message - when analysis fails */}
                {!isLoading && analysisError && (
                  <div className="w-full max-w-xs">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h3 className="text-sm font-semibold text-red-800">Analysis Failed</h3>
                          <p className="text-sm text-red-600 mt-1">{analysisError}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => window.location.reload()}
                        className="w-full mt-3 h-8 bg-red-600 text-white hover:bg-red-700 text-sm"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  )
}