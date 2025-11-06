# Frontend Tooltip Improvements

## Summary

Increased character limit for brand/competitor names and added hover tooltips showing full name and score across all ranking sections.

---

## Changes Made

### 1. Increased Character Limit ✅

**File:** `lib/textUtils.ts`

**Changes:**
- Updated default `maxLength` from 12 to 20 characters
- All truncation functions now use 20 characters:
  - `truncateForDisplay()` - 20 chars
  - `truncateForChart()` - 20 chars
  - `truncateForRanking()` - 20 chars
  - `truncateForTooltip()` - 20 chars

**Impact:**
- Brand names can now display up to 20 characters before truncation
- Better readability for longer brand names

---

### 2. Added Hover Tooltips ✅

Added tooltips to all sections where brand/competitor names are displayed with truncation. Tooltips show:
- **Full brand name** (bold)
- **Metric score** (Visibility Score, Citation Share, Depth of Mention, etc.)
- **Rank** (#1, #2, etc.)

**Sections Updated:**

#### ✅ UnifiedVisibilitySection
- Main rankings table
- Expanded dialog rankings
- Tooltip shows: Full name, Visibility Score, Rank

#### ✅ CitationShareSection
- Main rankings table
- Expanded dialog rankings
- Tooltip shows: Full name, Citation Share, Rank

#### ✅ CitationTypesSection
- Main rankings table
- Expanded dialog rankings
- Tooltip shows: Full name, Citation Share, Rank

#### ✅ UnifiedDepthOfMentionSection
- Main rankings table
- Expanded dialog rankings
- Tooltip shows: Full name, Depth of Mention, Rank

#### ✅ UnifiedAveragePositionSection
- Rankings table
- Tooltip shows: Full name, Average Position, Rank

#### ✅ UnifiedSentimentSection
- Main rankings table
- Expanded dialog rankings
- Tooltip shows: Full name, Sentiment Score (Positive/Negative/Neutral), Rank

#### ✅ UnifiedTopicRankingsSection
- Already had tooltips ✅ (no changes needed)

#### ✅ UnifiedPersonaRankingsSection
- Already had tooltips ✅ (no changes needed)

---

## Tooltip Implementation Pattern

All tooltips follow the same pattern as `UnifiedTopicRankingsSection`:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-center gap-2 cursor-help">
        <img src={...} alt={item.name} />
        <span>{truncateForRanking(item.name)}</span>
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p className="text-xs">
        <strong>{item.name}</strong><br/>
        [Metric Name]: {item.score}%<br/>
        Rank: #{item.rank}
      </p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Key Features:**
- `cursor-help` class for better UX indication
- Full brand name in bold
- Metric-specific score display
- Rank information
- Consistent styling across all sections

---

## Files Modified

1. `lib/textUtils.ts` - Increased character limit to 20
2. `components/tabs/visibility/UnifiedVisibilitySection.tsx` - Added tooltips
3. `components/tabs/citations/CitationShareSection.tsx` - Added tooltips
4. `components/tabs/citations/CitationTypesSection.tsx` - Added tooltips
5. `components/tabs/visibility/UnifiedDepthOfMentionSection.tsx` - Added tooltips
6. `components/tabs/visibility/UnifiedAveragePositionSection.tsx` - Added tooltips
7. `components/tabs/sentiment/UnifiedSentimentSection.tsx` - Added tooltips

---

## User Experience Improvements

### Before:
- Brand names truncated at 12 characters
- No way to see full name or score on hover
- Inconsistent experience across sections

### After:
- Brand names truncated at 20 characters (67% increase)
- Hover tooltips show full name and score
- Consistent tooltip experience across all ranking sections
- Better accessibility with `cursor-help` indicator

---

## Testing Recommendations

1. **Character Limit:**
   - Test with brand names of various lengths
   - Verify 20-character limit is applied correctly
   - Check that names longer than 20 chars show "..."

2. **Tooltips:**
   - Hover over truncated brand names
   - Verify tooltip shows full name
   - Verify tooltip shows correct metric score
   - Verify tooltip shows correct rank
   - Test on all ranking sections

3. **Consistency:**
   - Verify all sections have tooltips
   - Verify tooltip styling is consistent
   - Verify tooltip content is accurate

---

**Status:** ✅ Complete  
**Date:** 2025-11-05

