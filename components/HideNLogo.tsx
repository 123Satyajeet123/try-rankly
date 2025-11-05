'use client'

import { useEffect } from 'react'

/**
 * Component to hide/remove the "N" logo that appears in the bottom-left corner
 * This is typically injected by browser extensions or development tools
 * Only runs in production to avoid affecting development experience
 */
export function HideNLogo() {
  useEffect(() => {
    // Only hide in production
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    const removeNLogo = () => {
      // Find all elements in the sidebar or bottom-left area
      const sidebar = document.querySelector('aside')
      if (!sidebar) return

      // Look for circular badges with "N" text in the sidebar footer
      const footer = sidebar.querySelector('footer') || sidebar.lastElementChild
      if (!footer) return

      // Find all rounded-full elements
      const roundedElements = footer.querySelectorAll('[class*="rounded-full"]')
      
      roundedElements.forEach((element) => {
        // Check if element contains "N" text
        const text = element.textContent?.trim()
        if (text === 'N' || (text?.length === 1 && text === 'N')) {
          // Hide the element
          ;(element as HTMLElement).style.display = 'none'
          // Also try to remove from DOM
          element.remove()
        }
      })

      // Also check for any fixed/absolute positioned elements in bottom-left with "N"
      const allElements = document.querySelectorAll('[class*="fixed"], [class*="absolute"]')
      allElements.forEach((element) => {
        const styles = window.getComputedStyle(element)
        const isBottomLeft = 
          (styles.position === 'fixed' || styles.position === 'absolute') &&
          (styles.bottom === '0px' || styles.bottom === '24px' || styles.bottom === '1.5rem') &&
          (styles.left === '0px' || styles.left === '24px' || styles.left === '1.5rem')
        
        if (isBottomLeft) {
          const text = element.textContent?.trim()
          if (text === 'N' || (text?.length === 1 && text === 'N')) {
            ;(element as HTMLElement).style.display = 'none'
            element.remove()
          }
        }
      })
    }

    // Run immediately
    removeNLogo()

    // Also run after a delay to catch dynamically injected elements
    const timeout = setTimeout(removeNLogo, 1000)

    // Use MutationObserver to catch dynamically added elements
    const observer = new MutationObserver(() => {
      removeNLogo()
    })

    // Observe the sidebar for changes
    const sidebar = document.querySelector('aside')
    if (sidebar) {
      observer.observe(sidebar, {
        childList: true,
        subtree: true,
      })
    }

    return () => {
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [])

  return null
}

