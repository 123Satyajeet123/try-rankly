'use client'

import { motion } from 'framer-motion'
import { Loader2, Sparkles, Brain, FileText, Wand2, Search, Target, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { EllipsisLoader } from './ellipsis-loader'

const loaderSteps = {
  create: [
    "Identifying semantic gaps in your domain",
    "Analyzing LLM citation graph for missing topics",
    "Mapping relevant personas and user intents",
    "Researching trending keywords and entities",
    "Generating a new outline using Rankly's 9 Optimization Framework",
    "Applying writing strategies — Authority, Fluency, and Technical Depth",
    "Finalizing draft with schema, FAQs, and structured data",
  ],
  regenerate: [
    "Retrieving existing page content",
    "Analyzing LLM citation depth and sentiment",
    "Detecting weaknesses in topical authority",
    "Enhancing structure and semantic flow",
    "Reinforcing entity clarity and keyword cohesion",
    "Inserting updated citations and schema markup",
    "Applying Rankly's 9 Writing Strategies for maximum visibility",
  ]
}

const icons = {
  create: [Search, Target, Brain, FileText, Wand2, Sparkles, Zap],
  regenerate: [FileText, Brain, Target, Wand2, Sparkles, Zap, Loader2]
}

interface ContentGenerationLoaderProps {
  type: 'create' | 'regenerate'
  onComplete?: () => void
}

export function ContentGenerationLoader({ type = "create", onComplete }: ContentGenerationLoaderProps) {
  const steps = loaderSteps[type]
  const stepIcons = icons[type]
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1
        } else {
          setIsComplete(true)
          clearInterval(interval)
          if (onComplete) {
            setTimeout(onComplete, 1000)
          }
          return prev
        }
      })
    }, 1800) // 1.8s per step

    return () => clearInterval(interval)
  }, [steps.length, onComplete])

  const CurrentIcon = stepIcons[currentStep] || Sparkles

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-6 p-8 bg-muted/30 rounded-lg border">
      {/* Animated Icon */}
      <motion.div
        key={currentStep}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <CurrentIcon className="w-10 h-10 text-primary" />
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Current Step Text with Ellipsis Loader */}
      <div className="flex items-baseline justify-center space-x-3">
        <motion.p
          key={currentStep}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            textShadow: "0 0 8px rgba(var(--primary), 0.3)"
          }}
          transition={{ 
            duration: 0.6,
            ease: "easeOut"
          }}
          className="text-sm font-medium text-foreground relative"
        >
          <motion.span
            animate={{ 
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="text-primary"
          >
            {steps[currentStep]}
          </motion.span>
        </motion.p>
        <EllipsisLoader size="sm" color="primary" />
      </div>



      {/* Completion Message */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-2"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Sparkles className="w-6 h-6 text-primary mx-auto" />
          </motion.div>
          <p className="text-sm font-medium text-primary">
            {type === 'create' 
              ? "Draft ready. Scroll down to preview your generated content."
              : "Content regenerated successfully. Compare old vs new below."
            }
          </p>
        </motion.div>
      )}
    </div>
  )
}

