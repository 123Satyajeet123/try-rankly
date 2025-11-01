# Debug Favicon Display Issues

## Issue
Favicons are not showing in the "Brand Mentioned" column.

## Debug Steps Added

### Console Logging
Added extensive console logging to track:
1. **Group Competitors**: What data is available for each group
2. **Individual Competitors**: What data is available for each prompt
3. **Favicon URLs**: Generated URLs for each competitor
4. **Data Structure**: Format of competitor data from backend

### Code Changes
- Added IIFE wrapper around favicon rendering to enable logging
- Logging both group level and prompt level competitor data
- Logging generated favicon URLs before rendering

## Expected Console Output

When the page loads, you should see:
```
🔍 [Brand Mentioned Column] Group: Personalization, Competitors: [...]
🖼️ Favicon for Stripe: https://www.google.com/s2/favicons?domain=stripe.com&sz=16
🖼️ Favicon for Square: https://www.google.com/s2/favicons?domain=square.com&sz=16
```

## Common Issues to Check

### 1. No Competitor Data
**Console shows**: `Competitors: []` or `undefined`
**Cause**: Backend not returning `mentionedCompetitors` field
**Fix**: Check backend response structure

### 2. Wrong Data Format
**Console shows**: `Competitors: ["Stripe", "Square"]` (array of strings)
**Expected**: `[{ name: "Stripe", url: null }, ...]` (array of objects)
**Fix**: Backend needs to return object format

### 3. Favicon URLs Not Generating
**Console shows**: URLs are undefined or empty
**Cause**: `getDynamicFaviconUrl` not working
**Fix**: Check `faviconUtils.ts` implementation

### 4. Images Failing to Load
**Console shows**: URLs are correct but 404 errors
**Cause**: Google favicon API can't find the domain
**Fix**: Check `handleFaviconError` fallback

## Testing Commands

Open browser console and look for:
- `🔍 [Brand Mentioned Column]` logs
- `🖼️ Favicon for` logs
- Any error messages
- Network tab showing favicon requests

## Next Steps
1. Check console logs for actual data structure
2. Verify backend is returning competitor data
3. Test favicon URL generation manually
4. Check browser network tab for failed requests




