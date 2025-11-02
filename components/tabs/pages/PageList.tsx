/**
 * Page List - LLM Traffic Module (Inspired by Fibr's Design)
 *
 * Shows page-level LLM traffic performance with comprehensive analytics
 */

'use client'

import type { Range } from '@/types/traffic'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Info, Copy, Check, Zap } from 'lucide-react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownTable } from '@/components/ui/markdown-table'
import { ContentGenerationLoader } from '@/components/ui/content-generation-loader'
import { PromptInjectionSheet } from '@/components/ui/prompt-injection-sheet'

// Function to parse markdown content and render it properly
function parseMarkdown(content: string) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    
    // Headers (H1-H6)
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold mb-4 mt-6 text-foreground" dangerouslySetInnerHTML={{__html: parseInlineFormatting(line.slice(2))}} />
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-xl font-semibold mb-3 mt-5 text-foreground" dangerouslySetInnerHTML={{__html: parseInlineFormatting(line.slice(3))}} />
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-lg font-medium mb-2 mt-4 text-foreground" dangerouslySetInnerHTML={{__html: parseInlineFormatting(line.slice(4))}} />
      )
    } else if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={i} className="text-base font-medium mb-2 mt-3 text-foreground" dangerouslySetInnerHTML={{__html: parseInlineFormatting(line.slice(5))}} />
      )
    } else if (line.startsWith('##### ')) {
      elements.push(
        <h5 key={i} className="text-sm font-medium mb-1 mt-2 text-foreground" dangerouslySetInnerHTML={{__html: parseInlineFormatting(line.slice(6))}} />
      )
    } else if (line.startsWith('###### ')) {
      elements.push(
        <h6 key={i} className="text-xs font-medium mb-1 mt-2 text-foreground" dangerouslySetInnerHTML={{__html: parseInlineFormatting(line.slice(7))}} />
      )
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
      elements.push(
        <div key={i} className="my-4">
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
            <code className={`language-${language}`}>{codeLines.join('\n')}</code>
          </pre>
        </div>
      )
    }
    // Blockquotes
    else if (line.startsWith('> ')) {
      const quoteContent = line.slice(2)
      elements.push(
        <blockquote key={i} className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground" dangerouslySetInnerHTML={{__html: parseInlineFormatting(quoteContent)}} />
      )
    }
    // Horizontal rules
    else if (line.match(/^[-*_]{3,}$/)) {
      elements.push(<hr key={i} className="my-6 border-border" />)
    }
    // Lists
    else if (line.match(/^[-*+]\s/)) {
      const content = line.slice(2)
      elements.push(
        <div key={i} className="ml-4 mb-1 text-muted-foreground" dangerouslySetInnerHTML={{__html: `• ${parseInlineFormatting(content)}`}} />
      )
    }
    // Ordered lists
    else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '')
      elements.push(
        <div key={i} className="ml-4 mb-1 text-muted-foreground" dangerouslySetInnerHTML={{__html: `${line.match(/^\d+/)?.[0]}. ${parseInlineFormatting(content)}`}} />
      )
    }
    // Task lists
    else if (line.match(/^[-*+]\s\[[ x]\]/)) {
      const isChecked = line.includes('[x]')
      const content = line.replace(/^[-*+]\s\[[ x]\]\s/, '')
      elements.push(
        <div key={i} className="ml-4 mb-1 text-muted-foreground flex items-center gap-2">
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
        
        elements.push(
          <MarkdownTable key={i} headers={headers} rows={rows} className="my-6" />
        )
        i = j - 1
      } else {
        elements.push(
          <div key={i} className="font-mono text-xs text-muted-foreground">{line}</div>
        )
      }
    }
    // FAQ sections
    else if (line.match(/^\*\*[QA]:\*\*/)) {
      const isQuestion = line.startsWith('**Q:**')
      const content = line.replace(/^\*\*[QA]:\*\*\s*/, '')
      elements.push(
        <div key={i} className={`my-3 p-3 rounded-lg ${isQuestion ? 'bg-primary/10 border-l-4 border-primary' : 'bg-muted/50'}`}>
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
      elements.push(
        <div key={i} className={`my-4 p-4 rounded-lg border-l-4 ${colors[calloutType as keyof typeof colors] || colors.NOTE}`}>
          <div className="font-semibold text-sm mb-2">{calloutType}</div>
          <div dangerouslySetInnerHTML={{__html: parseInlineFormatting(content)}} />
        </div>
      )
    }
    // Empty lines
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2"></div>)
    }
    // Regular paragraphs
    else {
      elements.push(
        <p key={i} className="mb-3 text-foreground" dangerouslySetInnerHTML={{__html: parseInlineFormatting(line)}} />
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

interface PageData {
  title: string
  url: string
  sessions: number
  sqs: number
  contentGroup: string
  conversionRate: number
  bounce: number
  timeOnPage: number
  llmJourney: string
  hasCitation: boolean
  suggestedAction: string
  platformSessions?: Record<string, number>
}

interface PageListProps {
  range: Range
  realPagesData?: unknown
  dateRange?: string
  isLoading?: boolean
}

export function PageList({ range, realPagesData, dateRange = '30 days', isLoading = false }: PageListProps) {
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
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [isPromptInjectionOpen, setIsPromptInjectionOpen] = useState(false)
  const [selectedPageForPrompts, setSelectedPageForPrompts] = useState<PageData | null>(null)
  
  // Model options with favicons
  const modelOptions = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', favicon: 'https://www.google.com/s2/favicons?domain=openai.com&sz=32' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', favicon: 'https://www.google.com/s2/favicons?domain=openai.com&sz=32' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', favicon: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32' },
    { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', favicon: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', favicon: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', favicon: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32' },
  ]
  
  const handleActionClick = (page: PageData) => {
    setSelectedPage(page)
    setIsDialogOpen(true)
    // Reset content when opening
    setOldContent('')
    setNewContent('')
  }

  const handlePromptInjectionClick = (page: PageData) => {
    setSelectedPageForPrompts(page)
    setIsPromptInjectionOpen(true)
  }

      const handleLoadOldContent = async () => {
        setIsLoadingOldContent(true)
        // Simulate API call - no loader for existing content
        setTimeout(() => {
          setOldContent(`# AI Tools Comparison Guide 2024

## Introduction
This comprehensive guide compares the top AI tools available in 2024, helping you choose the right solution for your needs.

## Top AI Tools

### 1. ChatGPT
- **Best for**: General conversation and content creation
- **Pricing**: $20/month for Pro
- **Key Features**: Natural language processing, code generation
- **Pros**: Fast responses, good for coding
- **Cons**: Limited context window

### 2. Claude
- **Best for**: Long-form content and analysis
- **Pricing**: $20/month for Pro
- **Key Features**: Advanced reasoning, document analysis
- **Pros**: Excellent for research and analysis
- **Cons**: Slower response times

### 3. Gemini
- **Best for**: Multimodal tasks
- **Pricing**: Free tier available
- **Key Features**: Image and text processing
- **Pros**: Free tier, good integration
- **Cons**: Less advanced than paid alternatives

## Comparison Matrix

| Feature | ChatGPT | Claude | Gemini |
|---------|---------|--------|--------|
| Code Generation | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Content Writing | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Multimodal | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Cost | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Code Examples

Here's a simple Python script to get started:

\`\`\`python
import openai

def generate_response(prompt):
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

# Example usage
result = generate_response("Explain quantum computing")
print(result)
\`\`\`

## FAQ Section

**Q:** Which AI tool is best for beginners?
**A:** For beginners, I recommend starting with ChatGPT due to its user-friendly interface and extensive documentation.

**Q:** Can I use multiple AI tools together?
**A:** Yes! Many users combine different tools for different tasks - ChatGPT for quick questions, Claude for analysis, and Gemini for multimodal tasks.

**Q:** What about privacy and data security?
**A:** All major AI providers have implemented strong security measures, but always review their privacy policies before uploading sensitive data.

## Important Notes

> [!IMPORTANT]
> Always verify AI-generated content, especially for critical decisions or professional use cases.

> [!TIP]
> Start with free tiers to test different tools before committing to paid plans.

> [!WARNING]
> Be cautious when sharing proprietary or confidential information with AI tools.

## Task Lists

Here's what you should do when choosing an AI tool:

- [ ] Identify your primary use cases
- [ ] Test free tiers of different tools
- [ ] Compare pricing plans
- [x] Read user reviews and comparisons
- [ ] Consider integration requirements

## Advanced Features

#### 4. Custom Integrations
Most AI tools offer API access for custom integrations:

1. **OpenAI API** - Most popular for developers
2. **Anthropic API** - Great for research applications  
3. **Google AI API** - Good for enterprise solutions

#### 5. Performance Metrics

When evaluating tools, consider these metrics:

- **Response Time**: How quickly does the tool respond?
- **Accuracy**: How accurate are the results?
- **Context Length**: How much text can it process?
- **Cost per Token**: What's the pricing structure?

## Blockquotes and References

> "The best AI tool is the one that fits your specific workflow and requirements."
> 
> — AI Research Team, 2024

## Links and Resources

- [OpenAI Documentation](https://platform.openai.com/docs)
- [Anthropic Claude Guide](https://docs.anthropic.com)
- [Google AI Studio](https://aistudio.google.com)

## Conclusion

Choose the tool that best fits your specific use case and budget. Remember to:

1. Start with free tiers
2. Test different use cases
3. Consider your team's needs
4. Evaluate long-term costs

---

*Last updated: December 2024*`)
          setIsLoadingOldContent(false)
        }, 1000) // Quick load for existing content
      }

  const handleRegenerateContent = async () => {
    setIsLoadingNewContent(true)
    setShowLoader(true)
    setLoaderType('regenerate')
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
  const mockPagesData = [
    {
      title: "AI Tools Comparison Guide",
      url: "/ai-tools-comparison",
      sessions: 1247,
      sqs: 8.2,
      contentGroup: "Blog",
      conversionRate: 12.5,
      bounce: 23.1,
      timeOnPage: 245,
      llmJourney: "entry",
      hasCitation: true,
      suggestedAction: "Regenerate Content",
      platformSessions: {
        "ChatGPT": 456,
        "Claude": 234,
        "Gemini": 189,
        "Perplexity": 123
      }
    },
    {
      title: "Pricing Plans",
      url: "/pricing",
      sessions: 892,
      sqs: 7.8,
      contentGroup: "Product",
      conversionRate: 18.3,
      bounce: 31.2,
      timeOnPage: 189,
      llmJourney: "middle",
      hasCitation: true,
      suggestedAction: "Regenerate Content",
      platformSessions: {
        "ChatGPT": 234,
        "Claude": 156,
        "Gemini": 98,
        "Perplexity": 67
      }
    },
    {
      title: "API Documentation",
      url: "/docs/api",
      sessions: 634,
      sqs: 9.1,
      contentGroup: "Docs",
      conversionRate: 8.7,
      bounce: 15.4,
      timeOnPage: 312,
      llmJourney: "exit",
      hasCitation: false,
      suggestedAction: "Create New Content",
      platformSessions: {
        "ChatGPT": 189,
        "Claude": 123,
        "Gemini": 87,
        "Perplexity": 45
      }
    },
    {
      title: "Getting Started Guide",
      url: "/getting-started",
      sessions: 456,
      sqs: 6.9,
      contentGroup: "Docs",
      conversionRate: 15.2,
      bounce: 28.7,
      timeOnPage: 156,
      llmJourney: "entry",
      hasCitation: false,
      suggestedAction: "Create New Content",
      platformSessions: {
        "ChatGPT": 167,
        "Claude": 98,
        "Gemini": 67,
        "Perplexity": 34
      }
    },
    {
      title: "Contact Us",
      url: "/contact",
      sessions: 234,
      sqs: 5.4,
      contentGroup: "Support",
      conversionRate: 22.1,
      bounce: 45.3,
      timeOnPage: 98,
      llmJourney: "exit",
      hasCitation: true,
      suggestedAction: "Regenerate Content",
      platformSessions: {
        "ChatGPT": 89,
        "Claude": 56,
        "Gemini": 34,
        "Perplexity": 23
      }
    }
  ]

  const pagesData = mockPagesData

  return (
    <div>
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Pages with Low LLM Traffic</h2>
                <p className="text-sm text-muted-foreground">Identify why these pages underperform and take recommended actions.</p>
              </div>
            </div>

            {/* Table */}
                <div className="border rounded-lg overflow-x-auto">
                  <TooltipProvider>
                    <Table className="w-full table-fixed">
                  {/* Table Header */}
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%] text-left">
                        <div className="cursor-pointer hover:bg-muted/50 p-1 rounded text-left">
                          <span className="text-xs font-medium text-muted-foreground">Page</span>
                        </div>
                      </TableHead>

                      <TableHead className="w-[12%] text-center">
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

                      <TableHead className="w-[28%] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Cited in LLMs</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Citation status and platform breakdown</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[18%] text-center">
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

                      <TableHead className="w-[17%] text-center">
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
                        <TableCell className="w-[25%] text-left align-middle">
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-foreground truncate">
                              {page.title || 'Untitled Page'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              <a
                                href={page.url?.startsWith('http') ? page.url : `https://fibr.ai${page.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-500 transition-colors"
                              >
                                {page.url?.startsWith('http') ? page.url : `https://fibr.ai${page.url}`}
                              </a>
                            </div>
                          </div>
                        </TableCell>

                        {/* Each cell below is a visual metric */}
                        <TableCell className="w-[12%] text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{Math.round(page.sessions || 0)}</span>
                        </TableCell>
                        <TableCell className="w-[28%] text-center align-middle">
                          <div className="flex items-center justify-center gap-3">
                            {/* Citation Status */}
                            <div>
                              {page.hasCitation ? (
                                <Badge variant="default" className="bg-primary text-primary-foreground">
                                  Cited
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-muted-foreground">
                                  Not Cited
                                </Badge>
                              )}
                            </div>
                            
                            {/* Platform Breakdown */}
                            {page.hasCitation && page.platformSessions && Object.keys(page.platformSessions).length > 0 && (
                              <div className="flex items-center gap-1">
                                {Object.entries(page.platformSessions).slice(0, 3).map(([platform, sessions]) => (
                                  <div key={platform} className="flex items-center gap-1" title={`${platform}: ${sessions} sessions`}>
                                    <img
                                      src={`https://www.google.com/s2/favicons?domain=${getLLMDomain(platform)}&sz=32`}
                                      alt={`${platform} favicon`}
                                      className="w-4 h-4"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = document.createElement('div');
                                        fallback.className = 'w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold';
                                        fallback.style.backgroundColor = platform.toLowerCase() === 'chatgpt' ? '#10a37f' :
                                                                         platform.toLowerCase() === 'gemini' ? '#4285f4' :
                                                                         platform.toLowerCase() === 'claude' ? '#ff6b35' :
                                                                         platform.toLowerCase() === 'perplexity' ? '#fca5a5' :
                                                                         platform.toLowerCase() === 'google' ? '#34d399' :
                                                                         '#94a3b8';
                                        fallback.style.color = 'white';
                                        fallback.textContent = platform.charAt(0).toUpperCase();
                                        target.parentNode?.insertBefore(fallback, target);
                                      }}
                                    />
                                    <span className="text-xs text-muted-foreground">{sessions as number}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[18%] text-center align-middle">
                          <Button
                            variant={page.hasCitation ? 'secondary' : 'default'}
                            size="sm"
                            onClick={() => handleActionClick(page)}
                            className="font-medium text-xs px-2 py-1 h-7"
                          >
                            {page.suggestedAction}
                          </Button>
                        </TableCell>
                        <TableCell className="w-[17%] text-center align-middle">
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
                  {selectedPage?.url?.startsWith('http') ? selectedPage?.url : `https://fibr.ai${selectedPage?.url}`}
                </div>
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleLoadOldContent}
                        disabled={isLoadingOldContent}
                      >
                        {isLoadingOldContent ? 'Loading...' : 'Load Page Content'}
                      </Button>
                    </div>
                    {oldContent ? (
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
                          {parseMarkdown(oldContent)}
                        </div>
                      </div>
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
                    {showLoader && loaderType === 'regenerate' ? (
                      <ContentGenerationLoader type="regenerate" />
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
                        placeholder="Click 'Regenerate Content' to generate improved content..."
                        className="min-h-[800px] font-mono text-xs"
                        readOnly={!newContent}
                      />
                    )}
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



