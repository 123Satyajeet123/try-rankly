# Product Requirements Document (PRD)
## Rankly Dashboard - AI Answer Engine Analytics Platform

**Version:** 1.0  
**Last Updated:** September 30, 2025  
**Document Owner:** Product Team  
**Status:** Active Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [User Personas](#user-personas)
4. [Core Features](#core-features)
5. [Technical Architecture](#technical-architecture)
6. [UI/UX Specifications](#uiux-specifications)
7. [Data Models](#data-models)
8. [User Flows](#user-flows)
9. [Feature Specifications](#feature-specifications)
10. [Non-Functional Requirements](#non-functional-requirements)
11. [Future Enhancements](#future-enhancements)

---

## 1. Executive Summary

### 1.1 Purpose
Rankly Dashboard is a comprehensive analytics platform designed to help businesses understand and optimize their visibility in AI-powered answer engines (like ChatGPT, Perplexity, Claude, etc.). The platform provides insights into how brands are mentioned, positioned, and perceived across various AI platforms.

### 1.2 Goals
- **Primary Goal:** Enable businesses to track and improve their presence in AI-generated answers
- **Secondary Goals:**
  - Provide competitive intelligence across AI platforms
  - Offer actionable insights for content optimization
  - Track sentiment and perception in AI responses
  - Monitor citation quality and frequency

### 1.3 Success Metrics
- User engagement with dashboard tabs
- Time spent analyzing metrics
- Number of prompts configured and tracked
- Citation tracking accuracy
- User satisfaction with insights provided

---

## 2. Product Overview

### 2.1 Product Vision
To be the leading analytics platform for AI answer engine optimization, helping businesses maintain and improve their digital presence in the age of AI-powered search and recommendations.

### 2.2 Target Market
- **Primary:** B2B SaaS companies, marketing agencies, SEO professionals
- **Secondary:** E-commerce businesses, content marketers, brand managers
- **Enterprise:** Large corporations tracking brand reputation across AI platforms

### 2.3 Key Differentiators
- Real-time tracking across multiple AI platforms
- Competitive benchmarking with dummy company comparisons
- Prompt-level granularity for tracking
- Sentiment analysis specific to AI-generated content
- Topic and persona-based segmentation

---

## 3. User Personas

### 3.1 Primary Persona: Marketing Manager
- **Name:** Sarah Chen
- **Role:** Marketing Manager at a B2B SaaS company
- **Goals:**
  - Understand brand visibility in AI platforms
  - Track competitive positioning
  - Optimize content strategy for AI visibility
- **Pain Points:**
  - Lack of AI platform analytics tools
  - Difficulty tracking brand mentions across platforms
  - No competitive intelligence for AI-generated answers

### 3.2 Secondary Persona: SEO Specialist
- **Name:** Mike Rodriguez
- **Role:** SEO Specialist at a digital marketing agency
- **Goals:**
  - Track client performance across AI platforms
  - Identify optimization opportunities
  - Report on AI visibility metrics
- **Pain Points:**
  - Traditional SEO tools don't cover AI platforms
  - Need granular data on prompt performance
  - Require actionable insights for optimization

### 3.3 Tertiary Persona: Brand Manager
- **Name:** Emily Thompson
- **Role:** Brand Manager at an enterprise company
- **Goals:**
  - Monitor brand sentiment across AI platforms
  - Track competitive positioning
  - Ensure accurate brand representation
- **Pain Points:**
  - Cannot monitor brand mentions in AI responses
  - No sentiment tracking for AI-generated content
  - Lack of citation quality metrics

---

## 4. Core Features

### 4.1 Feature Overview

#### 4.1.1 Dashboard Navigation
- **Sidebar Navigation:** Static navigation with 3 main sections
- **Tab Navigation:** 5 primary tabs for different analytics views
- **Theme Toggle:** Light/dark mode support
- **Responsive Design:** Mobile-friendly interface

#### 4.1.2 Analytics Tabs
1. **Visibility Tab:** Core visibility metrics and rankings
2. **Prompts Tab:** Prompt management and performance tracking
3. **Sentiment Tab:** Sentiment analysis across topics and prompts
4. **Citations Tab:** Citation tracking and quality metrics

#### 4.1.3 Separate Features
1. **Agent Analytics:** AI-driven traffic pattern analysis (separate from Answer Engine Analytics)

---

## 5. Technical Architecture

### 5.1 Technology Stack

#### 5.1.1 Frontend Framework
- **Next.js 15.5.4:** React framework with SSR/SSG support
- **React 18+:** Component-based UI library
- **TypeScript:** Type-safe development
- **Turbopack:** Fast development builds

#### 5.1.2 Styling & UI
- **Tailwind CSS:** Utility-first CSS framework
- **ShadCN UI:** Component library built on Radix UI
- **Class Variance Authority (CVA):** Component variant management
- **next-themes:** Dark mode support with SSR compatibility

#### 5.1.3 Data Visualization
- **Recharts:** Charting library for React
  - Bar Charts
  - Line Charts
  - Pie/Donut Charts
  - Area Charts
  - Radar Charts

#### 5.1.4 UI Components
- **Radix UI:** Unstyled, accessible component primitives
  - Dialog
  - Dropdown Menu
  - Accordion
  - Tooltip
  - Popover
  - Sheet (Side Panel)
  - Checkbox

#### 5.1.5 Icons & Assets
- **Lucide React:** Icon library
- **Custom Emojis:** Brand/company visual identifiers

### 5.2 Project Structure

```
rankly-dashboard/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                 # Home page
│   │   ├── layout.tsx               # Root layout
│   │   ├── globals.css              # Global styles
│   │   ├── dashboard/               # Dashboard route
│   │   └── prompt-designer/         # Prompt designer route
│   ├── components/
│   │   ├── Dashboard.tsx            # Main dashboard component
│   │   ├── layout/                  # Layout components
│   │   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   │   └── TopNav.tsx          # Top navigation bar
│   │   ├── tabs/                    # Tab-specific components
│   │   │   ├── index.tsx           # Tab exports
│   │   │   ├── visibility/         # Visibility tab components
│   │   │   ├── prompts/            # Prompts tab components
│   │   │   ├── clusters/           # Clusters tab components
│   │   │   ├── sentiment/          # Sentiment tab components
│   │   │   └── citations/          # Citations tab components
│   │   ├── ui/                      # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── accordion.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── multi-select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── label.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── unified-card.tsx    # Custom unified card component
│   │   └── theme-provider.tsx       # Theme context provider
│   ├── data/
│   │   └── mockData.ts              # Mock data for development
│   ├── types/
│   │   └── dashboard.ts             # TypeScript type definitions
│   └── lib/
│       └── utils.ts                 # Utility functions
├── public/                           # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── postcss.config.mjs
└── components.json                   # ShadCN configuration
```

### 5.3 Component Architecture

#### 5.3.1 Modular Tab Structure
Each tab is self-contained with its own components:
- **index.tsx:** Exports all tab components and main tab component
- **Section components:** Individual metric/feature sections
- **Modal components:** Dialog/sheet components for interactions
- **Shared components:** UI components used across sections

#### 5.3.2 Component Naming Conventions
- **Sections:** `UnifiedXXXSection.tsx` or `XXXSection.tsx`
- **Cards:** `XXXCard.tsx`
- **Modals:** `XXXModal.tsx`
- **Tables:** `XXXTable.tsx`
- **Pages:** `XXXPage.tsx`

---

## 6. UI/UX Specifications

### 6.1 Design System

#### 6.1.1 Color Palette

**Light Mode:**
- Background: `#FFFFFF`
- Foreground: `#0A0A0A`
- Card: `#FFFFFF`
- Card Foreground: `#0A0A0A`
- Muted: `#F4F4F5`
- Muted Foreground: `#71717A`
- Border: `#E4E4E7`
- Input: `#E4E4E7`
- Primary: `#18181B`
- Primary Foreground: `#FAFAFA`
- Accent: `#F4F4F5`
- Accent Foreground: `#18181B`

**Dark Mode:**
- Background: `#0A0A0A`
- Foreground: `#FAFAFA`
- Card: `#0A0A0A`
- Card Foreground: `#FAFAFA`
- Muted: `#27272A`
- Muted Foreground: `#A1A1AA`
- Border: `#27272A`
- Input: `#27272A`
- Primary: `#FAFAFA`
- Primary Foreground: `#18181B`
- Accent: `#27272A`
- Accent Foreground: `#FAFAFA`

**Chart Colors (Hardcoded Hex for Consistency):**
- TechCorp: `#3B82F6` (Blue)
- DataFlow: `#EF4444` (Red)
- CloudSync: `#8B5CF6` (Purple)
- SmartAI: `#06B6D4` (Cyan)
- InnovateTech: `#10B981` (Green) - Owned brand
- Others: `#9CA3AF` (Gray)

**Brand Identification:**
- Owned brand (InnovateTech): Highlighted with blue color `#2563EB` and bold text
- Competitors: Standard text color without special highlighting
- No "Owned" badges - brand identification through color and typography only

#### 6.1.2 Typography

**Font Family:**
- Primary: Inter (Google Fonts)
- Body: Inter (Google Fonts)
- Monospace: JetBrains Mono (Google Fonts)

**Font Sizes (Reduced for better UX):**
- Main Section Headers: `text-lg` (18px) - `font-semibold`
- Sub-headers: `text-base` (16px) - `font-semibold`
- Large Metrics: `text-2xl` (24px) - `font-bold`
- Standard Metrics: `text-xl` (20px) - `font-bold`
- Body Text: `text-sm` (14px)
- Small Text: `text-xs` (12px)

**Typography Classes:**
- `.body-text`: Applied to buttons and interactive elements
- `.caption`: Applied to small descriptive text
- `.label`: Applied to form labels
- `.text-large`: Applied to large metric values
- `.text-small`: Applied to small metric values
- `.text-muted`: Applied to muted/secondary text

**Line Heights:**
- Headers: `leading-none` or `leading-tight`
- Body: Default line height
- Descriptions: `leading-tight`

#### 6.1.3 Spacing

**Card Padding:**
- Standard: `p-4` (16px)
- Sections: `space-y-4` (16px vertical spacing)
- Between elements: `gap-2` to `gap-8` depending on hierarchy

**Margins:**
- Section spacing: `space-y-6` (24px)
- Component spacing: `space-y-4` (16px)
- Element spacing: `gap-2` (8px)

#### 6.1.4 Border Radius
- Cards: `rounded-lg` (8px)
- Buttons: `rounded-md` (6px)
- Small elements: `rounded` (4px)
- Circular: `rounded-full`

#### 6.1.5 Shadows
- Cards: `shadow-sm` (subtle shadow)
- Hover states: Slight elevation increase
- Modals: `shadow-lg` (larger shadow)

### 6.2 Layout Specifications

#### 6.2.1 Main Layout
```
┌─────────────────────────────────────────────────────────────┐
│                         Top Navigation                       │
│  [Visibility] [Prompts] [Clusters] [Sentiment] [Citations] │
├─────────┬───────────────────────────────────────────────────┤
│         │                                                   │
│ Sidebar │              Main Content Area                   │
│         │                                                   │
│ ┌─────┐ │  ┌───────────────────────────────────────────┐  │
│ │ Nav │ │  │         Section Header                     │  │
│ │Items│ │  │  Description                               │  │
│ │     │ │  │                                            │  │
│ │     │ │  │  ┌──────────────────────────────────────┐ │  │
│ │     │ │  │  │      Unified Card Content           │ │  │
│ │     │ │  │  │                                      │ │  │
│ │     │ │  │  └──────────────────────────────────────┘ │  │
│ │     │ │  └───────────────────────────────────────────┘  │
│ └─────┘ │                                                   │
│         │                                                   │
│ Theme   │                                                   │
│ Toggle  │                                                   │
└─────────┴───────────────────────────────────────────────────┘
```

#### 6.2.2 Sidebar Specifications
- **Width:** 256px (w-64)
- **Background:** `bg-background`
- **Border:** Right border with `border-border`
- **Sections:**
  1. **Header:** Company name "Rankly" (text-2xl, font-bold)
  2. **Navigation:** 3 main navigation items
  3. **Footer:** Contact button and theme toggle

**Navigation Items:**
- Answer Engine Analytics (BarChart3 icon)
- Agent Analytics (MessageSquare icon)
- Actionables (Globe icon)

**Theme Toggle:**
- Circular toggle with Sun/Moon icons
- Background: `bg-muted/50`
- Active state: `bg-background text-foreground shadow-sm`
- Inactive state: `text-muted-foreground`

#### 6.2.3 Top Navigation Specifications
- **Height:** Auto (varies with content)
- **Background:** `bg-background`
- **Border:** Bottom border with `border-border`
- **Layout:** Horizontal tabs with active state indicator and filter controls
- **Active Tab:** Underline with `border-b-2 border-primary`
- **Filter Controls:** Multi-select dropdowns for Topics, User Personas, and Platforms positioned on the right
- **Horizontal Divider:** Section separator line below the combined tabs/filters row

#### 6.2.4 Content Area Specifications
- **Background:** `bg-gray-50` (light) / `bg-neutral-950` (dark)
- **Padding:** `px-2 py-4`
- **Overflow:** Scrollable vertically
- **Max Width:** Full width

### 6.3 Card Design Pattern

#### 6.3.1 Unified Card Structure
All metric cards follow this consistent pattern:

```
┌─────────────────────────────────────────────────────────┐
│ Section Header                    [i] [Chart Config ⌄]  │
│ Description text                                         │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │                  Unified Card                       │ │
│ │                                                     │ │
│ │  ┌─────────────────────┬────────────────────────┐  │ │
│ │  │  Left Section       │  Right Section        │  │ │
│ │  │                     │                        │  │ │
│ │  │  Header             │  Header                │  │ │
│ │  │  Metric Value       │  Metric Value          │  │ │
│ │  │                     │                        │  │ │
│ │  │  Chart/Visualization│  Table/Data           │  │ │
│ │  │                     │                        │  │ │
│ │  │                     │  [Expand Button]       │  │ │
│ │  └─────────────────────┴────────────────────────┘  │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key Elements:**
1. **Header Section (Outside Card):**
   - Title (text-xl, font-semibold)
   - Info icon with tooltip
   - Chart Config dropdown button

2. **Description (Outside Card):**
   - Small text (text-sm, text-muted-foreground)
   - Explains the metric briefly

3. **Card Content:**
   - Two-column layout (grid-cols-2)
   - Vertical divider between columns
   - Left: Visualization (chart/graph)
   - Right: Data table with rankings

4. **Chart Section:**
   - Sub-header (text-lg, font-semibold)
   - Large metric value (text-2xl or text-3xl, font-bold)
   - Contained chart with background (bg-gray-50/dark:bg-gray-900/20)

5. **Table Section:**
   - Sub-header (text-lg, font-semibold)
   - Large metric value (text-2xl or text-3xl, font-bold)
   - ShadCN Table component
   - Expand button at bottom

### 6.4 Interactive Elements

#### 6.4.1 Buttons
**Primary Button:**
- Background: `bg-primary`
- Text: `text-primary-foreground`
- Hover: `hover:bg-primary/90`
- Size: `h-9 px-4 py-2` (default)

**Ghost Button:**
- Background: Transparent
- Hover: `hover:bg-accent hover:text-accent-foreground`
- Use: Secondary actions, navigation items

**Outline Button:**
- Border: `border`
- Background: `bg-background`
- Hover: `hover:bg-accent hover:text-accent-foreground`

**Icon Button:**
- Size: `size-9` (default)
- Padding: None
- Contains only icon

#### 6.4.2 Tooltips
- Trigger: Info icon (Info from lucide-react)
- Content: White text on dark background
- Position: Auto-adjusted based on space
- Content: Brief explanation of metric

#### 6.4.3 Dropdowns
- Trigger: Button with ChevronDown icon
- Menu: White background with shadow
- Items: Hover effect with `hover:bg-accent`
- Icons: Optional icons on menu items

#### 6.4.4 Hover Effects
- **Charts:** Hover cards appear above bars/segments
- **Table Rows:** `hover:bg-muted/30` background
- **Buttons:** Background color change with transition
- **Cards:** Subtle elevation increase (optional)

### 6.5 Responsive Design

#### 6.5.1 Breakpoints
- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

#### 6.5.2 Mobile Adaptations
- Sidebar: Collapsible/hidden on mobile
- Two-column layouts: Stack to single column
- Table: Horizontal scroll
- Charts: Responsive container sizing

---

## 7. Data Models

### 7.1 Dashboard Data Model

```typescript
interface DashboardData {
  filters: FilterState
  visibility: VisibilityMetrics
  prompts: PromptMetrics[]
  clusters: ClusterData[]
  sentiment: SentimentData
  citations: CitationData[]
}
```

### 7.2 Filter State

```typescript
interface FilterState {
  dateRange: {
    from: Date
    to: Date
  }
  selectedPlatforms: Platform[]
  selectedTopics: Topic[]
  selectedPersonas: Persona[]
  regions: Region[]
}

interface Platform {
  id: string
  name: string
  enabled: boolean
  icon: string
}

interface Topic {
  id: string
  name: string
  enabled: boolean
}

interface Persona {
  id: string
  name: string
  enabled: boolean
}

interface Region {
  id: string
  name: string
  code: string
  enabled: boolean
}

// Filter Options
const platformOptions = [
  { id: 'all', name: 'All Platforms' },
  { id: 'claude', name: 'Claude' },
  { id: 'gemini', name: 'Gemini' },
  { id: 'perplexity', name: 'Perplexity' },
  { id: 'chatgpt', name: 'ChatGPT' }
]

const topicOptions = [
  { id: 'conversion', name: 'Conversion Rate Optimization' },
  { id: 'personalization', name: 'Personalization' }
]

const personaOptions = [
  { id: 'marketing', name: 'Marketing Manager' },
  { id: 'product', name: 'Product Manager' }
]
```

### 7.3 Visibility Metrics

```typescript
interface VisibilityMetrics {
  score: number                    // 0-100
  rank: number
  trend: 'up' | 'down' | 'stable'
  competitors: CompetitorMetric[]
}

interface CompetitorMetric {
  rank: number
  name: string
  score: string | number
  isOwner: boolean                 // True for InnovateTech (owned brand)
  trend?: 'up' | 'down' | 'stable'
  change?: string
  // Note: logo property removed - using brand names only
}
```

### 7.4 Depth of Mention

```typescript
interface DepthOfMentionMetrics {
  score: number                    // Numeric score
  rank: number
  competitors: CompetitorMetric[]
  details: {
    averagePosition: number
    averageLength: number
    detailLevel: 'high' | 'medium' | 'low'
  }
}
```

### 7.5 Share of Voice

```typescript
interface ShareOfVoiceMetrics {
  percentage: number               // 0-100
  rank: number
  competitors: CompetitorMetric[]
  distribution: {
    name: string
    value: number
    color: string
  }[]
}

### 7.6 Position Distribution

```typescript
interface PositionDistributionMetrics {
  firstRank: number               // Percentage for 1st position
  secondRank: number              // Percentage for 2nd position
  thirdRank: number               // Percentage for 3rd position
  competitors: CompetitorMetric[]
  chartType: 'bar' | 'donut'
  selectedRank: 'firstRank' | 'secondRank' | 'thirdRank'
}

### 7.7 User Persona Rankings

```typescript
interface UserPersonaRankings {
  persona: string
  status: 'Leader' | 'Needs work'
  statusColor: string
  rankings: {
    rank: number
    name: string
    isOwner: boolean
  }[]
}
```

### 7.8 Topic Rankings

```typescript
interface TopicRankings {
  topic: string
  status: 'Leader' | 'Strong' | 'Needs work'
  statusColor: string
  rankings: {
    rank: number
    logo: string
    name: string
  }[]
}
```

### 7.9 Prompts

```typescript
interface Prompt {
  id: number
  prompt: string
  topic: string
  language: string
  region: string
  persona: string
  platforms: string[]              // Array of platform emojis/icons
  updatedAt: string
  createdAt: string
  icon: string
  isNew: boolean
}

interface PromptMetrics {
  topic: string
  promptCount: number
  visibilityRank: string           // e.g., "#1"
  visibilityScore: string          // e.g., "95%"
  averagePosition: string          // e.g., "1.0"
  citationShare: string            // e.g., "26.9%"
  citationRank: string             // e.g., "#2"
  executions: number
  depthOfMention: 'High' | 'Medium' | 'Low'
  subjectiveImpression: 'Positive' | 'Neutral' | 'Negative'
  trend: 'up' | 'down' | 'neutral'
  promptPreview: string
  subjectiveMetrics: SubjectiveMetrics
}

interface SubjectiveMetrics {
  relevance: string
  influence: string
  uniqueness: string
  position: string
  clickProbability: string
  diversity: string
}
```

### 7.10 Clusters

```typescript
interface ClusterData {
  id: string
  x: number
  y: number
  size: number
  brand: string
  color: string
  topic: string
}

interface ClusterTopic {
  name: string
  clusters: ClusterData[]
}
```

### 7.11 Sentiment

```typescript
interface SentimentData {
  overall: {
    positive: number               // Percentage
    negative: number               // Percentage
    neutral: number                // Percentage
  }
  trend: {
    date: string
    value: number
  }[]
  byTopic: TopicSentiment[]
  byPlatform: PlatformSentiment[]
  byPersona: PersonaSentiment[]
}

interface TopicSentiment {
  topic: string
  prompts: PromptSentiment[]
}

interface PromptSentiment {
  id: number
  name: string
  sentiment: 'Positive' | 'Negative' | 'Neutral'
  sentimentScore: number           // -1 to 1
}

interface PlatformSentiment {
  platform: string
  positive: number
  negative: number
}

interface PersonaSentiment {
  persona: string
  positive: number
  negative: number
}
```

### 7.12 Citations

```typescript
interface CitationData {
  type: 'Brand' | 'Earned' | 'Social'
  count: number
  percentage: number
  links: CitationLink[]
  expanded?: boolean
}

interface CitationLink {
  url: string
  domain: string
  sentiment: 'Positive' | 'Negative' | 'Neutral'
  citationShare: string
  citationRank: string
  subjectiveMetrics: SubjectiveMetrics
}

interface CitationShareData {
  date: string
  rankly: number
  competitors: {
    name: string
    value: number
  }[]
}

interface CitationRankData {
  rank: number
  domain: string
  logo: string
  citations: number
  change: number
}
```

---

## 8. User Flows

### 8.1 Main Navigation Flow

```
User lands on Dashboard
  ├─> Sidebar always visible (unless Prompt Builder full-screen)
  ├─> Top Navigation shows 5 tabs
  ├─> Default tab: Visibility
  └─> User clicks tab
      └─> Content area updates with tab-specific content
```

### 8.2 Visibility Tab Flow

```
Visibility Tab loads
  ├─> Display Visibility Score card
  │   ├─> Show bar chart of competitors
  │   ├─> Show ranking table
  │   ├─> Chart config dropdown (bar/donut)
  │   ├─> Date comparison functionality
  │   └─> Hover on bars shows tooltip
  ├─> Display Word Count card
  │   ├─> Show bar chart of competitors
  │   ├─> Show ranking table
  │   └─> Same functionality as Visibility Score
  ├─> Display Depth of Mention card
  │   ├─> Show bar chart of competitors
  │   ├─> Show ranking table
  │   ├─> Chart config dropdown
  │   └─> Date comparison functionality
  ├─> Display Share of Voice card
  │   ├─> Show donut chart (interactive)
  │   ├─> Show ranking table with trends
  │   ├─> Chart config dropdown (bar/donut)
  │   └─> Date comparison functionality
  ├─> Display Average Position card
  │   ├─> Show bar chart
  │   ├─> Show ranking table
  │   ├─> Chart config dropdown
  │   └─> Date comparison functionality
  ├─> Display Position Distribution card
  │   ├─> Show stacked bar chart
  │   ├─> Show donut chart with rank selection
  │   ├─> Rank selection buttons (1st/2nd/3rd)
  │   ├─> Show ranking table
  │   └─> Date comparison functionality
  ├─> Display Topic Rankings card
  │   ├─> Show 2 topics with status badges
  │   └─> Show top 5 competitors per topic
  └─> Display User Persona Rankings card
      ├─> Show 2 personas with status badges
      └─> Show top 5 competitors per persona
```

### 8.3 Prompts Tab Flow

```
Prompts Tab loads
  ├─> Display prompt count and description
  ├─> Show "Modify Prompts" button
  ├─> Display expandable table grouped by sort option
  │   ├─> Default: Sort by Topic
  │   ├─> Topics are collapsible
  │   ├─> Each topic shows aggregate metrics
  │   └─> Expanding shows individual prompts
  └─> User actions:
      ├─> Click "Modify Prompts"
      │   ├─> Open Prompt Builder Modal
      │   ├─> User selects AI method or Excel upload
      │   ├─> User configures platforms, topics, etc.
      │   ├─> Click "Generate"
      │   └─> Navigate to Prompt Designer page
      │       ├─> Full-screen view (hides sidebar/topnav)
      │       ├─> Show editable prompts table
      │       ├─> User edits prompts inline
      │       ├─> User adds new prompts
      │       ├─> User selects prompts with checkboxes
      │       ├─> Footer appears when selection made
      │       └─> User saves or cancels
      ├─> Click sort dropdown
      │   ├─> Select "Topic", "Region", or "Persona"
      │   └─> Table re-groups with new tags
      ├─> Click expand icon on topic
      │   └─> Show/hide prompt rows
      └─> Click star icon on prompt
          └─> Mark as favorite (future feature)
```

### 8.4 Agent Analytics Flow

```
Agent Analytics loads (separate feature)
  ├─> Display setup/connection screen initially
  ├─> Show GA4 or SDK connection options
  └─> After connection:
      ├─> Display main dashboard
      ├─> Show top navigation with filters
      │   ├─> Platforms dropdown (multi-select)
      │   ├─> Topics dropdown (multi-select)
      │   └─> User Personas dropdown (multi-select)
      ├─> Display Human/AI Visits tabs
      ├─> Display Visibility Score section (copied from main)
      ├─> Display Platform Traffic section
      │   ├─> Left: Bar/donut chart with Chart Config
      │   ├─> Right: Rankings table
      │   └─> Date comparison functionality
      └─> User interactions:
          ├─> Multi-select from dropdowns
          ├─> Switch between bar/donut charts
          ├─> Select comparison dates
          └─> View expanded rankings
```

### 8.5 Sentiment Tab Flow

```
Sentiment Tab loads
  ├─> Display Sentiment Analysis card
  │   ├─> Show positive/negative sentiment toggle
  │   ├─> Display line chart for selected sentiment
  │   ├─> Show current period percentage
  │   └─> Display horizontal sentiment bar
  └─> Display All Topics & Prompts table
      ├─> Topics are expandable
      ├─> Each topic shows prompt count
      ├─> Expanding shows prompts with sentiment tags
      └─> Sentiment tags color-coded (green/red)
```

### 8.6 Citations Tab Flow

```
Citations Tab loads
  ├─> Display Citation Share card
  │   ├─> Show line chart over time
  │   └─> Show ranked domain table
  ├─> Display Citation Types card
  │   ├─> Show horizontal bar chart
  │   │   ├─> Brand citations
  │   │   ├─> Earned citations
  │   │   └─> Social citations
  │   └─> Show detailed breakdown table
  │       ├─> Expandable citation types
  │       ├─> Each type shows links
  │       └─> Each link has View button
  │           └─> Opens Subjective Impression panel
  │               ├─> Show prompt summary
  │               ├─> Show 6 collapsible metrics
  │               │   ├─> Relevance
  │               │   ├─> Influence
  │               │   ├─> Uniqueness
  │               │   ├─> Position
  │               │   ├─> Click Probability
  │               │   └─> Diversity
  │               └─> Save/Close buttons
  └─> User interactions:
      ├─> Click expand icon on citation type
      │   └─> Show/hide citation links
      ├─> Click "View" on citation link
      │   └─> Open side panel
      ├─> In side panel:
      │   ├─> Expand/collapse metric sections
      │   ├─> Read metric details
      │   ├─> Click "Save" (future: save notes)
      │   └─> Click "Close" or X
      │       └─> Close panel
      └─> Hover on chart segments
          └─> Show tooltips
```

### 8.7 Theme Toggle Flow

```
User clicks theme toggle
  ├─> Current theme: Light
  │   ├─> User clicks Moon icon
  │   ├─> Theme changes to Dark
  │   └─> All components update colors
  └─> Current theme: Dark
      ├─> User clicks Sun icon
      ├─> Theme changes to Light
      └─> All components update colors
```

---

## 9. Feature Specifications

### 9.1 Visibility Tab Features

#### 9.1.1 Visibility Score Section
**Purpose:** Show overall visibility performance compared to competitors

**Components:**
- Header with title, description, and chart config dropdown
- Two-column layout with vertical divider
- Left: Vertical bar chart
- Right: Ranking table

**Metrics Displayed:**
- Current Visibility Score: 24%
- Visibility Rank: #6
- Top 5 competitors with scores

**Visual Elements:**
- Bar chart with Y-axis labels (0% to 65.3%)
- Bars with brand names (no logos/emojis)
- Hover tooltips showing brand name and score
- Table with rank, brand name, and score
- Owned brand (InnovateTech) highlighted in blue (#2563EB)

**Interactions:**
- Hover on bars: Show tooltip with brand details
- Click on chart config: Open dropdown menu (bar/donut)
- Date comparison functionality
- Expand button for full rankings table

**Data Source:**
```typescript
const chartData = [
  { name: 'TechCorp', score: 59.4, color: '#3B82F6' },
  { name: 'DataFlow', score: 42.4, color: '#EF4444' },
  { name: 'CloudSync', score: 37.2, color: '#8B5CF6' },
  { name: 'SmartAI', score: 29.5, color: '#06B6D4' },
  { name: 'InnovateTech', score: 24.0, color: '#10B981', isOwner: true },
]
```

#### 9.1.2 Word Count Section
**Purpose:** Show share of total answer words attributed to your brand

**Components:**
- Same structure as Visibility Score
- Bar chart showing word count percentages
- Ranking table

**Metrics Displayed:**
- Current Word Count: 59.4%
- Word Count Rank: #6
- Top 5 competitors with scores

**Visual Elements:**
- Bar chart with Y-axis labels (0% to 65.3%)
- Bars with brand names (no logos/emojis)
- Hover tooltips
- Table with rank, brand name, and score

#### 9.1.3 Depth of Mention Section
**Purpose:** Show how thoroughly brand is mentioned in AI answers

**Components:**
- Same structure as Visibility Score
- Bar chart showing depth scores
- Ranking table
- Chart config dropdown (bar/donut)
- Date comparison functionality

**Metrics Displayed:**
- Current Depth Score: 3.2
- Depth Rank: #6
- Top 5 competitors with scores

**Visual Elements:**
- Bar chart with Y-axis labels (0 to 8.2)
- Bars with brand names (no logos/emojis)
- Hover tooltips
- Table with rank, brand name, and score
- Expand button for full rankings table

**Description:**
"Weight of your brand's mentions based on how early they appear"

#### 9.1.4 Share of Voice Section
**Purpose:** Show brand mention percentage relative to total market

**Components:**
- Two-column layout
- Left: Interactive donut chart or bar chart
- Right: Ranking table with trends
- Chart config dropdown (bar/donut)
- Date comparison functionality

**Metrics Displayed:**
- Current Share: 1.9%
- Share Rank: #16
- Top 4 competitors with trends

**Visual Elements:**
- Interactive donut chart with colored segments
- Hover tooltips on segments (shows owned brand % only)
- Table showing rank, brand, score, and trend
- Trend arrows (up/down/stable) with absolute number changes
- Expand button for full rankings table

**Trend Indicators:**
- Up: Green arrow with positive change
- Down: Red arrow with negative change
- Stable: Gray minus with 0.0% change

**Description:**
"Mentions of your brand in AI-generated answers relative to competitors"

#### 9.1.5 Average Position Section
**Purpose:** Show average position where brand appears in AI answers

**Components:**
- Two-column layout
- Left: Bar chart or donut chart
- Right: Ranking table
- Chart config dropdown (bar/donut)
- Date comparison functionality

**Metrics Displayed:**
- Current Average Position: 1.8
- Position Rank: #2
- Top 5 competitors

**Visual Elements:**
- Bar chart (lower is better)
- Hover tooltips
- Table with rankings
- Expand button for full rankings table

**Note:** Lower position number = better (appearing earlier)

**Description:**
"The typical order where your brand appears in answers"

#### 9.1.5 Position Distribution Section
**Purpose:** Show how often brands appear in 1st, 2nd, and 3rd positions

**Components:**
- Two-column layout with vertical divider
- Left: Stacked bar chart or donut chart
- Right: Ranking table

**Chart Types:**
- **Bar Chart:** Stacked bars showing 1st/2nd/3rd position percentages
- **Donut Chart:** Interactive with rank selection (1st/2nd/3rd)

**Rank Selection Buttons:**
- Segmented control with "1st", "2nd", "3rd" options
- Always visible (disabled in bar mode, interactive in donut mode)
- Positioned next to Chart Config button

**Visual Elements:**
- Stacked bars with different colors for each rank
- Interactive donut chart with rank selection
- Hover tooltips showing detailed breakdowns
- Chart Config dropdown for switching between bar/donut

**Data Structure:**
```typescript
{
  name: 'InnovateTech',
  firstRank: 41.2,    // Percentage
  secondRank: 28.5,   // Percentage
  thirdRank: 15.3     // Percentage
}
```

#### 9.1.6 Visibility Rankings by Topic Section
**Purpose:** Show competitive position across different topics

**Components:**
- Table-style grid layout
- Topics as rows
- Positions 1-5 as columns (reduced from 10)

**Topics Tracked:**
1. Conversion Rate Optimization (Needs work - Red badge)
2. Personalization (Leader - Green badge)

**Visual Elements:**
- Horizontal rows for each topic
- Status badge (colored pill)
- Brand names without logos/emojis
- Owned brand highlighted in blue (#2563EB)

#### 9.1.7 User Persona Rankings Section
**Purpose:** Show competitive position across different user personas

**Components:**
- Table-style grid layout
- Personas as rows
- Positions 1-5 as columns

**Personas Tracked:**
1. Marketing Manager (Leader - Green badge)
2. Product Manager (Needs work - Red badge)

**Visual Elements:**
- Horizontal rows for each persona
- Status badge (colored pill)
- Brand names without logos/emojis
- Owned brand highlighted in blue (#2563EB)

**Data Structure:**
```typescript
{
  persona: 'Marketing Manager',
  status: 'Leader',
  statusColor: 'bg-green-500',
  rankings: [
    { rank: 1, name: 'InnovateTech', isOwner: true },
    { rank: 2, name: 'TechCorp', isOwner: false },
    // ... ranks 3-5
  ]
}
```

### 9.2 Prompts Tab Features

#### 9.2.1 Prompt List & Management
**Purpose:** View and manage all configured prompts

**Header Section:**
- Prompt count display: "6 prompts"
- Description: "The Fibr configuration includes 6 unique prompts across 2 topics, which are run daily."
- "Modify Prompts" button (Settings icon)

**Table Structure:**
- Expandable/collapsible rows
- Grouped by Topic (default) / Region / Persona
- Column headers with info icons and sort arrows

**Columns:**
1. **Expand/Collapse:** Chevron icon
2. **Topic/Region/Persona:** Group name with badge
3. **Visibility Rank:** e.g., "#1 -"
4. **Visibility Score:** Percentage with circle indicator
5. **Average Position:** Decimal number
6. **Citation Share:** Percentage
7. **Citation Rank:** Rank number
8. **Executions:** Integer count
9. **Action:** Star icon or Download icon

**Group Row Display:**
- Bold group name
- Badge showing "# Topic" / "# Region" / "# Persona"
- Prompt count: "X prompts"
- Aggregate metrics
- Hyphen after each metric

**Prompt Row Display (when expanded):**
- Indented (pl-8)
- Muted text color
- Full prompt text
- Same metrics as group
- Star icon for favoriting

**Sort Options:**
- Topic (default)
- Region
- Persona

**Dynamic Behavior:**
- Changing sort option re-groups table
- Badge text changes ("# Topic" → "# Region" → "# Persona")
- Column header updates to match sort option

**Mock Data:**
```typescript
{
  topic: "Personalization",
  promptCount: 1,
  visibilityRank: "#1",
  visibilityScore: "95%",
  averagePosition: "1",
  citationShare: "26.9%",
  citationRank: "#2",
  executions: 32,
}
```

#### 9.2.2 Prompt Builder Modal
**Purpose:** Configure new prompts or modify existing ones

**Trigger:** Click "Modify Prompts" button

**Modal Structure:**
- Title: "Prompt Builder" (centered)
- Two-column layout with vertical divider

**Left Column - AI Generation:**
- Title: "Using AI"
- Subtitle: "Let our AI engine create tailored prompts based on your goals"
- Input field: "Describe what you want to achieve"
- Example prompts section
- "Generate with AI" button

**Right Column - Excel Upload:**
- Title: "Upload Excel"
- Subtitle: "Import prompts from your Excel file and generate results"
- Upload icon
- File format requirements
- "Upload Excel" button

**Configuration Section (After Method Selection):**
- Platform selection: Multi-select dropdown with checkboxes
  - ChatGPT
  - Gemini
  - Claude
  - Perplexity
  - (etc.)
- Topic selection: Dropdown
- Persona selection: Dropdown
- Region selection: Dropdown
- Language selection: Dropdown
- Voice & Tone: Text input

**Action Buttons:**
- "Generate" button (primary)
- "Cancel" button (secondary)

**Behavior:**
- Click "Generate": Close modal, navigate to Prompt Designer
- Click "Cancel": Close modal, return to Prompts tab

#### 9.2.3 Prompt Designer Page
**Purpose:** Edit and manage generated prompts before saving

**Layout:**
- Full-screen view (hides sidebar and top navigation)
- Header with "Prompt Builder" title and "Back" button
- Editable table of prompts

**Header Section:**
- "Prompt Builder" title
- "Back" button (returns to Prompts tab)
- Compact, minimal design

**Table Structure:**
- Checkbox column for selection
- Prompt column (editable text areas)
- Topic column (editable or "+ Topic")
- Platform column (emoji icons)
- Language column
- Region column
- Tags column (with "+ Tag" option)
- Created date column
- Updated date column
- Actions menu (three dots)

**Grid Layout:**
```css
grid-cols-[40px_minmax(400px,1fr)_80px_100px_100px_100px_120px_120px_120px_60px]
```

**Features:**
- Inline editing of prompt text
- Checkbox selection for bulk actions
- Footer appears when items selected
- New prompts highlighted in light green
- Three-dot menu for row actions

**Left Sidebar (Topics):**
- "Topics" header with count
- "+ Add Topic" button
- List of available topics
- Topic selection for filtering

**Add Topic Flow:**
- Click "+ Add Topic"
- Input field appears
- Enter topic name
- Click checkmark or cancel
- New topic added to list
- Empty prompts table shown for new topic

**Footer (Conditional):**
- Only appears when checkboxes are selected
- Shows count of selected items
- Action buttons (Delete, Export, etc.)

**New Prompt Button:**
- "+ Add Your First Prompt" (when topic has no prompts)
- Appears as a table row
- Clicking adds editable row

**Behavior:**
- All prompts editable inline
- Changes auto-save (or manual save)
- New prompts flagged with `isNew: true`
- Can switch between topics
- Back button returns to Prompts tab

### 9.3 Clusters Tab Features

#### 9.3.1 Topic Cluster Map
**Purpose:** Visualize relationships between topics and brand presence

**Components:**
- Interactive SVG-based cluster visualization
- Legend with brand toggles
- Zoom and pan controls

**Visual Elements:**
- 4-5 large topic clusters
- Dots representing brands within clusters
- Density indicates activity level
- Color-coding by brand
- Cluster labels

**Interactions:**
- **Drag to Pan:** Click and drag to move view
- **Zoom:** Scroll wheel to zoom in/out
- **Hover on Dot:** Show tooltip with brand info
- **Click Cluster:** Expand/collapse cluster
- **Toggle Brand:** Show/hide brand dots via legend

**Legend:**
- List of all brands with colors
- Checkbox to toggle visibility
- Total count of mentions per brand

**Data Structure:**
```typescript
{
  id: 'cluster-1',
  x: 250,
  y: 200,
  size: 80,
  brand: 'Rankly',
  color: '#10B981',
  topic: 'Personalization'
}
```

**Theme Support:**
- Adapts colors for light/dark mode
- Background: `bg-gray-50` / `bg-neutral-950`
- Dots: Brand-specific colors with opacity

### 9.4 Sentiment Tab Features

#### 9.4.1 Sentiment Analysis Section
**Purpose:** Show overall sentiment breakdown and trends

**Components:**
- Two-column layout with vertical divider
- Left: Sentiment trend chart
- Right: Sentiment summary and distribution bar

**Left Column:**
- Toggle: "Positive Sentiment" / "Negative Sentiment"
- Current percentage: Large text (e.g., "61.2%")
- "Current Period" toggle
- Line chart showing trend over last 30 days

**Right Column:**
- Positive section:
  - "61.2% Positive" header
  - Description text
  - Single bullet point summary
- Negative section:
  - "38.8% Negative" header
  - Description text
  - Single bullet point summary
- Horizontal sentiment distribution bar
  - Red section (Negative)
  - Green section (Positive)
  - Percentage labels

**Chart Interactions:**
- Click toggle to switch Positive/Negative
- Chart data and colors update dynamically
- Hover on line shows tooltip with exact values
- Current period toggle (future feature)

**Mock Data:**
```typescript
const positiveTrendData = [
  { date: 'Sep 1', value: 58 },
  { date: 'Sep 8', value: 60 },
  { date: 'Sep 15', value: 59 },
  { date: 'Sep 22', value: 62 },
  { date: 'Sep 30', value: 61.2 },
]
```

#### 9.4.2 All Topics & Prompts Table
**Purpose:** Show sentiment breakdown by topic and prompt

**Structure:**
- Expandable table grouped by topics
- Each topic shows prompt count
- Expanding shows individual prompts
- Sentiment tags for each prompt

**Columns:**
1. **Expand/Collapse:** Chevron icon
2. **Topic/Prompt:** Name (topics bold, prompts indented)
3. **Sentiment:** Color-coded badge

**Topic Row:**
- Topic name (e.g., "Topic 1")
- Prompt count (e.g., "2 prompts")
- No sentiment tag (aggregate)

**Prompt Row (when expanded):**
- Prompt name (e.g., "Prompt 1")
- Indented (pl-8)
- Sentiment badge:
  - Positive: Green badge with "Positive"
  - Negative: Red badge with "Negative"
  - Neutral: Gray badge with "Neutral"

**Mock Data:**
```typescript
{
  topic: "Topic 1",
  prompts: [
    { id: 1, name: "Prompt 1", sentiment: "Positive", score: 0.8 },
    { id: 2, name: "Prompt 2", sentiment: "Negative", score: -0.3 }
  ]
}
```

### 9.5 Citations Tab Features

#### 9.5.1 Citation Share Section
**Purpose:** Track citation share over time and by domain

**Components:**
- Two-column layout with vertical divider
- Left: Line chart showing citation share over time
- Right: Ranked table of domains by citations

**Left Column:**
- Title: "Citation Share Over Time"
- Multi-line chart comparing Rankly vs competitors
- X-axis: Time (last 30 days)
- Y-axis: Citation share percentage
- Legend showing all brands

**Right Column:**
- Title: "Citation Rank by Domain"
- Table with rankings
  - Rank number
  - Domain name/logo
  - Citation count
  - Trend indicator (up/down arrow with change)

**Mock Data:**
```typescript
const citationShareData = [
  {
    date: 'Sep 1',
    rankly: 15,
    techCorp: 25,
    dataFlow: 20,
  },
  // ... more dates
]
```

#### 9.5.2 Citation Types Section
**Purpose:** Break down citations by type and quality

**Components:**
- Horizontal stacked bar chart
- Detailed breakdown table
- Expandable citation links

**Bar Chart:**
- Brand Citations: Blue segment
- Earned Citations: Green segment
- Social Citations: Purple segment
- Percentages displayed on bars

**Breakdown Table:**
- Three main rows (Brand, Earned, Social)
- Each row is expandable
- Shows citation count and percentage
- No metrics at type level (hyphens)

**Expanded Links:**
- Domain name with favicon
- Sentiment badge (Positive/Negative/Neutral)
- Citation Share percentage
- Citation Rank number
- "View" button

**Citation Type Row:**
- Type icon and name
- Expand/collapse chevron
- Citation count (e.g., "45 citations")
- Empty metrics (dashes)

**Citation Link Row (when expanded):**
- Indented (bg-muted/20)
- Domain name (e.g., "techcrunch.com")
- Sentiment badge
- Citation share (e.g., "2.5%")
- Citation rank (e.g., "#3")
- "View" button

**Mock Data:**
```typescript
{
  type: 'Brand',
  count: 45,
  percentage: 60,
  links: [
    {
      url: 'https://rankly.com/blog/...',
      domain: 'rankly.com',
      sentiment: 'Positive',
      citationShare: '2.5%',
      citationRank: '#3'
    }
  ]
}
```

#### 9.5.3 Subjective Impression Analysis Panel
**Purpose:** Show detailed analysis for individual citations

**Trigger:** Click "View" button on citation link

**Panel Type:** Right-side sheet (slides in from right)

**Header:**
- Title: "Subjective Impression Analysis"
- Close button (X icon)

**Content:**
- **Prompt Summary:** Brief description of the analyzed prompt
- **Six Metric Sections:** Collapsible accordions

**Metric Sections:**
1. **Relevance**
   - Description: "Is the citation actually answering the query?"
   - Text area with analysis
   - Read-only

2. **Influence**
   - Description: "Does it shape the user's takeaway?"
   - Text area with analysis
   - Read-only

3. **Uniqueness**
   - Description: "Is the info special, or just repeated elsewhere?"
   - Text area with analysis
   - Read-only

4. **Position**
   - Description: "Subjectively measured, not just raw position."
   - Text area with analysis
   - Read-only

5. **Click Probability**
   - Description: "Would the user click the citation if links are shown?"
   - Text area with analysis
   - Read-only

6. **Diversity**
   - Description: "Does the citation bring in a new perspective?"
   - Text area with analysis
   - Read-only

**Footer:**
- "Save" button (future: save notes)
- "Close" button

**Behavior:**
- Click metric header to expand/collapse
- Scroll through long content
- Click outside or Close to dismiss
- Future: Edit and save notes

### 9.6 Common Features Across Tabs

#### 9.6.1 Chart Config Dropdown
**Purpose:** Allow users to change chart visualization type

**Trigger:** Click "Chart Config" button with Settings icon

**Options (vary by section):**
- Bar Chart
- Donut Chart
- Line Chart (limited sections)

**Behavior:**
- Click option to change visualization
- Chart updates immediately
- Selection persists for session
- Positioned inside left split screen, top right corner

#### 9.6.2 Multi-Select Filter Dropdowns
**Purpose:** Allow users to filter data by multiple criteria

**Filter Types:**
- **Platforms:** All Platforms, Claude, Gemini, Perplexity, ChatGPT
- **Topics:** Conversion Rate Optimization, Personalization
- **User Personas:** Marketing Manager, Product Manager

**Behavior:**
- Multi-select with checkboxes
- Dropdowns remain open until user clicks outside
- "All" option selects/deselects all items
- Dynamic button text shows selection count
- Positioned on top right of navigation area

#### 9.6.3 Date Comparison System
**Purpose:** Allow users to compare metrics across different time periods

**Components:**
- Primary date selector (Today, Yesterday, etc.)
- Comparison date selector
- Comparison badges showing percentage changes
- Calendar integration

**Visual Elements:**
- Comparison badges appear next to main metrics
- Rank change arrows in tables
- Grouped bar charts for comparison view
- Inner/outer ring donut charts for comparison

#### 9.6.4 Info Tooltips
**Purpose:** Provide contextual help for metrics

**Trigger:** Hover over Info icon

**Content Examples:**
- **Visibility Score:** "How often your brand appears in AI-generated answers across selected platforms, topics, and personas"
- **Depth of Mention:** "Rewards mentions that appear earlier and are described in more detail within the AI-generated answer"
- **Share of Voice:** "Mentions of your brand in AI-generated answers in relation to competitors"
- **Average Position:** "Shows the average position where this brand appears in AI-generated answers"

**Design:**
- Dark background
- White text
- Auto-positioned
- Small arrow pointer
- Max-width: 300px

**Note:** Tooltips removed in favor of direct description text below titles

#### 9.6.5 Expand Buttons
**Purpose:** Show more data in tables

**Location:** Bottom-right of tables

**Appearance:**
- Ghost variant button
- Small size
- Muted text color
- "Expand" label

**Behavior:**
- Click to show full table in modal
- Shows all 15 brand rankings
- Modal with scrollable table
- Close button to return to main view

**Implementation:**
- `pb-8 relative` on table container
- `bottom-2 right-2` positioning for button
- Modal opens with full rankings data

#### 9.6.6 Hover Cards
**Purpose:** Show detailed information on hover

**Chart Hover Cards:**
- Appear above hovered element
- Show brand name (no logos)
- Display exact metric value
- Dark background, white text
- Pointer arrow to hovered element

**Table Row Hover:**
- Background: `hover:bg-muted/30`
- Smooth transition
- No tooltip (data already visible)

**Interactive Charts:**
- Donut charts show hover effects
- Active segment highlighting
- Dynamic center content
- Color-coded segments with hardcoded hex values

---

## 10. Non-Functional Requirements

### 10.1 Performance

#### 10.1.1 Load Times
- **Initial Page Load:** < 3 seconds
- **Tab Switch:** < 500ms
- **Chart Rendering:** < 1 second
- **Table Sorting:** < 300ms

#### 10.1.2 Optimization
- Code splitting for each tab
- Lazy loading of chart libraries
- Memoization of expensive computations
- Debounced user inputs

#### 10.1.3 Bundle Size
- Main bundle: < 500KB
- Per-tab bundle: < 200KB
- Total JS: < 2MB
- Optimized images and assets

### 10.2 Accessibility

#### 10.2.1 WCAG 2.1 Compliance
- Level AA compliance minimum
- Level AAA for text contrast

#### 10.2.2 Keyboard Navigation
- All interactive elements keyboard accessible
- Logical tab order
- Focus indicators visible
- Escape key closes modals

#### 10.2.3 Screen Reader Support
- ARIA labels on all interactive elements
- ARIA live regions for dynamic content
- Semantic HTML structure
- Alt text for all images/icons

#### 10.2.4 Color Contrast
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text
- Minimum 3:1 for UI components
- Color not sole indicator of information

### 10.3 Browser Compatibility

#### 10.3.1 Supported Browsers
- **Chrome:** Last 2 versions
- **Firefox:** Last 2 versions
- **Safari:** Last 2 versions
- **Edge:** Last 2 versions

#### 10.3.2 Mobile Browsers
- Chrome Mobile (Android)
- Safari Mobile (iOS)

#### 10.3.3 Polyfills
- ES6+ features for older browsers
- CSS Grid fallbacks
- Flexbox support

### 10.4 Responsive Design

#### 10.4.1 Breakpoints
- **Mobile:** 320px - 639px
- **Tablet:** 640px - 1023px
- **Desktop:** 1024px+

#### 10.4.2 Adaptive Layouts
- Single-column on mobile
- Two-column on tablet
- Multi-column on desktop
- Collapsible sidebar on mobile

#### 10.4.3 Touch Targets
- Minimum 44x44px for touch elements
- Adequate spacing between clickable items
- Swipe gestures for mobile navigation

### 10.5 Security

#### 10.5.1 Data Protection
- HTTPS only
- Secure cookies
- XSS prevention
- CSRF protection

#### 10.5.2 Authentication (Future)
- OAuth 2.0 support
- JWT tokens
- Session management
- Password requirements

#### 10.5.3 Data Privacy
- GDPR compliance
- Data encryption at rest
- Secure data transmission
- Privacy policy adherence

### 10.6 Scalability

#### 10.6.1 Data Volume
- Support for 1000+ prompts
- 100+ topics
- 50+ competitors
- 365 days of historical data

#### 10.6.2 Concurrent Users (Future)
- Support for 1000+ concurrent users
- Load balancing
- CDN for static assets
- Database optimization

### 10.7 Internationalization (Future)

#### 10.7.1 Language Support
- English (default)
- Spanish
- French
- German
- Japanese

#### 10.7.2 Localization
- Date/time formats
- Number formats
- Currency formats
- RTL language support

### 10.8 Error Handling

#### 10.8.1 User-Facing Errors
- Clear error messages
- Actionable error states
- Graceful degradation
- Retry mechanisms

#### 10.8.2 Technical Errors
- Error logging
- Error tracking (Sentry, etc.)
- Stack traces in development
- User-friendly messages in production

#### 10.8.3 Offline Support (Future)
- Service worker for caching
- Offline mode indicator
- Cached data access
- Sync when online

---

## 11. Future Enhancements

### 11.1 Phase 2 Features

#### 11.1.1 Advanced Filtering
- Date range picker implementation
- Multi-select filters
- Saved filter presets
- Filter combinations

#### 11.1.2 Export Capabilities
- CSV export for tables
- PDF reports
- Scheduled email reports
- Custom report builder

#### 11.1.3 Prompt Optimization
- AI-powered prompt suggestions
- A/B testing for prompts
- Performance predictions
- Automated optimization

#### 11.1.4 Competitive Intelligence
- Competitor tracking
- Market share trends
- Gap analysis
- Opportunity identification

### 11.2 Phase 3 Features

#### 11.2.1 Real-Time Data
- WebSocket integration
- Live updates
- Real-time notifications
- Streaming data visualization

#### 11.2.2 Collaboration Tools
- User roles and permissions
- Team workspaces
- Shared dashboards
- Comments and annotations

#### 11.2.3 API Access
- RESTful API
- GraphQL endpoint
- Webhooks
- API documentation

#### 11.2.4 Mobile App
- iOS native app
- Android native app
- Push notifications
- Offline sync

### 11.3 AI/ML Enhancements

#### 11.3.1 Predictive Analytics
- Trend forecasting
- Anomaly detection
- Churn prediction
- Performance scoring

#### 11.3.2 Natural Language Queries
- Chat interface for data queries
- Voice commands
- Smart suggestions
- Automated insights

#### 11.3.3 Content Optimization
- Content recommendations
- SEO suggestions
- Topic gap analysis
- Competitive content analysis

### 11.4 Integration Capabilities

#### 11.4.1 Platform Integrations
- Google Analytics
- SEMrush
- Ahrefs
- HubSpot
- Salesforce

#### 11.4.2 Data Sources
- CRM integration
- Marketing automation
- Social media platforms
- Content management systems

#### 11.4.3 Export Integrations
- Slack notifications
- Email integrations
- Zapier workflows
- Custom webhooks

---

## 12. Appendices

### 12.1 Glossary

**Answer Engine:** AI-powered platforms that generate direct answers to user queries (e.g., ChatGPT, Perplexity, Claude)

**Citation:** A reference or mention of a brand/source in an AI-generated answer

**Citation Share:** Percentage of total citations in a market that belong to a specific brand

**Depth of Mention:** Metric measuring how thoroughly a brand is described in AI answers

**Prompt:** A query or question submitted to an AI platform

**Share of Voice:** Percentage of brand mentions relative to total market mentions

**Subjective Impression:** Qualitative analysis of citation quality and impact

**Visibility Score:** Overall metric of how often a brand appears in AI answers

### 12.2 Competitive Dummy Companies

The following dummy company names are used throughout the application for competitive benchmarking:

1. **TechCorp** - Primary competitor
2. **DataFlow** - Data analytics competitor
3. **CloudSync** - Cloud services competitor
4. **SmartAI** - AI/ML competitor
5. **EcomFlow** - E-commerce competitor
6. **SecureTech** - Security competitor
7. **SearchPro** - Search/discovery competitor
8. **CreativeSuite** - Creative tools competitor
9. **MarketingHub** - Marketing platform competitor
10. **LandingPro** - Landing page competitor
11. **PageBuilder** - Page building competitor

**InnovateTech** - The owned brand being tracked (Green: #10B981, Blue highlight: #2563EB)

**Note:** All company logos/emojis have been removed in favor of brand names only. The owned brand (InnovateTech) is identified through blue color highlighting (#2563EB) and bold text styling, without "Owned" badges.

### 12.3 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Sep 30, 2025 | Initial PRD creation |
| 1.1 | Dec 2024 | Updated to reflect current implementation:
| | | - Removed Clusters tab from Answer Engine Analytics
| | | - Added Agent Analytics as separate feature
| | | - Updated Visibility tab with new sections (Word Count, Position Distribution, User Persona Rankings)
| | | - Updated filter system with multi-select dropdowns
| | | - Updated typography system with Google Fonts
| | | - Updated brand identification system
| | | - Updated data models and company names
| | | - Added date comparison functionality
| | | - Added expand button functionality
| | | - Updated chart configurations and interactivity |

### 12.4 Contributors

- Product Team
- Engineering Team
- Design Team
- Analytics Team

---

## Document Control

**Last Review Date:** September 30, 2025  
**Next Review Date:** December 30, 2025  
**Document Status:** Active  
**Classification:** Internal Use  

**Approval:**
- Product Manager: ________________  
- Engineering Lead: ________________  
- Design Lead: ________________  

---

*End of Document*
