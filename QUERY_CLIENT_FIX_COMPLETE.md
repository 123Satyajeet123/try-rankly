# QueryClient Fix Complete ✅

## Problem

Runtime error: "No QueryClient set, use QueryClientProvider to set one"

The GA4 charts components (`PlatformTrendChart.tsx`, etc.) use `@tanstack/react-query`'s `useQuery` hook, but the app wasn't wrapped with a `QueryClientProvider`.

## Solution

Copied the exact implementation from traffic-analytics:

### 1. Created QueryProvider Component

**File**: `try-rankly/components/providers/QueryProvider.tsx`

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**Key points**:
- Wraps React Query's `QueryClientProvider`
- Sets up a QueryClient with default options
- 1 minute stale time for cache management
- Retry on failure: 1 attempt
- Uses `useState` to create a single QueryClient instance

### 2. Updated Root Layout

**File**: `try-rankly/app/layout.tsx`

**Added imports**:
```typescript
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "sonner";
```

**Wrapped app with QueryProvider**:
```typescript
return (
  <html lang="en" suppressHydrationWarning>
    <body>
      <QueryProvider>
        <ThemeProvider>
          <AuthProvider>
            <OnboardingProvider>
              <AnalyticsProvider>
                <FilterProvider>
                  {children}
                  <Toaster richColors position="top-right" />
                </FilterProvider>
              </AnalyticsProvider>
            </OnboardingProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </body>
  </html>
);
```

**Provider order**: QueryProvider wraps everything (same as traffic-analytics)

### 3. Added Toaster

Also added `<Toaster />` from sonner for toast notifications (matching traffic-analytics).

## Why This Works

1. **QueryClientProvider** provides the QueryClient context to all child components
2. **useQuery** hooks in chart components can now access the QueryClient
3. **Configuration** matches traffic-analytics exactly (staleTime, retry)
4. **Provider hierarchy** follows the same pattern as traffic-analytics

## Verification

- ✅ `@tanstack/react-query` already installed
- ✅ `sonner` already installed  
- ✅ Build compiles successfully
- ✅ No runtime errors
- ✅ Charts can now use `useQuery` hook

## Impact

All GA4 chart components can now:
- Use `useQuery` for data fetching
- Cache data for 1 minute
- Retry failed requests once
- Share the same QueryClient instance across the app

The error is resolved and GA4 Agent Analytics charts will work correctly.

