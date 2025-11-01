# Conversion Event Implementation Plan for Traffic & LLM Platform Performance

## Overview
Based on the [GA4 API Schema documentation](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema), we need to implement conversion event selection for Traffic Performance and LLM Platform Performance sections, similar to what's already implemented in Pages and Devices tabs.

## Current State

### ✅ Already Implemented
1. **Backend Endpoint**: `/api/ga4/conversion-events` - Fetches available conversion events
2. **Helper Function**: `getConversionEventMetric()` - Converts event names to GA4 metric format
3. **Pages Tab**: Already has conversion event dropdown
4. **Devices Tab**: Already has conversion event dropdown

### ❌ Not Implemented
1. **Traffic Performance**: Uses hardcoded `'conversions'` metric
2. **LLM Platform Performance**: Uses hardcoded `'conversions'` metric

## GA4 Conversion Event Metrics

According to the [GA4 API documentation](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema):

### Standard Conversion Events
These can be used directly as metric names:
- `conversions` - All conversion events (default)
- `purchases` - Purchase events
- `addToCarts` - Add to cart events
- `beginCheckouts` - Begin checkout events
- `viewItems` - View item events
- `searches` - Search events
- `logins` - Login events
- `signUps` - Sign up events
- `generateLeads` - Generate lead events

### Custom Key Events
Custom conversion events registered in GA4 use the format:
- `keyEvents:eventName` - For custom events marked as conversions

### Rate Metrics
Each key event also has rate metrics:
- `sessionKeyEventRate:eventName` - Percentage of sessions with the event
- `userKeyEventRate:eventName` - Percentage of users who triggered the event

## Implementation Plan

### Phase 1: Backend Changes

#### 1.1 Update `/api/ga4/platform-split` endpoint
**File**: `backend/src/routes/ga4.js`

**Changes**:
- Accept `conversionEvent` query parameter (default: `'conversions'`)
- Use `getConversionEventMetric()` helper to convert to valid GA4 metric name
- Replace hardcoded `{ name: 'conversions' }` with dynamic conversion metric
- Pass conversion event info to transformer for logging

**Code Location**: Around line 244-280

#### 1.2 Update `/api/ga4/llm-platforms` endpoint
**File**: `backend/src/routes/ga4.js`

**Changes**:
- Accept `conversionEvent` query parameter (default: `'conversions'`)
- Use `getConversionEventMetric()` helper to convert to valid GA4 metric name
- Replace hardcoded `{ name: 'conversions' }` with dynamic conversion metric
- Pass conversion event info to transformer for logging

**Code Location**: Around line 286-388

#### 1.3 Update Transformers
**File**: `backend/src/utils/ga4DataTransformer.js`

**Changes**:
- `transformToPlatformSplit()`: Update metric index 2 from `'conversions'` to accept dynamic conversion metric
- `transformToLLMPlatforms()`: Update metric index 2 from `'conversions'` to accept dynamic conversion metric
- Add logging to show which conversion event is being used

**Note**: Metric index position remains the same (index 2), only the metric name changes.

### Phase 2: Frontend Changes

#### 2.1 Add Conversion Event Selector to Traffic Performance
**File**: `components/agent-analytics/platforms/UnifiedTrafficPerformanceSection.tsx`

**Changes**:
- Add state: `const [selectedConversionEvent, setSelectedConversionEvent] = useState('conversions')`
- Add state: `const [conversionEvents, setConversionEvents] = useState<any[]>([])`
- Fetch conversion events on mount using `getConversionEvents()` from `@/services/ga4Api`
- Add dropdown UI (similar to PagesTab) in the header section
- When conversion event changes, trigger parent component to refetch data

**UI Placement**: Add dropdown in the header section, next to date range selector

#### 2.2 Add Conversion Event Selector to LLM Platform Performance
**File**: `components/agent-analytics/platforms/UnifiedLLMPlatformPerformanceSection.tsx`

**Changes**:
- Add state: `const [selectedConversionEvent, setSelectedConversionEvent] = useState('conversions')`
- Add state: `const [conversionEvents, setConversionEvents] = useState<any[]>([])`
- Fetch conversion events on mount using `getConversionEvents()` from `@/services/ga4Api`
- Add dropdown UI (similar to PagesTab) in the header section
- When conversion event changes, trigger parent component to refetch data

**UI Placement**: Add dropdown in the header section, next to "Total Sessions" and "Avg Session Quality"

#### 2.3 Update Parent Component
**File**: `components/tabs/agent-analytics/GA4AgentAnalyticsTab.tsx`

**Changes**:
- Accept `selectedConversionEvent` as a prop or state
- Pass `selectedConversionEvent` to API calls:
  - `getPlatformSplit(startDate, endDate, dateRange, selectedConversionEvent)`
  - `getLLMPlatforms(startDate, endDate, dateRange, selectedConversionEvent)`
- Update `useEffect` dependencies to refetch when conversion event changes

#### 2.4 Update API Service
**File**: `services/ga4Api.ts`

**Changes**:
- Update `getPlatformSplit()` to accept optional `conversionEvent` parameter
- Update `getLLMPlatforms()` to accept optional `conversionEvent` parameter
- Add conversion event to query string: `&conversionEvent=${encodeURIComponent(conversionEvent)}`

### Phase 3: UI/UX Considerations

#### 3.1 Dropdown Design
- **Location**: Header section, next to existing filters
- **Label**: "Conversion Event:"
- **Default**: "Conversions (All)"
- **Grouping**: 
  - Standard Events (conversions, purchases, etc.)
  - Custom Events (from GA4)
- **Tooltip**: Explain what conversion events are and how they affect the data

#### 3.2 Loading States
- Show loading indicator when conversion event changes
- Maintain table structure during loading (skeleton rows)

#### 3.3 Error Handling
- If selected conversion event is not available, fallback to `'conversions'`
- Show warning toast if fallback occurs
- Log error details for debugging

### Phase 4: Testing & Validation

#### 4.1 Test Cases
1. **Default Behavior**: Verify `'conversions'` works as default
2. **Standard Events**: Test each standard event (purchases, signUps, etc.)
3. **Custom Events**: Test custom key events if available
4. **Invalid Events**: Test fallback behavior for invalid events
5. **Data Consistency**: Verify conversion rates update correctly
6. **Date Range Changes**: Verify conversion event persists across date range changes

#### 4.2 Validation
- Conversion rates should update immediately when event changes
- Total sessions should remain the same (conversion event only affects conversion count)
- Percentages should recalculate correctly
- Comparison data (absolute change, percentage change) should update correctly

## Implementation Steps

### Step 1: Backend - Platform Split Endpoint
```javascript
// In /api/ga4/platform-split route
const { startDate = '7daysAgo', endDate = 'today', conversionEvent = 'conversions' } = req.query;
const conversionMetric = getConversionEventMetric(conversionEvent);

const reportConfig = {
  // ... existing config
  metrics: [
    { name: 'sessions' },
    { name: 'engagementRate' },
    { name: conversionMetric }, // Dynamic conversion metric
    // ... rest of metrics
  ]
};
```

### Step 2: Backend - LLM Platforms Endpoint
```javascript
// In /api/ga4/llm-platforms route
const { startDate = '7daysAgo', endDate = 'today', conversionEvent = 'conversions' } = req.query;
const conversionMetric = getConversionEventMetric(conversionEvent);

const reportConfig = {
  // ... existing config
  metrics: [
    { name: 'sessions' },
    { name: 'engagementRate' },
    { name: conversionMetric }, // Dynamic conversion metric
    // ... rest of metrics
  ]
};
```

### Step 3: Frontend - Add Conversion Event Selector
```typescript
// In UnifiedTrafficPerformanceSection.tsx or UnifiedLLMPlatformPerformanceSection.tsx
const [conversionEvents, setConversionEvents] = useState<any[]>([]);
const [selectedConversionEvent, setSelectedConversionEvent] = useState('conversions');

useEffect(() => {
  const fetchConversionEvents = async () => {
    try {
      const response = await getConversionEvents();
      if (response.success) {
        setConversionEvents(response.data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversion events:', error);
    }
  };
  fetchConversionEvents();
}, []);

// Add dropdown in header
<Select value={selectedConversionEvent} onValueChange={handleConversionEventChange}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select conversion event" />
  </SelectTrigger>
  <SelectContent>
    {conversionEvents.map((event) => (
      <SelectItem key={event.name} value={event.name}>
        {event.displayName} {event.category ? `(${event.category})` : ''}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Step 4: Update API Calls
```typescript
// In GA4AgentAnalyticsTab.tsx
const fetchPlatformSplit = async () => {
  const response = await getPlatformSplit(startDate, endDate, dateRange, selectedConversionEvent);
  // ... handle response
};

const fetchLLMPlatforms = async () => {
  const response = await getLLMPlatforms(startDate, endDate, dateRange, selectedConversionEvent);
  // ... handle response
};
```

## Files to Modify

### Backend
1. `backend/src/routes/ga4.js`
   - Update `/api/ga4/platform-split` route (line ~244)
   - Update `/api/ga4/llm-platforms` route (line ~286)

2. `backend/src/utils/ga4DataTransformer.js`
   - Add logging for conversion event usage
   - (No major changes needed - metric index stays the same)

### Frontend
1. `components/agent-analytics/platforms/UnifiedTrafficPerformanceSection.tsx`
   - Add conversion event state and dropdown

2. `components/agent-analytics/platforms/UnifiedLLMPlatformPerformanceSection.tsx`
   - Add conversion event state and dropdown

3. `components/tabs/agent-analytics/GA4AgentAnalyticsTab.tsx`
   - Pass conversion event to API calls
   - Handle conversion event state changes

4. `services/ga4Api.ts`
   - Update `getPlatformSplit()` function
   - Update `getLLMPlatforms()` function

## References
- [GA4 API Schema - Metrics](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema#metrics)
- Existing implementation in `components/agent-analytics/pages/PagesTab.tsx`
- Existing helper function `getConversionEventMetric()` in `backend/src/routes/ga4.js`

