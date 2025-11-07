# URL Validation Fixes

## Issue

Invalid URLs like `https://0.0.0.2/`, `https://0.0.0.6/`, and `https://0.0.0.10/` were being accepted as valid citations. These are non-routable IP addresses that should be rejected.

## Fixes Applied

### 1. ✅ Comprehensive IP Address Validation

**Added validation for invalid/non-routable IP ranges:**
- `0.0.0.0/8` - "This network" (non-routable) - **REJECTED**
- `127.0.0.0/8` - Loopback addresses - **REJECTED**
- `169.254.0.0/16` - Link-local addresses - **REJECTED**
- `224.0.0.0/4` - Multicast addresses - **REJECTED**
- `240.0.0.0/4` - Reserved for future use - **REJECTED**
- `255.255.255.255` - Broadcast address - **REJECTED**

**Valid IP ranges:**
- Private IPs (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) - **ACCEPTED** (may be valid in some contexts)
- Public IPs (all other routable IPs) - **ACCEPTED**

### 2. ✅ Enhanced Domain Validation

**Added checks for:**
- Invalid domain formats (localhost, domains with `..`, leading/trailing dots)
- TLD validation (must be at least 2 characters, alphanumeric)
- Proper domain structure (must have at least one dot and valid TLD)

### 3. ✅ Consistent Validation Across Services

**Updated `citationExtractionService.js`:**
- `isValidUrl()` now uses `citationClassificationService.cleanAndValidateUrl()` for consistent validation
- Ensures all citation extraction uses the same validation logic

## Test Results

### Invalid URLs (Rejected):
- ✅ `https://0.0.0.2/` → **INVALID**
- ✅ `https://0.0.0.6/` → **INVALID**
- ✅ `https://0.0.0.10/` → **INVALID**
- ✅ `https://0.0.0.0/` → **INVALID**
- ✅ `https://127.0.0.1/` → **INVALID** (loopback)
- ✅ `https://169.254.1.1/` → **INVALID** (link-local)
- ✅ `https://224.0.0.1/` → **INVALID** (multicast)
- ✅ `https://255.255.255.255/` → **INVALID** (broadcast)

### Valid URLs (Accepted):
- ✅ `https://example.com` → **VALID**
- ✅ `https://facebook.com` → **VALID**
- ✅ `https://192.168.1.1/` → **VALID** (private IP, may be valid in some contexts)
- ✅ `https://8.8.8.8/` → **VALID** (public IP)

## Impact

### Before:
- Invalid URLs like `0.0.0.2`, `0.0.0.6`, `0.0.0.10` were being classified as citations
- These appeared in citation counts and citation share calculations
- Led to incorrect metrics

### After:
- Invalid URLs are rejected during validation
- Only valid, routable URLs are classified as citations
- Citation counts and citation share are more accurate

## Files Modified

1. **`backend/src/services/citationClassificationService.js`**
   - Enhanced `cleanAndValidateUrl()` method (lines 39-111)
   - Added comprehensive IP address validation
   - Added domain format validation
   - Updated fallback extraction to validate IPs

2. **`backend/src/services/citationExtractionService.js`**
   - Updated `isValidUrl()` to use citation classification service (line 340-344)
   - Ensures consistent validation across all citation extraction

## Next Steps

1. ✅ Validation fixes applied and tested
2. ⚠️ **Reprocess existing data** - Consider running a script to remove invalid URLs from existing prompt tests
3. ✅ Monitor logs - Invalid URLs will now be rejected during extraction


