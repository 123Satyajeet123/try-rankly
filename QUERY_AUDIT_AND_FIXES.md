# Query Pattern Audit & Fixes

## Issues Found & Fixed

### 1. Missing urlAnalysisId Filtering ✅ FIXED
- **citations.js**: Debug endpoints - Added urlAnalysisId query parameter support
- **citations.js**: `/prompt-ids` and `/:brandName/:type` - Now accept urlAnalysisId parameter
- **onboarding.js**: `/latest-analysis` - Now filters competitors/topics/personas by urlAnalysisId

### 2. Security Issues (Missing userId) ✅ FIXED
- **subjectiveMetrics.js**: Added userId filter when checking existing metrics

### 3. Incorrect Query Syntax ✅ FIXED
- **metrics.js**: Fixed `findOne().sort()` → `find().sort().limit(1)`
- **citations.js**: Fixed `findOne().sort()` → `find().sort().limit(1)`
- **analytics.js**: Fixed `findOne().sort()` → `find().sort().limit(1)`
- **urlAnalysis.js**: Fixed `findOne().sort()` → `find().sort().limit(1)`
- **dashboardMetrics.js**: Fixed `findOne().sort()` → `find().sort().limit(1)`
- **prompts.js**: Fixed multiple `findOne().sort()` → `find().sort().limit(1)`

### 4. Standard Query Patterns ✅ APPLIED
- All queries now use standard pattern: `find().sort().limit(1)` for single results
- urlAnalysisId filtering added where appropriate
- userId filtering consistently applied for security

## Summary
All non-standard query patterns have been fixed. All APIs now properly filter by urlAnalysisId when provided, and use correct MongoDB query syntax.

