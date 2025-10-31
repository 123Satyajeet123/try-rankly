/**
 * Dynamic favicon utility functions
 * Automatically generates favicon URLs for any company name or URL
 * Supports multiple favicon APIs with intelligent fallbacks
 */

import { resolveToDomain, extractDomainFromUrl } from './domainResolver'

/**
 * Converts a company name to a clean domain format
 * @param companyName - The company name to convert
 * @returns Clean domain-friendly string
 */
export const cleanCompanyName = (companyName: string): string => {
  return companyName
    .toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/^(the|a|an)\s+/i, '') // Remove articles
}

/**
 * Generates multiple domain variations for better favicon detection
 * @param cleanName - Clean company name without spaces/special chars
 * @returns Array of possible domain variations
 */
export const generateDomainVariations = (cleanName: string): string[] => {
  return [
    `${cleanName}.com`,
    `${cleanName}.org`,
    `${cleanName}.net`,
    `${cleanName}.io`,
    `www.${cleanName}.com`,
    `${cleanName}.co`,
    `${cleanName}.ai`
  ]
}

/**
 * Gets a dynamic favicon URL for any company name
 * @param companyName - The company name
 * @param size - Favicon size (default: 16)
 * @returns Favicon URL
 */
export const extractDomain = (input: string): string | null => {
  try {
    // If full URL
    if (/^https?:\/\//i.test(input)) {
      const { hostname } = new URL(input)
      return hostname.replace(/^www\./, '')
    }
    // If looks like a domain already
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input)) {
      return input.replace(/^www\./, '')
    }
    return null
  } catch {
    return null
  }
}

/**
 * Favicon API providers with priority order
 */
const FAVICON_APIS = {
  GOOGLE: (domain: string, size: number) => 
    `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`,
  FAVICON_GRABBER: (domain: string) => 
    `http://favicongrabber.com/api/grab/${domain}`,
  FETCH_FAVICON: (domain: string) => 
    `https://fetchfavicon.com/i/${domain}`
}

/**
 * Gets favicon URL from Google's service (primary)
 */
export const getFaviconUrlForDomain = (domain: string, size: number = 16): string => {
  return FAVICON_APIS.GOOGLE(domain, size)
}

/**
 * Direct favicon URL mappings for known platforms (uses official favicons)
 * These bypass the Google favicon API to use the official favicon URLs directly
 */
const DIRECT_FAVICON_MAPPINGS: Record<string, string> = {
  'chatgpt': 'https://chat.openai.com/favicon.ico',
  'openai': 'https://chat.openai.com/favicon.ico',
  'gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
  'claude': 'https://claude.ai/favicon.ico',
  'anthropic': 'https://claude.ai/favicon.ico',
  'perplexity': 'https://www.perplexity.ai/favicon.ico'
}

/**
 * Gets favicon URL for an identifier (URL, domain, or company name)
 * Prioritizes direct mappings for known platforms, then URL-based resolution
 */
export const getFaviconUrlForIdentifier = (identifier: string, size: number = 16): string => {
  if (!identifier) {
    return getFallbackFaviconUrl(size)
  }

  // First check for direct favicon mappings (prioritized for known platforms)
  // This ensures we use the official favicon URLs directly
  const lowerIdentifier = identifier.toLowerCase().trim()
  if (DIRECT_FAVICON_MAPPINGS[lowerIdentifier]) {
    return DIRECT_FAVICON_MAPPINGS[lowerIdentifier]
  }

  // Try to extract domain if it's already a URL
  const domain = extractDomainFromUrl(identifier)
  if (domain) {
    return getFaviconUrlForDomain(domain, size)
  }

  // Use domain resolver for intelligent name-to-domain conversion
  const resolvedDomain = resolveToDomain(identifier)
  if (resolvedDomain) {
    return getFaviconUrlForDomain(resolvedDomain, size)
  }

  // Final fallback to old name-based logic
  return getDynamicFaviconFromName(identifier, size)
}

/**
 * Gets dynamic favicon URL - now supports URL or company name
 * @param identifier - Company name, URL, or domain
 * @param size - Favicon size (default: 16)
 * @param ausDarkMode - Optional dark mode flag (for future use)
 * @returns Favicon URL
 */
export const getDynamicFaviconUrl = (
  identifier: string | { url?: string; name: string }, 
  size: number = 16, 
  _isDarkMode?: boolean
): string => {
  // Support object format with url and name
  if (typeof identifier === 'object' && identifier !== null) {
    // Prioritize URL if available
    if (identifier.url) {
      return getFaviconUrlForIdentifier(identifier.url, size)
    }
    // Fallback to name
    if (identifier.name) {
      return getFaviconUrlForIdentifier(identifier.name, size)
    }
    return getFallbackFaviconUrl(size)
  }

  // Support string format (URL, domain, or company name)
  if (typeof identifier === 'string') {
    return getFaviconUrlForIdentifier(identifier, size)
  }

  return getFallbackFaviconUrl(size)
}

// Internal: name-based mapping and fallback generation
const getDynamicFaviconFromName = (companyName: string, size: number = 16): string => {
  // First check for known platform mappings - matching top navbar implementation
  const faviconMap: Record<string, string> = {
    'ChatGPT': 'https://chat.openai.com/favicon.ico',
    'OpenAI': 'https://chat.openai.com/favicon.ico',
    'openai': 'https://chat.openai.com/favicon.ico',
    'Claude': 'https://claude.ai/favicon.ico',
    'claude': 'https://claude.ai/favicon.ico',
    'Gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
    'gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
    'perplexity': 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32',
    'Perplexity': 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32',
    // Credit card companies
    'HDFC Bank': 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=32',
    'HDFC Bank Freedom Credit Card': 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=32',
    'Chase Freedom Flex': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Chase Ink Business': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Chase Ink Bu': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Chase Sapphire': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Chase Sapphi': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'JPMorgan Chase': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Discover it Cash Back': 'https://www.google.com/s2/favicons?domain=discover.com&sz=32',
    'Bank of America': 'https://www.google.com/s2/favicons?domain=bankofamerica.com&sz=32',
    'Wells Fargo': 'https://www.google.com/s2/favicons?domain=wellsfargo.com&sz=32',
    'Citibank': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32',
    'Citi Custom Cash Card': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32',
    'Citi Double Cash Card': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32',
    // Capital One - critical fix
    'Capital One': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    'capital one': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    'CapitalOne': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    'capitalone': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    // American Express - critical fix
    'American Express': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'american express': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'American Express SmartEarn': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'AmericanExpress': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'americanexpress': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'Amex': 'https://www.google.com/s2/favicons?domain=amex.com&sz=32',
    'AMEX': 'https://www.google.com/s2/favicons?domain=amex.com&sz=32',
    'amex': 'https://www.google.com/s2/favicons?domain=amex.com&sz=32',
    // itilite Corp - fix
    'itilite Corp': 'https://www.google.com/s2/favicons?domain=itilite.com&sz=32',
    'itilite': 'https://www.google.com/s2/favicons?domain=itilite.com&sz=32',
    'Itilite': 'https://www.google.com/s2/favicons?domain=itilite.com&sz=32'
  }
  
  // Normalize company name for matching
  const normalizedName = companyName.trim()
  
  // Return specific mapping if available (exact match first)
  if (faviconMap[normalizedName]) {
    return faviconMap[normalizedName]
  }
  
  // Try case-insensitive exact match
  const exactMatch = Object.keys(faviconMap).find(key => key.toLowerCase() === normalizedName.toLowerCase())
  if (exactMatch) {
    return faviconMap[exactMatch]
  }
  
  // Try partial matching for credit card brands and common company names
  const partialMatches: Record<string, string> = {
    'hdfc': 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=32',
    'chase': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'discover': 'https://www.google.com-to/favicons?domain=discover.com&sz=32',
    'citi': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32',
    'bank of america': 'https://www.google.com/s2/favicons?domain=bankofamerica.com&sz=32',
    'wells fargo': 'https://www.google.com/s2/favicons?domain=wellsfargo.com&sz=32',
    'capital one': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    'capitalone': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    'american express': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'americanexpress': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'amex': 'https://www.google.com/s2/favicons?domain=amex.com&sz=32',
    'itilite': 'https://www.google.com/s2/favicons?domain=itilite.com&sz=32'
  }
  
  // Check for partial matches (case-insensitive)
  const lowerCompanyName = normalizedName.toLowerCase()
  for (const [key, faviconUrl] of Object.entries(partialMatches)) {
    if (lowerCompanyName.includes(key.toLowerCase())) {
      return faviconUrl
    }
  }
  
  // Fallback to dynamic generation for other companies
  const cleanName = cleanCompanyName(companyName)
  const domainVariations = generateDomainVariations(cleanName)
  
  // Use Google's favicon service with the first domain variation
  // Google's service is smart enough to find favicons for most domains
  return `https://www.google.com/s2/favicons?domain=${domainVariations[0]}&sz=${size}`
}

/**
 * Fallback favicon URL for when dynamic favicons fail
 * @param size - Favicon size (default: 16)
 * @returns Generic favicon URL
 */
export const getFallbackFaviconUrl = (size: number = 16): string => {
  return `https://www.google.com/s2/favicons?domain=google.com&sz=${size}`
}

/**
 * Cache for favicon URLs to avoid repeated failed attempts
 */
const faviconCache = new Map<string, string>()

/**
 * Enhanced error handler with retry logic using different APIs
 * @param event - The error event from img onError
 */
export const handleFaviconError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
  const target = event.currentTarget
  const currentSrc = target.src
  const originalIdentifier = target.getAttribute('data-favicon-identifier') || ''
  const size = parseInt(target.getAttribute('data-favicon-size') || '16', 10)

  // Extract domain from failed URL
  let domain: string | null = null
  
  // Try to extract domain from Google API URL
  const googleMatch = currentSrc.match(/domain=([^&]+)/)
  if (googleMatch) {
    domain = googleMatch[1]
  } else {
    // Try to resolve from original identifier
    domain = resolveToDomain(originalIdentifier) || extractDomainFromUrl(originalIdentifier)
  }

  if (domain && !faviconCache.has(`failed:${domain}`)) {
    // Mark this domain as failed for Google API
    faviconCache.set(`failed:${domain}`, '')
    
    // Try FetchFavicon API as fallback
    const fallbackUrl = FAVICON_APIS.FETCH_FAVICON(domain)
    target.src = fallbackUrl
    return
  }

  // All APIs failed, use generic fallback
  target.src = getFallbackFaviconUrl(size)
}

/**
 * Enhanced favicon component props - supports URL or company name
 */
export interface FaviconProps {
  companyName?: string
  url?: string
  size?: number
  className?: string
  alt?: string
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void
}

/**
 * Creates favicon image props for easy use in components
 * @param props - Favicon configuration
 * @returns Image props object
 */
export const createFaviconProps = (props: FaviconProps) => {
  const { companyName, url, size = 16, className = "w-4 h-4 rounded-sm", alt, onError } = props
  
  // Prioritize URL if available
  const identifier = url ? { url, name: companyName || '' } : (companyName || '')
  const faviconUrl = getDynamicFaviconUrl(identifier, size)
  
  return {
    src: faviconUrl,
    alt: alt || companyName || 'Favicon',
    className,
    'data-favicon-identifier': url || companyName || '',
    'data-favicon-size': size.toString(),
    onError: onError || handleFaviconError
  }
}