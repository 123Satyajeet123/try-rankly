# Unified Brands & Competitors Display Update

## Summary
Updated the LLM Answers section to display brands and competitors **together in one row** instead of separate sections.

## What Changed

### Before
```
Brands: 🎨 🎨 🎨    Competitors: 🎨 🎨
       ↑ separate      ↑ separate rows
```

### After
```
Brands Mentioned: 🎨 🎨 🎨 🎨 🎨
                  ↑ all in one line
```

---

## Implementation

### File Modified
`components/tabs/prompts/PromptsSection.tsx` (lines 2001-2048)

### Structure Change

**Before** (Separate sections):
```tsx
<div>
  <div>
    <span>Brands:</span>
    {brands.map(...)}
  </div>
  <div>
    <span>Competitors:</span>
    {competitors.map(...)}
  </div>
</div>
```

**After** (Unified row):
```tsx
<div>
  <span>Brands Mentioned:</span>
  <div>
    {brands.map(...)}
    {competitors.map(...)}
  </div>
</div>
```

---

## Key Features

### Single Label
- Changed from "Brands:" and "Competitors:" to single **"Brands Mentioned:"**
- Includes both user's brand and competitors

### Unified Display
- All favicons in one continuous row
- Uses `flex-wrap` for responsive layout
- Consistent spacing and hover effects

### Empty State
- Shows "No brands mentioned" when empty
- Only displays badge when brands exist

---

## Visual Result

### Layout
```
┌─────────────────────────────────────────────────────┐
│ Platform Name                                       │
│                                                     │
│ [LLM Response Text]                                 │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Brands Mentioned: 🎨 🎨 🎨 🎨 🎨 🎨           │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Tooltips
- Each favicon shows brand name on hover
- Same behavior for brands and competitors

---

## Benefits

### Cleaner UI
- More compact display
- Single cohesive section
- Less visual clutter

### Better UX
- All mentions in one place
- Faster to scan
- Consistent with table column

### Flexible
- Handles any number of brands
- Responsive wrapping
- Works on all screen sizes

---

## Code Structure

```tsx
<div className="flex items-center gap-2 ...">
  {/* Single label */}
  <span className="font-semibold text-muted-foreground">
    Brands Mentioned:
  </span>
  
  {/* Unified favicon row */}
  <div className="flex items-center gap-1.5 flex-wrap">
    {/* Brands */}
    {brands.map(brand => <Favicon />)}
    
    {/* Competitors */}
    {competitors.map(competitor => <Favicon />)}
  </div>
</div>
```

---

## Consistency

This matches the main table column implementation where:
- Single column: "Brand Mentioned"
- Shows all competitors in one row
- No separation between types

Now both locations (table + modal) use the same unified display pattern.

---

**Status**: ✅ Complete  
**Date**: January 2025

