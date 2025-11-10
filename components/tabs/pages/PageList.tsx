'use client'
/**
 * Page List - LLM Traffic Module (Inspired by Fibr's Design)
 *
 * Shows page-level LLM traffic performance with comprehensive analytics
 */

import type { Range } from '@/types/traffic'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Info, Copy, Check, Zap, AlertCircle, AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownTable } from '@/components/ui/markdown-table'
import { ContentGenerationLoader } from '@/components/ui/content-generation-loader'
import { PromptInjectionSheet } from '@/components/ui/prompt-injection-sheet'
import { PagesSkeleton } from '@/components/ui/pages-skeleton'
import type {
  ActionablePageRow,
  ActionableReason,
  ActionableCitationSummary,
  ActionableUrlMapping,
  ActionablePageContentResponse,
  ActionableRegenerateContentResponse,
  RegenerationSummary,
  RegenerationIntent,
  RegenerationPlan,
  RegenerationRewriteMeta,
} from '@/types/actionables'

interface ParsedSection {
  heading: string
  level: number
  normalized: string
  contentLines: string[]
}

interface HighlightStepInfo {
  step: number
  action?: string
  successSignal?: string
}

interface HighlightSection {
  id: string
  index: number
  match: string
  normalized: string
  resolvedHeading?: string | null
  resolvedNormalized?: string | null
  steps: HighlightStepInfo[]
}

interface ParseMarkdownOptions {
  highlightSections?: HighlightSection[]
  onHighlightSelect?: (section: HighlightSection) => void
  selectedHighlight?: string | null
  mode?: 'old' | 'new'
}

const normalizeText = (value: string | null | undefined) =>
  (value || '').toLowerCase().replace(/[\s]+/g, ' ').replace(/[^a-z0-9\s]/g, '').trim()

const buildHighlightSections = (plan?: RegenerationPlan | null): HighlightSection[] => {
  if (!plan?.step_plan || plan.step_plan.length === 0) {
    return []
  }

  const sectionMap = new Map<string, HighlightSection>()
  let counter = 1

  plan.step_plan.forEach((step) => {
    const focusArea = step.focus_area || ''
    const normalized = normalizeText(focusArea)
    if (!normalized) {
      return
    }

    const existing = sectionMap.get(normalized)
    const stepInfo: HighlightStepInfo = {
      step: step.step,
      action: step.action,
      successSignal: step.success_signal,
    }

    if (existing) {
      existing.steps.push(stepInfo)
      if (focusArea.length > existing.match.length) {
        existing.match = focusArea
      }
      return
    }

    sectionMap.set(normalized, {
      id: `section-${normalized}`,
      index: counter++,
      match: focusArea,
      normalized,
      resolvedHeading: null,
      resolvedNormalized: null,
      steps: [stepInfo],
    })
  })

  return Array.from(sectionMap.values())
}

interface HeadingDescriptor {
  raw: string
  normalized: string
  level: number
}

const extractHeadingsFromMarkdown = (content: string): HeadingDescriptor[] => {
  if (!content) {
    return []
  }

  const lines = content.split('\n')
  const headings: HeadingDescriptor[] = []
  lines.forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.*)$/)
    if (!match) {
      return
    }
    const level = match[1].length
    const text = match[2].trim()
    if (!text) {
      return
    }
    headings.push({
      raw: text,
      normalized: normalizeText(text),
      level,
    })
  })
  return headings
}

const resolveHighlightMatches = (sections: HighlightSection[], newContent: string): HighlightSection[] => {
  if (sections.length === 0) {
    return sections
  }

  const headings = extractHeadingsFromMarkdown(newContent)
  if (headings.length === 0) {
    return sections
  }

  const chooseHeading = (section: HighlightSection): HeadingDescriptor | null => {
    const normalizedMatch = section.normalized
    const byExact = headings.find((heading) => heading.normalized === normalizedMatch)
    if (byExact) {
      return byExact
    }

    const targetTokens = section.match.toLowerCase().split(/\s+/).filter(Boolean)
    const scoreHeading = (heading: HeadingDescriptor) => {
      let score = 0
      targetTokens.forEach((token) => {
        if (heading.normalized.includes(token)) {
          score += token.length
        }
      })
      return score
    }

    const scored = headings
      .map((heading) => ({
        heading,
        score: scoreHeading(heading),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.heading.level - b.heading.level)

    return scored.length > 0 ? scored[0].heading : null
  }

  return sections.map((section) => {
    const match = chooseHeading(section)
    if (!match) {
      return section
    }
    return {
      ...section,
      resolvedHeading: match.raw,
      resolvedNormalized: match.normalized,
    }
  })
}

const parseMarkdownSections = (content: string): ParsedSection[] => {
  const lines = content.split('\n')
  const sections: ParsedSection[] = []
  let current: ParsedSection | null = null

  lines.forEach((line) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const heading = headingMatch[2].trim()
      const normalized = normalizeText(heading)
      if (current) {
        sections.push(current)
      }
      current = {
        heading,
        level,
        normalized,
        contentLines: [],
      }
    } else if (current) {
      current.contentLines.push(line)
    }
  })

  if (current) {
    sections.push(current)
  }

  return sections
}

const mergeSections = (
  originalContent: string,
  regeneratedContent: string,
  highlights: HighlightSection[],
): { mergedContent: string; mergedHighlights: HighlightSection[] } => {
  const originalSections = parseMarkdownSections(originalContent)
  const regeneratedSections = parseMarkdownSections(regeneratedContent)

  const highlightMap = new Map<string, HighlightSection>()
  highlights.forEach((section) => {
    const key = section.resolvedNormalized || section.normalized
    if (key) {
      highlightMap.set(key, section)
    }
  })

  const regeneratedMap = new Map<string, ParsedSection>()
  regeneratedSections.forEach((section) => {
    regeneratedMap.set(section.normalized, section)
  })

  const mergedLines: string[] = []
  const mergedHighlights: HighlightSection[] = []

  originalSections.forEach((section) => {
    mergedLines.push(`${'#'.repeat(section.level)} ${section.heading}`)

    const highlight = highlightMap.get(section.normalized)
    if (highlight) {
      const resolvedKey = highlight.resolvedNormalized || highlight.normalized
      const replacement = resolvedKey ? regeneratedMap.get(resolvedKey) : undefined

      if (replacement) {
        mergedLines.push(...replacement.contentLines)
        mergedHighlights.push({
          ...highlight,
          resolvedHeading: replacement.heading,
          resolvedNormalized: replacement.normalized,
        })
        return
      }
    }

    mergedLines.push(...section.contentLines)
  })

  return {
    mergedContent: mergedLines.join('\n'),
    mergedHighlights,
  }
}

import apiService from '@/services/api'

// Function to parse markdown content and render it properly
function parseMarkdown(content: string, options?: ParseMarkdownOptions) {
  const lines = content.split('\n')
  const elements: ReactNode[] = []
  let i = 0
  const highlightSections = options?.highlightSections ?? []
  const mode = options?.mode ?? 'old'
  let activeHighlight: HighlightSection | null = null
  let activeHighlightLevel = Number.POSITIVE_INFINITY

  const resolveNormalized = (section: HighlightSection | undefined, mode: 'old' | 'new'): string | null => {
    if (!section) {
      return null
    }
    return mode === 'new'
      ? section.resolvedNormalized || section.normalized
      : section.normalized
  }

  const isHighlightSelected = (highlight?: HighlightSection | null) => {
    if (!highlight || !options?.selectedHighlight) {
      return false
    }
    return (
      highlight.normalized === options.selectedHighlight ||
      highlight.resolvedNormalized === options.selectedHighlight
    )
  }

  const getHighlightProps = (highlight?: HighlightSection | null) => {
    if (!highlight) {
      return {
        className: '',
        dataHighlight: undefined as string | undefined,
        isSelected: false,
      }
    }
    const isSelected = isHighlightSelected(highlight)
    return {
      className: computeHighlightClass(true, isSelected),
      dataHighlight: resolveNormalized(highlight, mode) || undefined,
      isSelected,
    }
  }

  const updateActiveHighlight = (level: number, highlight?: HighlightSection) => {
    if (highlight) {
      activeHighlight = highlight
      activeHighlightLevel = level
      return
    }

    if (activeHighlight && level <= activeHighlightLevel) {
      activeHighlight = null
      activeHighlightLevel = Number.POSITIVE_INFINITY
    }
  }

  const mergeClasses = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ')

  const findHighlight = (heading: string) => {
    const normalizedHeading = normalizeText(heading)
    if (!normalizedHeading) return undefined
    return highlightSections.find((section) => {
      const potentialMatches = [
        section.normalized,
        section.resolvedNormalized,
      ].filter(Boolean) as string[]

      if (potentialMatches.some((match) => match && normalizedHeading === match)) {
        return true
      }

      if (potentialMatches.some((match) => match && normalizedHeading.includes(match))) {
        return true
      }

      return heading.toLowerCase().includes(section.match.toLowerCase())
    })
  }

  const renderHighlightMeta = (highlight: HighlightSection | undefined, keyPrefix: string, shouldShow: boolean) => {
    if (!shouldShow || !highlight || highlight.steps.length === 0) {
      return null
    }

    return (
      <div className="ml-1 text-[11px] text-primary/80 space-y-1">
        {highlight.steps.slice(0, 2).map((stepInfo, index) => (
          <div key={`${keyPrefix}-step-${stepInfo.step}-${index}`}>
            <span className="font-semibold">Step {stepInfo.step}:</span>{' '}
            {stepInfo.action || 'See regeneration plan for details.'}
            {stepInfo.successSignal && (
              <div className="italic text-primary/70">Success signal: {stepInfo.successSignal}</div>
            )}
          </div>
        ))}
        {highlight.steps.length > 2 && (
          <div className="text-primary/60">
            +{highlight.steps.length - 2} more step{highlight.steps.length - 2 === 1 ? '' : 's'}
          </div>
        )}
      </div>
    )
  }

  const computeHighlightClass = (hasHighlight: boolean, isSelected: boolean) => {
    if (!hasHighlight) {
      return ''
    }
    const mode = options?.mode ?? 'old'
    if (mode === 'new') {
      return isSelected
        ? 'pl-3 border-l-4 border-primary bg-primary/20 rounded'
        : 'pl-3 border-l-4 border-primary/30 bg-primary/5 rounded'
    }
    return isSelected
      ? 'pl-3 border-l-4 border-primary bg-primary/20 rounded'
      : 'pl-3 border-l-4 border-primary/60 bg-primary/10 rounded'
  }

  while (i < lines.length) {
    const line = lines[i]
    
    // Headers (H1-H6)
    if (line.startsWith('# ')) {
      const headingText = line.slice(2)
      const highlight = findHighlight(headingText)
      const targetNormalized = resolveNormalized(highlight, mode)
      const isSelected = Boolean(
        highlight &&
        options?.selectedHighlight &&
        (
          highlight.normalized === options.selectedHighlight ||
          highlight.resolvedNormalized === options.selectedHighlight
        )
      )
      const isInteractive = Boolean(highlight && options?.onHighlightSelect && mode === 'old')
      const containerClass = `space-y-1 ${isInteractive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 rounded-md' : ''}`
      const headingClass = `text-2xl font-bold mb-4 mt-6 text-foreground ${computeHighlightClass(Boolean(highlight), isSelected)}`
      const handleClick = () => {
        if (isInteractive && highlight) {
          options?.onHighlightSelect?.(highlight)
        }
      }
      const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!isInteractive || !highlight) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          options?.onHighlightSelect?.(highlight)
        }
      }
      elements.push(
        <div
          key={`h1-${i}`}
          className={containerClass}
          data-highlight={targetNormalized || undefined}
          role={isInteractive ? 'button' : undefined}
          tabIndex={isInteractive ? 0 : undefined}
          aria-pressed={isInteractive ? isSelected : undefined}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-start gap-2">
            <h1 className={headingClass} dangerouslySetInnerHTML={{ __html: parseInlineFormatting(headingText) }} />
            {highlight && (
              <sup className="ml-1 text-[10px] font-semibold text-primary align-super">{highlight.index}</sup>
            )}
            {highlight && options?.mode === 'old' && (
              <Badge variant="outline" className="mt-6 bg-primary/10 text-primary border-primary/40">
                Regenerated
              </Badge>
            )}
          </div>
          {renderHighlightMeta(highlight, `h1-${i}`, options?.mode === 'old' || isSelected)}
        </div>
      )
      updateActiveHighlight(1, highlight)
    } else if (line.startsWith('## ')) {
      const headingText = line.slice(3)
      const highlight = findHighlight(headingText)
      const targetNormalized = resolveNormalized(highlight, mode)
      const isSelected = Boolean(
        highlight &&
        options?.selectedHighlight &&
        (
          highlight.normalized === options.selectedHighlight ||
          highlight.resolvedNormalized === options.selectedHighlight
        )
      )
      const isInteractive = Boolean(highlight && options?.onHighlightSelect && mode === 'old')
      const containerClass = `space-y-1 ${isInteractive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 rounded-md' : ''}`
      const headingClass = `text-xl font-semibold mb-3 mt-5 text-foreground ${computeHighlightClass(Boolean(highlight), isSelected)}`
      const handleClick = () => {
        if (isInteractive && highlight) {
          options?.onHighlightSelect?.(highlight)
        }
      }
      const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!isInteractive || !highlight) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          options?.onHighlightSelect?.(highlight)
        }
      }
      elements.push(
        <div
          key={`h2-${i}`}
          className={containerClass}
          data-highlight={targetNormalized || undefined}
          role={isInteractive ? 'button' : undefined}
          tabIndex={isInteractive ? 0 : undefined}
          aria-pressed={isInteractive ? isSelected : undefined}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-start gap-2">
            <h2 className={headingClass} dangerouslySetInnerHTML={{ __html: parseInlineFormatting(headingText) }} />
            {highlight && (
              <sup className="ml-1 text-[10px] font-semibold text-primary align-super">{highlight.index}</sup>
            )}
            {highlight && options?.mode === 'old' && (
              <Badge variant="outline" className="mt-5 bg-primary/10 text-primary border-primary/40">
                Regenerated
              </Badge>
            )}
          </div>
          {renderHighlightMeta(highlight, `h2-${i}`, options?.mode === 'old' || isSelected)}
        </div>
      )
      updateActiveHighlight(2, highlight)
    } else if (line.startsWith('### ')) {
      const headingText = line.slice(4)
      const highlight = findHighlight(headingText)
      const targetNormalized = resolveNormalized(highlight, mode)
      const isSelected = Boolean(
        highlight &&
        options?.selectedHighlight &&
        (
          highlight.normalized === options.selectedHighlight ||
          highlight.resolvedNormalized === options.selectedHighlight
        )
      )
      const isInteractive = Boolean(highlight && options?.onHighlightSelect && mode === 'old')
      const containerClass = `space-y-1 ${isInteractive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 rounded-md' : ''}`
      const headingClass = `text-lg font-medium mb-2 mt-4 text-foreground ${computeHighlightClass(Boolean(highlight), isSelected)}`
      const handleClick = () => {
        if (isInteractive && highlight) {
          options?.onHighlightSelect?.(highlight)
        }
      }
      const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!isInteractive || !highlight) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          options?.onHighlightSelect?.(highlight)
        }
      }
      elements.push(
        <div
          key={`h3-${i}`}
          className={containerClass}
          data-highlight={targetNormalized || undefined}
          role={isInteractive ? 'button' : undefined}
          tabIndex={isInteractive ? 0 : undefined}
          aria-pressed={isInteractive ? isSelected : undefined}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-start gap-2">
            <h3 className={headingClass} dangerouslySetInnerHTML={{ __html: parseInlineFormatting(headingText) }} />
            {highlight && (
              <sup className="ml-1 text-[10px] font-semibold text-primary align-super">{highlight.index}</sup>
            )}
            {highlight && options?.mode === 'old' && (
              <Badge variant="outline" className="mt-4 bg-primary/10 text-primary border-primary/40">
                Regenerated
              </Badge>
            )}
          </div>
          {renderHighlightMeta(highlight, `h3-${i}`, options?.mode === 'old' || isSelected)}
        </div>
      )
      updateActiveHighlight(3, highlight)
    } else if (line.startsWith('#### ')) {
      const headingText = line.slice(5)
      const highlight = findHighlight(headingText)
      const targetNormalized = resolveNormalized(highlight, mode)
      const isSelected = Boolean(
        highlight &&
        options?.selectedHighlight &&
        (
          highlight.normalized === options.selectedHighlight ||
          highlight.resolvedNormalized === options.selectedHighlight
        )
      )
      const isInteractive = Boolean(highlight && options?.onHighlightSelect && mode === 'old')
      const containerClass = `space-y-1 ${isInteractive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 rounded-md' : ''}`
      const headingClass = `text-base font-medium mb-2 mt-3 text-foreground ${computeHighlightClass(Boolean(highlight), isSelected)}`
      const handleClick = () => {
        if (isInteractive && highlight) {
          options?.onHighlightSelect?.(highlight)
        }
      }
      const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!isInteractive || !highlight) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          options?.onHighlightSelect?.(highlight)
        }
      }
      elements.push(
        <div
          key={`h4-${i}`}
          className={containerClass}
          data-highlight={targetNormalized || undefined}
          role={isInteractive ? 'button' : undefined}
          tabIndex={isInteractive ? 0 : undefined}
          aria-pressed={isInteractive ? isSelected : undefined}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-start gap-2">
            <h4 className={headingClass} dangerouslySetInnerHTML={{ __html: parseInlineFormatting(headingText) }} />
            {highlight && (
              <sup className="ml-1 text-[10px] font-semibold text-primary align-super">{highlight.index}</sup>
            )}
            {highlight && options?.mode === 'old' && (
              <Badge variant="outline" className="mt-3 bg-primary/10 text-primary border-primary/40">
                Regenerated
              </Badge>
            )}
          </div>
          {renderHighlightMeta(highlight, `h4-${i}`, options?.mode === 'old' || isSelected)}
        </div>
      )
      updateActiveHighlight(4, highlight)
    } else if (line.startsWith('##### ')) {
      const headingText = line.slice(6)
      const highlight = findHighlight(headingText)
      const targetNormalized = resolveNormalized(highlight, mode)
      const isSelected = Boolean(
        highlight &&
        options?.selectedHighlight &&
        (
          highlight.normalized === options.selectedHighlight ||
          highlight.resolvedNormalized === options.selectedHighlight
        )
      )
      const isInteractive = Boolean(highlight && options?.onHighlightSelect && mode === 'old')
      const containerClass = `space-y-1 ${isInteractive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 rounded-md' : ''}`
      const headingClass = `text-sm font-medium mb-1 mt-2 text-foreground ${computeHighlightClass(Boolean(highlight), isSelected)}`
      const handleClick = () => {
        if (isInteractive && highlight) {
          options?.onHighlightSelect?.(highlight)
        }
      }
      const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!isInteractive || !highlight) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          options?.onHighlightSelect?.(highlight)
        }
      }
      elements.push(
        <div
          key={`h5-${i}`}
          className={containerClass}
          data-highlight={targetNormalized || undefined}
          role={isInteractive ? 'button' : undefined}
          tabIndex={isInteractive ? 0 : undefined}
          aria-pressed={isInteractive ? isSelected : undefined}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-start gap-2">
            <h5 className={headingClass} dangerouslySetInnerHTML={{ __html: parseInlineFormatting(headingText) }} />
            {highlight && (
              <sup className="ml-1 text-[10px] font-semibold text-primary align-super">{highlight.index}</sup>
            )}
            {highlight && options?.mode === 'old' && (
              <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-primary/40">
                Regenerated
              </Badge>
            )}
          </div>
          {renderHighlightMeta(highlight, `h5-${i}`, options?.mode === 'old' || isSelected)}
        </div>
      )
      updateActiveHighlight(5, highlight)
    } else if (line.startsWith('###### ')) {
      const headingText = line.slice(7)
      const highlight = findHighlight(headingText)
      const targetNormalized = resolveNormalized(highlight, mode)
      const isSelected = Boolean(
        highlight &&
        options?.selectedHighlight &&
        (
          highlight.normalized === options.selectedHighlight ||
          highlight.resolvedNormalized === options.selectedHighlight
        )
      )
      const isInteractive = Boolean(highlight && options?.onHighlightSelect && mode === 'old')
      const containerClass = `space-y-1 ${isInteractive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 rounded-md' : ''}`
      const headingClass = `text-xs font-medium mb-1 mt-2 text-foreground ${computeHighlightClass(Boolean(highlight), isSelected)}`
      const handleClick = () => {
        if (isInteractive && highlight) {
          options?.onHighlightSelect?.(highlight)
        }
      }
      const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!isInteractive || !highlight) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          options?.onHighlightSelect?.(highlight)
        }
      }
      elements.push(
        <div
          key={`h6-${i}`}
          className={containerClass}
          data-highlight={targetNormalized || undefined}
          role={isInteractive ? 'button' : undefined}
          tabIndex={isInteractive ? 0 : undefined}
          aria-pressed={isInteractive ? isSelected : undefined}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-start gap-2">
            <h6 className={headingClass} dangerouslySetInnerHTML={{ __html: parseInlineFormatting(headingText) }} />
            {highlight && (
              <sup className="ml-1 text-[10px] font-semibold text-primary align-super">{highlight.index}</sup>
            )}
            {highlight && options?.mode === 'old' && (
              <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-primary/40">
                Regenerated
              </Badge>
            )}
          </div>
          {renderHighlightMeta(highlight, `h6-${i}`, options?.mode === 'old' || isSelected)}
        </div>
      )
      updateActiveHighlight(6, highlight)
    }
    // Code blocks (fenced)
    else if (line.startsWith('```')) {
      const language = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      const activeProps = getHighlightProps(activeHighlight)
      elements.push(
        <div
          key={i}
          className={mergeClasses('my-4', activeProps.className)}
          data-highlight={activeProps.dataHighlight}
        >
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
            <code className={`language-${language}`}>{codeLines.join('\n')}</code>
          </pre>
        </div>
      )
    }
    // Blockquotes
    else if (line.startsWith('> ')) {
      const quoteContent = line.slice(2)
      const activeProps = getHighlightProps(activeHighlight)
      elements.push(
        <blockquote
          key={i}
          className={mergeClasses('border-l-4 border-primary pl-4 my-4 italic text-muted-foreground', activeProps.className)}
          data-highlight={activeProps.dataHighlight}
          dangerouslySetInnerHTML={{__html: parseInlineFormatting(quoteContent)}}
        />
      )
    }
    // Horizontal rules
    else if (line.match(/^[-*_]{3,}$/)) {
      const activeProps = getHighlightProps(activeHighlight)
      elements.push(
        <hr
          key={i}
          className={mergeClasses('my-6 border-border', activeProps.className)}
          data-highlight={activeProps.dataHighlight}
        />
      )
    }
    // Lists
    else if (line.match(/^[-*+]\s/)) {
      const content = line.slice(2)
      const activeProps = getHighlightProps(activeHighlight)
      elements.push(
        <div
          key={i}
          className={mergeClasses('ml-4 mb-1 text-muted-foreground', activeProps.className)}
          data-highlight={activeProps.dataHighlight}
          dangerouslySetInnerHTML={{__html: `• ${parseInlineFormatting(content)}`}}
        />
      )
    }
    // Ordered lists
    else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '')
      const activeProps = getHighlightProps(activeHighlight)
      elements.push(
        <div
          key={i}
          className={mergeClasses('ml-4 mb-1 text-muted-foreground', activeProps.className)}
          data-highlight={activeProps.dataHighlight}
          dangerouslySetInnerHTML={{__html: `${line.match(/^\d+/)?.[0]}. ${parseInlineFormatting(content)}`}}
        />
      )
    }
    // Task lists
    else if (line.match(/^[-*+]\s\[[ x]\]/)) {
      const isChecked = line.includes('[x]')
      const content = line.replace(/^[-*+]\s\[[ x]\]\s/, '')
      const activeProps = getHighlightProps(activeHighlight)
      elements.push(
        <div
          key={i}
          className={mergeClasses('ml-4 mb-1 text-muted-foreground flex items-center gap-2', activeProps.className)}
          data-highlight={activeProps.dataHighlight}
        >
          <input type="checkbox" checked={isChecked} readOnly className="rounded" />
          <span dangerouslySetInnerHTML={{__html: parseInlineFormatting(content)}} />
        </div>
      )
    }
    // Tables
    else if (line.startsWith('|')) {
      const tableLines = []
      let j = i
      while (j < lines.length && lines[j].startsWith('|')) {
        tableLines.push(lines[j])
        j++
      }
      
      if (tableLines.length > 1) {
        const headers = tableLines[0].split('|').slice(1, -1).map(h => h.trim())
        const rows = tableLines.slice(2).map(row => 
          row.split('|').slice(1, -1).map(cell => cell.trim())
        )
        const activeProps = getHighlightProps(activeHighlight)
        elements.push(
          <div
            key={`table-${i}`}
            className={mergeClasses(activeProps.className)}
            data-highlight={activeProps.dataHighlight}
          >
            <MarkdownTable headers={headers} rows={rows} className="my-6" />
          </div>
        )
        i = j - 1
      } else {
        const activeProps = getHighlightProps(activeHighlight)
        elements.push(
          <div
            key={i}
            className={mergeClasses('font-mono text-xs text-muted-foreground', activeProps.className)}
            data-highlight={activeProps.dataHighlight}
          >
            {line}
          </div>
        )
      }
    }
    // FAQ sections
    else if (line.match(/^\*\*[QA]:\*\*/)) {
      const isQuestion = line.startsWith('**Q:**')
      const content = line.replace(/^\*\*[QA]:\*\*\s*/, '')
      const activeProps = getHighlightProps(activeHighlight)
      elements.push(
        <div
          key={i}
          data-highlight={activeProps.dataHighlight}
          className={mergeClasses(
            `my-3 p-3 rounded-lg ${isQuestion ? 'bg-primary/10 border-l-4 border-primary' : 'bg-muted/50'}`,
            activeProps.className,
          )}
        >
          <div className={`font-semibold ${isQuestion ? 'text-primary' : 'text-foreground'}`}>
            {isQuestion ? 'Q:' : 'A:'}
          </div>
          <div className="mt-1" dangerouslySetInnerHTML={{__html: parseInlineFormatting(content)}} />
        </div>
      )
    }
    // Callouts/Admonitions
    else if (line.match(/^>\s*\[!.*\]/)) {
      const calloutType = line.match(/\[!(.*?)\]/)?.[1] || 'NOTE'
      const content = line.replace(/^>\s*\[!.*?\]\s*/, '')
      const colors = {
        'NOTE': 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
        'WARNING': 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
        'TIP': 'border-green-500 bg-green-50 dark:bg-green-950/20',
        'IMPORTANT': 'border-red-500 bg-red-50 dark:bg-red-950/20'
      }
      const activeProps = getHighlightProps(activeHighlight)
      elements.push(
        <div
          key={i}
          data-highlight={activeProps.dataHighlight}
          className={mergeClasses(`my-4 p-4 rounded-lg border-l-4 ${colors[calloutType as keyof typeof colors] || colors.NOTE}`, activeProps.className)}
        >
          <div className="font-semibold text-sm mb-2">{calloutType}</div>
          <div dangerouslySetInnerHTML={{__html: parseInlineFormatting(content)}} />
        </div>
      )
    }
    // Empty lines
    else if (line.trim() === '') {
      const activeProps = getHighlightProps(activeHighlight)
      elements.push(
        <div
          key={i}
          className={mergeClasses('h-2', activeProps.className)}
          data-highlight={activeProps.dataHighlight}
        />
      )
    }
    // Regular paragraphs
    else {
      const activeProps = getHighlightProps(activeHighlight)
      elements.push(
        <p
          key={i}
          className={mergeClasses('mb-3 text-foreground', activeProps.className)}
          data-highlight={activeProps.dataHighlight}
          dangerouslySetInnerHTML={{__html: parseInlineFormatting(line)}}
        />
      )
    }
    i++
  }
  
  return elements
}

// Function to parse inline formatting (bold, italic, links, etc.)
function parseInlineFormatting(text: string) {
  return text
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded" />')
    // Line breaks
    .replace(/\n/g, '<br />')
}

// Function to get the domain for each LLM platform for favicon fetching
function getLLMDomain(platform: string): string {
  const platformLower = platform.toLowerCase()
  
  if (platformLower.includes('chatgpt') || platformLower.includes('openai')) {
    return 'chatgpt.com'
  }
  if (platformLower.includes('claude') || platformLower.includes('anthropic')) {
    return 'claude.ai'
  }
  if (platformLower.includes('gemini')) {
    return 'gemini.google.com'
  }
  if (platformLower.includes('perplexity')) {
    return 'perplexity.ai'
  }
  if (platformLower.includes('google')) {
    return 'google.com'
  }
  
  return 'google.com'
}

const FALLBACK_LOW_TRAFFIC_THRESHOLD = 50

type TrafficBand = 'Zero' | 'Very Low' | 'Low' | 'Healthy'

function deriveTrafficBand(sessions: number, threshold: number): TrafficBand {
  if (!sessions || sessions <= 0) {
    return 'Zero'
  }
  const safeThreshold = Math.max(threshold, 1)
  if (sessions <= Math.max(1, Math.floor(safeThreshold / 4))) {
    return 'Very Low'
  }
  if (sessions <= safeThreshold) {
    return 'Low'
  }
  return 'Healthy'
}

interface PageData {
  id: string
  title: string
  url: string
  normalizedUrl?: string
  sessions: number
  sqs?: number
  contentGroup?: string
  conversionRate?: number
  bounce?: number
  timeOnPage?: number
  llmJourney?: string
  hasCitation: boolean
  suggestedAction: 'Regenerate Content' | 'Create New Content'
  platformSessions?: Record<string, number>
  citations: ActionableCitationSummary
  actionableReason: ActionableReason
  hasMappingWarning: boolean
  sourceUrls?: string[]
  mapping?: ActionableUrlMapping
  trafficBand: TrafficBand
}

interface PageListProps {
  range: Range
  dateRange?: string
  isLoading?: boolean
  actionablePages?: ActionablePageRow[]
  warnings?: string[]
  errorMessage?: string
  onRetry?: () => void
  lowTrafficThreshold?: number
  displayThreshold?: number
  highestSessions?: number
}

export function PageList({
  range,
  dateRange = '30 days',
  isLoading = false,
  actionablePages = [],
  warnings = [],
  errorMessage,
  onRetry,
  lowTrafficThreshold,
  displayThreshold,
  highestSessions,
}: PageListProps) {
  const [selectedPage, setSelectedPage] = useState<PageData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [oldContent, setOldContent] = useState('')
  const [newContent, setNewContent] = useState('')
  const [isLoadingOldContent, setIsLoadingOldContent] = useState(false)
  const [isLoadingNewContent, setIsLoadingNewContent] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [loaderType, setLoaderType] = useState<'create' | 'regenerate'>('create')
  const [copiedOld, setCopiedOld] = useState(false)
  const [copiedNew, setCopiedNew] = useState(false)
  const [loadContentError, setLoadContentError] = useState<string | null>(null)
  const [loadedContentDetails, setLoadedContentDetails] = useState<ActionablePageContentResponse | null>(null)
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [isPromptInjectionOpen, setIsPromptInjectionOpen] = useState(false)
  const [selectedPageForPrompts, setSelectedPageForPrompts] = useState<PageData | null>(null)
  const [regenerateError, setRegenerateError] = useState<string | null>(null)
  const [regenerationSummary, setRegenerationSummary] = useState<RegenerationSummary | null>(null)
  const [regenerationIntent, setRegenerationIntent] = useState<RegenerationIntent | null>(null)
  const [regenerationPlan, setRegenerationPlan] = useState<RegenerationPlan | null>(null)
  const [regenerationMetadata, setRegenerationMetadata] = useState<RegenerationRewriteMeta | null>(null)
  const [regeneratedHighlights, setRegeneratedHighlights] = useState<HighlightSection[]>([])
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null)
  const [oldViewMode, setOldViewMode] = useState<'formatted' | 'raw'>('formatted')
  const [newViewMode, setNewViewMode] = useState<'formatted' | 'raw'>('formatted')
  const pageContentCache = useRef<Map<string, ActionablePageContentResponse>>(new Map())
  const newContentRef = useRef<HTMLDivElement | null>(null)
  const thresholdValue = displayThreshold ?? lowTrafficThreshold ?? FALLBACK_LOW_TRAFFIC_THRESHOLD
  const thresholdLabel =
    Number.isFinite(thresholdValue) && thresholdValue % 1 !== 0
      ? Number(thresholdValue).toFixed(1)
      : Number(thresholdValue).toFixed(0)
  const thresholdNumeric = Number(thresholdLabel)
  const threshold = Number.isNaN(thresholdNumeric) ? FALLBACK_LOW_TRAFFIC_THRESHOLD : thresholdNumeric
  const highest = highestSessions ?? 0

  useEffect(() => {
    if (!selectedPage) {
      setOldContent('')
      setLoadContentError(null)
      setLoadedContentDetails(null)
      setIsLoadingOldContent(false)
      setCopiedOld(false)
      setRegenerateError(null)
      setRegenerationSummary(null)
      setRegenerationIntent(null)
      setRegenerationPlan(null)
      setRegenerationMetadata(null)
      setRegeneratedHighlights([])
      setSelectedHighlight(null)
      setOldViewMode('formatted')
      setNewViewMode('formatted')
      return
    }

    setLoadContentError(null)
    setIsLoadingOldContent(false)
    setCopiedOld(false)
    setRegenerateError(null)
    setRegenerationSummary(null)
    setRegenerationIntent(null)
    setRegenerationPlan(null)
    setRegenerationMetadata(null)
    setRegeneratedHighlights([])
    setSelectedHighlight(null)
    setOldViewMode('formatted')
    setNewViewMode('formatted')

    const cacheKey = selectedPage.id || selectedPage.url || selectedPage.normalizedUrl || ''
    if (!cacheKey) {
      setOldContent('')
      setLoadedContentDetails(null)
      return
    }

    const cachedContent = pageContentCache.current.get(cacheKey)
    if (cachedContent) {
      setOldContent(cachedContent.markdown)
      setLoadedContentDetails(cachedContent)
    } else {
      setOldContent('')
      setLoadedContentDetails(null)
    }
  }, [selectedPage])

  useEffect(() => {
    if (!selectedHighlight || !newContentRef.current) {
      return
    }

    const target = newContentRef.current.querySelector<HTMLElement>(`[data-highlight="${selectedHighlight}"]`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedHighlight, newContent])

  const scrapedAtIso = loadedContentDetails?.scrapedAt ?? null

  const formattedScrapedAt = useMemo(() => {
    if (!scrapedAtIso) {
      return null
    }

    try {
      return new Date(scrapedAtIso).toLocaleString()
    } catch {
      return scrapedAtIso
    }
  }, [scrapedAtIso])

  const pagesData = useMemo<PageData[]>(() => {
    if (!actionablePages || actionablePages.length === 0) {
      return []
    }

    return actionablePages.map((row) => {
      const sessions = row.traffic?.sessions ?? 0

      return {
        id: row.id,
        title: row.title || row.url,
        url: row.url,
        normalizedUrl: row.normalizedUrl || row.url,
        sessions,
        sqs: row.traffic?.sqs,
        contentGroup: row.contentGroup,
        conversionRate: row.traffic?.conversionRate,
        bounce: row.traffic?.bounceRate,
        timeOnPage: row.traffic?.timeOnPage,
        llmJourney: row.llmJourney,
        hasCitation: row.citations.totalCitations > 0,
        suggestedAction: row.recommendedAction === 'create-content' ? 'Create New Content' : 'Regenerate Content',
        platformSessions: row.platformSessions,
        citations: row.citations,
        actionableReason: row.actionableReason,
        hasMappingWarning: row.hasMappingWarning ?? false,
        sourceUrls: row.sourceUrls,
        mapping: row.mapping,
        trafficBand: deriveTrafficBand(sessions, threshold),
      }
    })
  }, [actionablePages, threshold])

  const showEmptyState = !isLoading && pagesData.length === 0
  
  if (isLoading && pagesData.length === 0) {
    return <PagesSkeleton />
  }

  // Model options with favicons
  const modelOptions = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', favicon: 'https://www.google.com/s2/favicons?domain=openai.com&sz=32', deployment: 'openai/gpt-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', favicon: 'https://www.google.com/s2/favicons?domain=openai.com&sz=32', deployment: 'openai/gpt-4o-mini' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', favicon: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32', deployment: 'anthropic/claude-3.5-sonnet' },
    { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', favicon: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32', deployment: 'anthropic/claude-3.5-haiku' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', favicon: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32', deployment: 'google/gemini-1.5-pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', favicon: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32', deployment: 'google/gemini-1.5-flash' },
  ]
  
  const handleActionClick = (page: PageData) => {
    const isSamePage = selectedPage?.id === page.id
    setSelectedPage(page)
    setIsDialogOpen(true)
    // Reset content when opening a different page
    if (!isSamePage) {
      setOldContent('')
      setLoadedContentDetails(null)
    }
    setLoadContentError(null)
    setIsLoadingOldContent(false)
    setCopiedOld(false)
    setNewContent('')
    setCopiedNew(false)
    setRegenerateError(null)
    setRegenerationSummary(null)
    setRegenerationIntent(null)
    setRegenerationPlan(null)
    setRegenerationMetadata(null)
    setRegeneratedHighlights([])
    setSelectedHighlight(null)
    setOldViewMode('formatted')
    setNewViewMode('formatted')
  }

  const handlePromptInjectionClick = (page: PageData) => {
    setSelectedPageForPrompts(page)
    setIsPromptInjectionOpen(true)
  }

  const handleHighlightSelect = (section: HighlightSection) => {
    setSelectedHighlight(section.resolvedNormalized || section.normalized)
  }

  const handleLoadOldContent = async () => {
    if (!selectedPage || isLoadingOldContent) {
      return
    }

    const targetPageId = selectedPage.id
    const cacheKey = selectedPage.id || selectedPage.url || selectedPage.normalizedUrl || ''
    if (cacheKey) {
      const cachedContent = pageContentCache.current.get(cacheKey)
      if (cachedContent) {
        setOldContent(cachedContent.markdown)
        setLoadedContentDetails(cachedContent)
        setLoadContentError(null)
        setCopiedOld(false)
        return
      }
    }

    setIsLoadingOldContent(true)
    setLoadContentError(null)
    setCopiedOld(false)

    try {
      const response = await apiService.loadActionablePageContent({
        url: selectedPage.url,
        normalizedUrl: selectedPage.normalizedUrl,
        mapping: selectedPage.mapping,
        mappingTargetUrl: selectedPage.mapping?.targetUrl,
        sourceUrls: selectedPage.sourceUrls,
      })

      if (!response?.success || !response.data) {
        throw new Error('Unable to load page content.')
      }

      const data = response.data
      if (cacheKey) {
        pageContentCache.current.set(cacheKey, data)
      }
      if (selectedPage?.id !== targetPageId) {
        return
      }
      setOldContent(data.markdown)
      setLoadedContentDetails(data)
      setRegenerateError(null)
    } catch (error) {
      if (selectedPage?.id !== targetPageId) {
        return
      }
      const message = error instanceof Error ? error.message : 'Unable to load page content. Please try again.'
      setLoadContentError(message)
    } finally {
      if (selectedPage?.id === targetPageId) {
        setIsLoadingOldContent(false)
      }
    }
  }

  const handleRegenerateContent = async () => {
    if (!selectedPage) {
      return
    }

    if (!oldContent || oldContent.trim().length === 0) {
      setRegenerateError("Load the page content first before regenerating.")
      return
    }

    const selectedModelConfig = modelOptions.find((model) => model.id === selectedModel)
    const deployment = selectedModelConfig?.deployment || 'openai/gpt-4o'

    const regenerationContext = {
      resolvedUrl: loadedContentDetails?.resolvedUrl,
      attemptedUrls: loadedContentDetails?.attemptedUrls,
      scrapedAt: loadedContentDetails?.scrapedAt,
      citations: selectedPage.citations,
      sessions: selectedPage.sessions,
      sqs: selectedPage.sqs,
      conversionRate: selectedPage.conversionRate,
      bounce: selectedPage.bounce,
      timeOnPage: selectedPage.timeOnPage,
      llmJourney: selectedPage.llmJourney,
      contentGroup: selectedPage.contentGroup,
      mapping: selectedPage.mapping,
      sourceUrls: selectedPage.sourceUrls,
      trafficSummary: `${Number.isFinite(selectedPage.sessions) ? `${selectedPage.sessions} sessions` : 'Unknown sessions'} | ${
        Number.isFinite(selectedPage.sqs ?? NaN) ? `SQS: ${selectedPage.sqs}` : 'No SQS'
      }`,
    }

    setRegenerateError(null)
    setRegenerationSummary(null)
    setRegenerationIntent(null)
    setRegenerationPlan(null)
    setRegenerationMetadata(null)
    setRegeneratedHighlights([])
    setNewViewMode('formatted')
    setIsLoadingNewContent(true)
    setShowLoader(true)
    setLoaderType('regenerate')

    try {
      const response = await apiService.regenerateActionableContent({
        originalContent: oldContent,
        model: deployment,
        metadata: loadedContentDetails?.metadata ?? null,
        context: regenerationContext,
        pageUrl: selectedPage.url,
        persona: selectedPage.contentGroup,
        objective: selectedPage.llmJourney,
      })

      if (!response?.success || !response.data) {
        throw new Error('Unable to regenerate content.')
      }

      const data: ActionableRegenerateContentResponse = response.data

      setNewContent(data.content)
      setRegenerationSummary(data.summary || null)
      setRegenerationIntent(data.intent || null)
      const highlightSections = buildHighlightSections(data.plan || null)
      const resolvedHighlights = resolveHighlightMatches(highlightSections, data.content || '')
      const { mergedContent, mergedHighlights } = mergeSections(oldContent, data.content || '', resolvedHighlights)

      setNewContent(mergedContent)
      setRegenerationSummary(data.summary || null)
      setRegenerationIntent(data.intent || null)
      setRegenerationPlan(data.plan || null)
      setRegenerationMetadata(data.rewriteMeta || null)
      setRegeneratedHighlights(mergedHighlights)
      setSelectedHighlight(
        mergedHighlights.length > 0
          ? mergedHighlights[0].resolvedNormalized || mergedHighlights[0].normalized
          : null
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to regenerate content. Please try again.'
      setRegenerateError(message)
    } finally {
      setIsLoadingNewContent(false)
      setShowLoader(false)
    }
  }

  const handleCopyOldContent = async () => {
    try {
      await navigator.clipboard.writeText(oldContent)
      setCopiedOld(true)
      setTimeout(() => setCopiedOld(false), 2000)
    } catch (err) {
      console.error('Failed to copy content:', err)
    }
  }

  const handleCopyNewContent = async () => {
    try {
      await navigator.clipboard.writeText(newContent)
      setCopiedNew(true)
      setTimeout(() => setCopiedNew(false), 2000)
    } catch (err) {
      console.error('Failed to copy content:', err)
    }
  }

  const handleCreateNewContent = async () => {
    setIsLoadingNewContent(true)
    setShowLoader(true)
    setLoaderType('create')
    // Simulate API call
    setTimeout(() => {
      setNewContent(`# Complete Text Format Showcase

## All Supported Markdown Elements

This comprehensive example demonstrates **every text format** our markdown parser supports.

### Headers Hierarchy
# H1 - Main Title
## H2 - Section Header  
### H3 - Subsection
#### H4 - Sub-subsection
##### H5 - Minor Header
###### H6 - Small Header

### Text Formatting Examples

**Bold text** and __alternative bold__ formatting.

*Italic text* and _alternative italic_ formatting.

~~Strikethrough text~~ for corrections.

\`Inline code\` with backticks.

[External links](https://example.com) with hover effects.

### Lists and Bullets

#### Unordered Lists
- First item
- Second item with **bold text**
- Third item with *italic text*
- Fourth item with \`inline code\`

#### Ordered Lists
1. First numbered item
2. Second numbered item
3. Third numbered item with **bold text**

#### Task Lists
- [ ] Unchecked task
- [x] Completed task
- [ ] Another pending task
- [x] Another completed task

### Code Blocks

#### JavaScript Example
\`\`\`javascript
function greetUser(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Welcome, \${name}!\`;
}

// Usage
const message = greetUser("World");
console.log(message);
\`\`\`

#### Python Example
\`\`\`python
def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# Example usage
result = calculate_fibonacci(10)
print(f"Fibonacci(10) = {result}")
\`\`\`

### Tables

| Feature | ChatGPT | Claude | Gemini | Perplexity |
|---------|---------|--------|--------|------------|
| **Code Generation** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Content Writing** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Multimodal** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Cost** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### FAQ Section

**Q:** What's the best AI tool for beginners?
**A:** For beginners, I recommend starting with ChatGPT due to its user-friendly interface and extensive documentation.

**Q:** Can I use multiple AI tools together?
**A:** Yes! Many users combine different tools for different tasks - ChatGPT for quick questions, Claude for analysis, and Gemini for multimodal tasks.

**Q:** What about privacy and data security?
**A:** All major AI providers have implemented strong security measures, but always review their privacy policies before uploading sensitive data.

### Callouts and Admonitions

> [!NOTE]
> This is a note callout with important information.

> [!TIP]
> This is a tip callout with helpful suggestions.

> [!WARNING]
> This is a warning callout with cautionary information.

> [!IMPORTANT]
> This is an important callout with critical information.

### Blockquotes

> "The best AI tool is the one that fits your specific workflow and requirements."
> 
> — AI Research Team, 2024

> This is a regular blockquote without attribution.
> It can span multiple lines and contain **bold text** and *italic text*.

### Horizontal Rules

---

### Mixed Content Example

Here's a comprehensive example combining multiple elements:

#### Advanced Integration Guide

1. **Setup Requirements**
   - Node.js version 18+
   - API keys for your chosen platform
   - Development environment configured

2. **Implementation Steps**
   - Install required packages: \`npm install openai\`
   - Configure environment variables
   - Test API connectivity

3. **Code Example**
   \`\`\`typescript
   import OpenAI from 'openai';
   
   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
   });
   
   async function generateResponse(prompt: string) {
     const completion = await openai.chat.completions.create({
       messages: [{ role: "user", content: prompt }],
       model: "gpt-4",
     });
     
     return completion.choices[0].message.content;
   }
   \`\`\`

4. **Testing Checklist**
   - [ ] API key is valid
   - [ ] Rate limits are configured
   - [ ] Error handling is implemented
   - [ ] Response validation is working

### Links and Resources

- [OpenAI Documentation](https://platform.openai.com/docs)
- [Anthropic Claude Guide](https://docs.anthropic.com)
- [Google AI Studio](https://aistudio.google.com)
- [Perplexity API](https://docs.perplexity.ai)

### Conclusion

This showcase demonstrates the **complete range** of text formats supported by our markdown parser:

- ✅ **Headers** (H1-H6)
- ✅ **Text formatting** (bold, italic, strikethrough)
- ✅ **Lists** (ordered, unordered, task lists)
- ✅ **Code blocks** with syntax highlighting
- ✅ **Tables** with professional styling
- ✅ **FAQ sections** with Q&A formatting
- ✅ **Callouts** (notes, tips, warnings, important)
- ✅ **Blockquotes** with attribution
- ✅ **Links** and external references
- ✅ **Horizontal rules** for separation
- ✅ **Mixed content** with multiple elements

---

*This comprehensive example showcases all supported markdown elements in a single document.*`)
      setIsLoadingNewContent(false)
      setShowLoader(false)
    }, 12000) // 12 seconds to show full loader sequence
  }
  
  // Mock data for demonstration
  return (
    <div>
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Actionable LLM Pages</h2>
                <p className="text-sm text-muted-foreground">Pages surfaced by answer engines that still need stronger GA4 engagement.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                Low traffic threshold: {'< '}
                {thresholdLabel} session{threshold === 1 ? '' : 's'}
              </span>
              {highest > 0 && (
                <span>Calculated from peak {highest} session{highest === 1 ? '' : 's'} (10%)</span>
              )}
              {pagesData.length > 0 && (
                <span>{pagesData.length} page{pagesData.length === 1 ? '' : 's'} in view</span>
              )}
              {dateRange && <span>Date range: {dateRange}</span>}
            </div>

            {errorMessage && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex flex-wrap items-center justify-between gap-3">
                <span>{errorMessage}</span>
                {onRetry && (
                  <Button variant="ghost" size="sm" onClick={onRetry} className="text-destructive hover:text-destructive">
                    Retry
                  </Button>
                )}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="space-y-2">
                {warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="rounded-md border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-200"
                  >
                    {warning}
                  </div>
                ))}
              </div>
            )}

            {showEmptyState ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                No GA4 pages fall below the low-traffic threshold for this window. When pages have LLM sessions at or under the threshold, they will appear here.
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                  <TooltipProvider>
                    <Table className="w-full table-fixed">
                  {/* Table Header */}
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%] text-left">
                        <div className="cursor-pointer hover:bg-muted/50 p-1 rounded text-left">
                          <span className="text-xs font-medium text-muted-foreground">Page</span>
                        </div>
                      </TableHead>

                      <TableHead className="w-[15%] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">LLM Sessions</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-center">
                              <p>Number of sessions reaching this page from LLM-generated answers</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[20%] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Recommended Action</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Next step based on traffic and citation status</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[20%] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Prompt Injection</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Inject prompts to improve LLM visibility across platforms</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                    </TableRow>
                  </TableHeader>

                  {/* Table Body */}
                      <TableBody>
                        {pagesData.slice(0, 20).map((page: PageData, index: number) => (
                      <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="w-[35%] text-left align-middle">
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-foreground max-w-full overflow-x-auto whitespace-nowrap pr-2 custom-scrollbar">
                              {page.title || 'Untitled Page'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              <a
                                href={page.url?.startsWith('http') ? page.url : `https://acme.com${page.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-500 transition-colors"
                              >
                                {page.url?.startsWith('http') ? page.url : `https://acme.com${page.url}`}
                              </a>
                            </div>
                            {page.hasMappingWarning && (
                              <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-300">
                                <Info className="h-3 w-3" />
                                <span>Mapping needed to align GA4 traffic</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Each cell below is a visual metric */}
                        <TableCell className="w-[15%] text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{Math.round(page.sessions || 0)}</span>
                        </TableCell>

                        <TableCell className="w-[20%] text-center align-middle">
                          <Button
                            variant={page.suggestedAction === 'Regenerate Content' ? 'secondary' : 'default'}
                            size="sm"
                            onClick={() => handleActionClick(page)}
                            className="font-medium text-xs px-2 py-1 h-7"
                          >
                            {page.suggestedAction}
                          </Button>
                        </TableCell>
                        <TableCell className="w-[20%] text-center align-middle">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePromptInjectionClick(page)}
                            className="font-medium text-xs px-2 py-1 h-7"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            Inject Prompts
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
            )}
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Action Sheet */}
      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent className="!w-[90vw] sm:!w-[85vw] lg:!w-[80vw] !max-w-none overflow-y-auto max-h-screen">
            <SheetHeader>
              <SheetTitle>
                {selectedPage?.suggestedAction === 'Regenerate Content' 
                  ? 'Regenerate Content' 
                  : 'Create New Content'
                }
              </SheetTitle>
              <SheetDescription>
                {selectedPage?.suggestedAction === 'Regenerate Content' 
                  ? 'This page is cited but underperforming in LLM traffic. Regenerate it using Rankly&apos;s 9 strategies to improve visibility and semantic match quality.'
                  : 'This page isn&apos;t visible in LLM results yet. Generate a new, optimized content piece to help it surface across AI answers.'
                }
              </SheetDescription>
            </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Page Info */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Page Details</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium">{selectedPage?.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedPage?.url?.startsWith('http') ? selectedPage?.url : `https://acme.com${selectedPage?.url}`}
                </div>
                {selectedPage?.mapping && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    <div className="font-medium text-foreground">Mapped URL</div>
                    <div>{selectedPage.mapping.targetUrl}</div>
                  </div>
                )}
                {selectedPage?.citations?.details && selectedPage.citations.details.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs font-medium text-foreground">Citation Sources</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {selectedPage.citations.details.slice(0, 5).map((citation, index) => (
                        <div key={`${citation.url}-${index}`} className="text-[11px] text-muted-foreground break-all">
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors"
                          >
                            {citation.url}
                          </a>
                          {citation.platform && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide">
                              {citation.platform}
                            </span>
                          )}
                        </div>
                      ))}
                      {selectedPage.citations.details.length > 5 && (
                        <div className="text-[11px] text-muted-foreground">
                          +{selectedPage.citations.details.length - 5} more citations
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

                {/* Action Content */}
                <div className="space-y-4">
                  {selectedPage?.suggestedAction === 'Regenerate Content' ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-muted/50 rounded-lg border border-border">
                        <h4 className="text-sm font-medium text-foreground mb-2">Recommended Actions</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• Enrich the content with fresh data and statistics</li>
                          <li>• Add structured data / FAQ schema for model indexing</li>
                          <li>• Improve heading structure for clarity (H2–H4 hierarchy)</li>
                          <li>• Reinforce entity linking (brand, product, topic)</li>
                          <li>• Expand semantic coverage around high-intent queries</li>
                          <li>• Include citation-ready statements (with credible sources)</li>
                          <li>• Optimize for featured snippets and LLM prompt patterns</li>
                          <li>• Refine tone and flow for easier summarization by models</li>
                          <li>• Ensure topical authority consistency with other pages</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-muted/50 rounded-lg border border-border">
                        <h4 className="text-sm font-medium text-foreground mb-2">Content Strategy (Rankly&apos;s 9 Optimization Framework)</h4>
                        <p className="text-xs text-muted-foreground mb-3">Apply Rankly&apos;s 9 content strategies to craft authoritative, LLM-ready pages:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• Authority – Showcase deep expertise through unique insights and examples</li>
                          <li>• Fluency – Simplify sentence flow and readability for model parsing</li>
                          <li>• Technical Depth – Use accurate, domain-specific terminology</li>
                          <li>• Statistical Support – Quantify qualitative claims with verifiable data</li>
                          <li>• Keyword Cohesion – Reinforce key semantic clusters naturally</li>
                          <li>• Citations & References – Add credible external sources</li>
                          <li>• Quotations – Include expert voices or brand perspectives</li>
                          <li>• Diversity of Viewpoint – Balance narrative with multiple angles</li>
                          <li>• Entity Clarity – Define product names, metrics, and acronyms explicitly</li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-3">Use these strategies to guide AI-driven draft generation and ensure full LLM discoverability.</p>
                      </div>
                    </div>
                  )}
                </div>

            {/* Content Section */}
            {selectedPage?.suggestedAction === 'Regenerate Content' ? (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Content Comparison</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Old Content */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Current Content</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-md border border-border/60 p-1">
                          <Button
                            type="button"
                            variant={oldViewMode === 'formatted' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setOldViewMode('formatted')}
                          >
                            Structured
                          </Button>
                          <Button
                            type="button"
                            variant={oldViewMode === 'raw' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setOldViewMode('raw')}
                          >
                            Raw
                          </Button>
                        </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleLoadOldContent}
                        disabled={isLoadingOldContent}
                      >
                        {isLoadingOldContent ? 'Loading...' : 'Load Page Content'}
                      </Button>
                      </div>
                    </div>
                    {loadContentError && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>{loadContentError}</span>
                      </div>
                    )}
                    {!loadContentError && loadedContentDetails && (
                      <div className="space-y-2 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                          <div className="space-y-1">
                            {loadedContentDetails.resolvedUrl && (
                              <div>
                                Loaded from{' '}
                                <a
                                  href={loadedContentDetails.resolvedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary underline-offset-2 hover:underline"
                                >
                                  {loadedContentDetails.resolvedUrl}
                                </a>
                              </div>
                            )}
                            {formattedScrapedAt && (
                              <div>Scraped at {formattedScrapedAt}</div>
                            )}
                            {loadedContentDetails.metadata?.title && (
                              <div className="truncate">
                                Title: <span className="text-foreground">{loadedContentDetails.metadata.title}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {Array.isArray(loadedContentDetails.warnings) && loadedContentDetails.warnings.length > 0 && (
                          <div className="flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-200">
                            <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                            <div>
                              <div className="font-medium uppercase tracking-wide text-[10px]">Fallback Attempts</div>
                              <ul className="mt-1 space-y-0.5">
                                {loadedContentDetails.warnings.map((warning, index) => (
                                  <li key={`${warning.url}-${index}`}>
                                    Tried {warning.url}
                                    {warning.source ? ` (${warning.source})` : ''}
                                    {warning.message ? ` — ${warning.message}` : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {oldContent ? (
                      oldViewMode === 'formatted' ? (
                      <div className="relative min-h-[800px] p-8 border rounded-lg bg-background overflow-y-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyOldContent}
                          className="absolute top-2 right-2 z-10"
                        >
                          {copiedOld ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <div className="space-y-6 text-sm leading-relaxed">
                            {parseMarkdown(oldContent, {
                              highlightSections: regeneratedHighlights,
                              onHighlightSelect: handleHighlightSelect,
                              selectedHighlight,
                              mode: 'old',
                            })}
                        </div>
                      </div>
                      ) : (
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyOldContent}
                            className="absolute top-2 right-2 z-10"
                          >
                            {copiedOld ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Textarea
                            value={oldContent}
                            readOnly
                            className="min-h-[800px] font-mono text-xs pt-10"
                          />
                        </div>
                      )
                    ) : (
                      <Textarea
                        value={oldContent}
                        onChange={(e) => setOldContent(e.target.value)}
                        placeholder="Click 'Load Page Content' to fetch the current page content..."
                        className="min-h-[800px] font-mono text-xs"
                        readOnly={!oldContent}
                      />
                    )}
                  </div>

                  {/* New Content */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Regenerated Content</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-md border border-border/60 p-1">
                          <Button
                            type="button"
                            variant={newViewMode === 'formatted' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setNewViewMode('formatted')}
                            disabled={!newContent && !showLoader}
                          >
                            Structured
                          </Button>
                          <Button
                            type="button"
                            variant={newViewMode === 'raw' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setNewViewMode('raw')}
                            disabled={!newContent && !showLoader}
                          >
                            Raw
                          </Button>
                        </div>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                          <SelectTrigger className="w-[180px] h-8">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <img 
                                  src={modelOptions.find(m => m.id === selectedModel)?.favicon} 
                                  alt="" 
                                  className="w-4 h-4"
                                />
                                <span className="text-xs">{modelOptions.find(m => m.id === selectedModel)?.name}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {modelOptions.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex items-center gap-2">
                                  <img src={model.favicon} alt="" className="w-4 h-4" />
                                  <span className="text-xs">{model.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleRegenerateContent}
                          disabled={isLoadingNewContent}
                        >
                          {isLoadingNewContent ? 'Generating...' : 'Regenerate Content'}
                        </Button>
                      </div>
                    </div>
                {regenerateError && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{regenerateError}</span>
                  </div>
                )}
                <AnimatePresence mode="wait">
                    {showLoader && loaderType === 'regenerate' ? (
                    <motion.div
                      key="regenerate-loader"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      <ContentGenerationLoader type="regenerate" />
                    </motion.div>
                    ) : newContent ? (
                    <motion.div
                      key="regenerated-content"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      ref={newContentRef}
                      className="relative min-h-[800px] p-8 border rounded-lg bg-background overflow-y-auto"
                    >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyNewContent}
                          className="absolute top-2 right-2 z-10"
                        >
                          {copiedNew ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      {newViewMode === 'formatted' ? (
                        <div className="space-y-6 text-sm leading-relaxed">
                          {parseMarkdown(newContent, {
                            highlightSections: regeneratedHighlights,
                            selectedHighlight,
                            mode: 'new',
                          })}
                      </div>
                    ) : (
                        <Textarea
                          value={newContent}
                          readOnly
                          className="min-h-[760px] font-mono text-xs mt-10"
                        />
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="regenerate-placeholder"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <Textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Click 'Regenerate Content' to generate improved content..."
                        className="min-h-[800px] font-mono text-xs"
                        readOnly={!newContent}
                      />
                    </motion.div>
                    )}
                </AnimatePresence>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">New Content Generation</h4>
                    <div className="flex items-center gap-2">
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <img 
                                src={modelOptions.find(m => m.id === selectedModel)?.favicon} 
                                alt="" 
                                className="w-4 h-4"
                              />
                              <span className="text-xs">{modelOptions.find(m => m.id === selectedModel)?.name}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {modelOptions.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex items-center gap-2">
                                <img src={model.favicon} alt="" className="w-4 h-4" />
                                <span className="text-xs">{model.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCreateNewContent}
                        disabled={isLoadingNewContent}
                      >
                        {isLoadingNewContent ? 'Generating...' : 'Generate Content'}
                      </Button>
                    </div>
                  </div>
                  {showLoader && loaderType === 'create' ? (
                    <ContentGenerationLoader type="create" />
                  ) : newContent ? (
                    <div className="relative min-h-[800px] p-8 border rounded-lg bg-background overflow-y-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyNewContent}
                        className="absolute top-2 right-2 z-10"
                      >
                        {copiedNew ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <div className="space-y-6 text-sm leading-relaxed">
                        {parseMarkdown(newContent)}
                      </div>
                    </div>
                  ) : (
                    <Textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Click &apos;Generate Content&apos; to create new draft using Rankly&apos;s 9-strategy framework..."
                      className="min-h-[800px] font-mono text-xs"
                      readOnly={!newContent}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Prompt Injection Sheet */}
      <PromptInjectionSheet
        isOpen={isPromptInjectionOpen}
        onClose={() => setIsPromptInjectionOpen(false)}
        pageData={selectedPageForPrompts}
      />
    </div>
  )
}




