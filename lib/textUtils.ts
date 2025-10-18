/**
 * Text utility functions for consistent text handling across the application
 */

/**
 * Truncate text to specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 12)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string | undefined | null, maxLength: number = 12): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Truncate text for display in cards and general UI
 * @param text - The text to truncate
 * @returns Truncated text (12 characters max)
 */
export function truncateForDisplay(text: string | undefined | null): string {
  return truncateText(text, 12)
}

/**
 * Truncate text for chart labels
 * @param text - The text to truncate
 * @returns Truncated text (12 characters max)
 */
export function truncateForChart(text: string | undefined | null): string {
  return truncateText(text, 12)
}

/**
 * Truncate text for ranking tables
 * @param text - The text to truncate
 * @returns Truncated text (12 characters max)
 */
export function truncateForRanking(text: string | undefined | null): string {
  return truncateText(text, 12)
}

/**
 * Truncate text for tooltips
 * @param text - The text to truncate
 * @returns Truncated text (12 characters max)
 */
export function truncateForTooltip(text: string | undefined | null): string {
  return truncateText(text, 12)
}
