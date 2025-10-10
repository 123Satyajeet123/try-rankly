'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { NavigationArrows } from '@/components/NavigationArrows'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import apiService from '@/services/api'

interface Topic {
  id: string
  name: string
  description?: string
  selected: boolean
}

export default function TopicsPage() {
  const router = useRouter()
  const { data, updateData } = useOnboarding()
  const { isAuthenticated, isLoading } = useAuth()
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedCount, setSelectedCount] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingCustom, setIsAddingCustom] = useState(false)
  const [customTopicName, setCustomTopicName] = useState('')
  const [customTopicDescription, setCustomTopicDescription] = useState('')
  
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

  // Load topics from analysis results or default values
  useEffect(() => {
    if (data.analysisResults?.topics) {
      // Use ALL AI-generated topics from analysis
      const aiTopics = data.analysisResults.topics.map((topic: any, index: number) => ({
        id: `topic-${index}`,
        name: topic.name,
        description: topic.description,
        selected: false
      }))
      console.log('✅ TopicsPage - Using ALL AI topics:', aiTopics)
      setTopics(aiTopics)
    } else {
      // Default topics
      console.log('⚠️ TopicsPage - No analysis results, using defaults')
      const defaultTopics = [
        'Marketing',
        'Technology',
        'Business',
        'Design'
      ].map((name, index) => ({
        id: `topic-${index}`,
        name,
        description: `${name} related content`,
        selected: false
      }))
      setTopics(defaultTopics)
    }
  }, [data.analysisResults])
  
  const MAX_TOPICS = 2

  const toggleTopic = (id: string) => {
    const topic = topics.find(t => t.id === id)
    if (!topic) return

    // Check if we can select this topic
    if (!topic.selected && selectedCount >= MAX_TOPICS) {
      alert(`You can only select up to ${MAX_TOPICS} topics`)
      return
    }

    setTopics(prev => prev.map(t => 
      t.id === id ? { ...t, selected: !t.selected } : t
    ))

    // Update selected count
    setSelectedCount(prev => topic.selected ? prev - 1 : prev + 1)
  }

  const handleAddCustomTopic = () => {
    if (!customTopicName.trim()) {
      alert('Please enter a topic name')
      return
    }

    // Check if we can add more
    if (selectedCount >= MAX_TOPICS) {
      alert(`You can only select up to ${MAX_TOPICS} topics. Please deselect one before adding a custom topic.`)
      return
    }

    // Add custom topic and automatically select it
    const newTopic: Topic = {
      id: `custom-topic-${Date.now()}`,
      name: customTopicName.trim(),
      description: customTopicDescription.trim() || undefined,
      selected: true
    }

    setTopics(prev => [...prev, newTopic])
    setSelectedCount(prev => prev + 1)
    
    // Reset form
    setCustomTopicName('')
    setCustomTopicDescription('')
    setIsAddingCustom(false)
  }

  const removeTopic = (id: string) => {
    const topic = topics.find(t => t.id === id)
    if (!topic) return

    setTopics(prev => prev.filter(t => t.id !== id))
    
    // Update selected count if it was selected
    if (topic.selected) {
      setSelectedCount(prev => prev - 1)
    }
  }

  const handleContinue = async () => {
    setIsSaving(true)
    
    try {
      // Get only selected topics
      const selectedTopics = topics.filter(t => t.selected)
      
      if (selectedTopics.length === 0) {
        alert('Please select at least one topic')
        setIsSaving(false)
        return
      }

      if (selectedTopics.length > MAX_TOPICS) {
        alert(`You can only select up to ${MAX_TOPICS} topics`)
        setIsSaving(false)
        return
      }

      // Update onboarding data with selected topics
      const selectedTopicNames = selectedTopics.map(t => t.name)
      updateData({
        topics: selectedTopics,
        selectedTopics: new Set(selectedTopicNames)
      })

      // Just save to frontend context and navigate - backend saving will happen in LLM platforms page
      console.log('✅ Topics saved to context successfully')
      router.push('/onboarding/personas')
    } catch (error) {
      console.error('❌ Error saving topics:', error)
      alert('Failed to save topics. Please try again.')
    } finally {
      setIsSaving(false)
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
    <main className="relative flex h-screen w-full items-center justify-center bg-background text-foreground">
      {/* Background Beams */}
      <BackgroundBeams className="absolute inset-0 z-0" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[400px] relative z-10"
      >
        <Card className="w-full rounded-lg p-6 sm:p-8 relative">
          {/* Navigation Arrows */}
          <NavigationArrows 
            previousPath="/onboarding/competitors"
            nextPath="/onboarding/personas"
          />
          <CardContent className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">
                Select Your Topics
              </h1>
              <p className="text-sm font-normal leading-[1.4] text-muted-foreground">
                Click to select up to {MAX_TOPICS} topics for analysis
              </p>
              <p className="text-xs text-muted-foreground">
                Selected: {selectedCount}/{MAX_TOPICS}
              </p>
            </div>

            {/* Topic Selection Grid */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={`flex items-center space-x-3 rounded-md p-3 transition-all duration-200 ${
                    topic.selected
                      ? 'bg-primary/20 border-2 border-primary/50'
                      : 'bg-muted/50 border-2 border-transparent hover:bg-muted/70'
                  }`}
                >
                  {/* Selection Checkbox - Clickable */}
                  <div 
                    onClick={() => toggleTopic(topic.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                      topic.selected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/50'
                    }`}
                  >
                    {topic.selected && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Topic Info - Clickable */}
                  <div 
                    onClick={() => toggleTopic(topic.id)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {topic.name}
                    </p>
                    {topic.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {topic.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Delete button for custom topics */}
                  {topic.id.startsWith('custom-') && (
                    <button
                      type="button"
                      onClick={() => removeTopic(topic.id)}
                      className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  
                  {/* Selection Status */}
                  {topic.selected && !topic.id.startsWith('custom-') && (
                    <div className="text-primary">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Custom Topic Section */}
            {!isAddingCustom ? (
              <Button
                type="button"
                onClick={() => setIsAddingCustom(true)}
                variant="outline"
                className="w-full h-10 font-medium"
                disabled={isSaving}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Custom Topic
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-muted/30 rounded-md border-2 border-dashed border-muted-foreground/30">
                <Input
                  type="text"
                  value={customTopicName}
                  onChange={(e) => setCustomTopicName(e.target.value)}
                  placeholder="Topic name (e.g., AI Technology)"
                  className="h-9 text-sm"
                />
                <Input
                  type="text"
                  value={customTopicDescription}
                  onChange={(e) => setCustomTopicDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="h-9 text-sm"
                />
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={handleAddCustomTopic}
                    className="flex-1 h-9 text-sm"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsAddingCustom(false)
                      setCustomTopicName('')
                      setCustomTopicDescription('')
                    }}
                    variant="outline"
                    className="flex-1 h-9 text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              className="w-full h-10 font-semibold"
              disabled={isSaving || selectedCount === 0}
            >
              {isSaving ? 'Saving...' : `Continue with ${selectedCount} Topic${selectedCount !== 1 ? 's' : ''}`}
            </Button>

            {/* Selection Status */}
            {selectedCount > 0 && (
              <p className="text-center text-xs font-normal text-muted-foreground">
                {selectedCount} topic{selectedCount !== 1 ? 's' : ''} selected
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  )
}
