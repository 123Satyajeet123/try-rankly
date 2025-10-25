/**
 * Dynamic favicon utility functions
 * Automatically generates favicon URLs for any company name
 */

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
export const getDynamicFaviconUrl = (companyName: string, size: number = 16, isDarkMode?: boolean): string => {
  // First check for known platform mappings - using Google's favicon service
  const faviconMap: Record<string, string> = {
    'ChatGPT': 'https://www.google.com/s2/favicons?domain=chat.openai.com&sz=32',
    'OpenAI': 'https://www.google.com/s2/favicons?domain=openai.com&sz=32',
    'Claude': 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32',
    'Gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
    'Perplexity': 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32',
    // Credit card companies
    'HDFC Bank': 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=32',
    'HDFC Bank Freedom Credit Card': 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=32',
    'Chase Freedom Flex': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'JPMorgan Chase': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Discover it Cash Back': 'https://www.google.com/s2/favicons?domain=discover.com&sz=32',
    'Bank of America': 'https://www.google.com/s2/favicons?domain=bankofamerica.com&sz=32',
    'Wells Fargo': 'https://www.google.com/s2/favicons?domain=wellsfargo.com&sz=32',
    'Citibank': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32',
    'Citi Custom Cash Card': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32',
    'Citi Double Cash Card': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32'
  }
  
  // Return specific mapping if available
  if (faviconMap[companyName]) {
    return faviconMap[companyName]
  }
  
  // Try partial matching for credit card brands
  const partialMatches: Record<string, string> = {
    'HDFC': 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=32',
    'Chase': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Discover': 'https://www.google.com/s2/favicons?domain=discover.com&sz=32',
    'Citi': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32',
    'Bank of America': 'https://www.google.com/s2/favicons?domain=bankofamerica.com&sz=32',
    'Wells Fargo': 'https://www.google.com/s2/favicons?domain=wellsfargo.com&sz=32'
  }
  
  // Check for partial matches
  for (const [key, faviconUrl] of Object.entries(partialMatches)) {
    if (companyName.toLowerCase().includes(key.toLowerCase())) {
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
 * Handles favicon loading errors with fallback
 * @param event - The error event from img onError
 */
export const handleFaviconError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
  const target = event.currentTarget
  target.src = getFallbackFaviconUrl()
}

/**
 * Enhanced favicon component props
 */
export interface FaviconProps {
  companyName: string
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
  const { companyName, size = 16, className = "w-4 h-4 rounded-sm", alt, onError } = props
  
  return {
    src: getDynamicFaviconUrl(companyName, size),
    alt: alt || companyName,
    className,
    onError: onError || handleFaviconError
  }
}