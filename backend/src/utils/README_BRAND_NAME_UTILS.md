# Brand Name Utils - Modular Utility Module

## Overview

The `brandNameUtils.js` module provides reusable functions for generating short, readable brand names across the entire application. This utility is designed to work generically for any brand analysis, not just specific hardcoded brands.

## Features

✅ **Modular & Reusable**: Can be used across insights, analytics, reporting, and dashboard modules  
✅ **Generic**: Works for any brand name, not just hardcoded ones  
✅ **Intelligent**: Automatically removes product suffixes and extracts company names  
✅ **Configurable**: Supports custom mappings and options  
✅ **Extensible**: Easy to add new brand abbreviations or patterns

## Usage

### Basic Usage

```javascript
const { getShortBrandName } = require('./utils/brandNameUtils');

// Automatically shortens brand names
getShortBrandName('American Express SmartEarn™ Credit Card');
// Returns: 'Amex'

getShortBrandName('Capital One Spark Cash Plus');
// Returns: 'Capital One'

getShortBrandName('itilite Corporate Card');
// Returns: 'itilite'

// Works for any brand
getShortBrandName('Some Long Company Name Product');
// Returns: 'Some Long Company'
```

### With Custom Options

```javascript
// Custom mappings for specific brands
const customMappings = {
  'My Custom Brand': 'MCB',
  'Another Long Brand Name': 'ALBN'
};

const shortName = getShortBrandName('My Custom Brand Product', {
  customMappings,
  maxLength: 15,
  keepFullIfShort: true
});
```

### Batch Processing

```javascript
const { getShortBrandNames } = require('./utils/brandNameUtils');

const brandNames = [
  'American Express SmartEarn™ Credit Card',
  'Capital One Spark Cash Plus',
  'Chase Ink Business Preferred® Credit Card'
];

const shortNames = getShortBrandNames(brandNames);
// Returns: {
//   'American Express SmartEarn™ Credit Card': 'Amex',
//   'Capital One Spark Cash Plus': 'Capital One',
//   'Chase Ink Business Preferred® Credit Card': 'Chase'
// }
```

## How It Works

1. **Exact Mapping Check**: First checks if there's an exact match in the abbreviation mappings
2. **Product Suffix Removal**: Removes common suffixes like "Credit Card", "Corporate Card", etc.
3. **Partial Match**: Checks if any part of the brand name matches known abbreviations
4. **Intelligent Truncation**: For unknown brands, intelligently truncates while keeping meaningful words

## Extending

### Adding New Brand Abbreviations

Edit `BRAND_ABBREVIATIONS` in `brandNameUtils.js`:

```javascript
const BRAND_ABBREVIATIONS = {
  'American Express': 'Amex',
  'Your New Brand': 'YNB',  // Add your brand here
  // ... existing mappings
};
```

### Adding New Product Suffixes

Edit `PRODUCT_SUFFIXES` in `brandNameUtils.js`:

```javascript
const PRODUCT_SUFFIXES = [
  'Credit Card',
  'Your New Product Type',  // Add new suffix here
  // ... existing suffixes
];
```

### Per-Request Custom Mappings

For dynamic mappings per request:

```javascript
const shortName = getShortBrandName(brandName, {
  customMappings: {
    'Dynamic Brand': 'DB',
    'Another Brand': 'AB'
  }
});
```

## Use Cases

### 1. Insights Generation
```javascript
// In insightsService.js (already implemented)
const userBrandShort = this.getShortBrandName(userBrand.name);
```

### 2. Analytics Reports
```javascript
const { getShortBrandName } = require('./utils/brandNameUtils');

reportData.brands.forEach(brand => {
  brand.shortName = getShortBrandName(brand.fullName);
});
```

### 3. Dashboard Displays
```javascript
const { getShortBrandName } = require('./utils/brandNameUtils');

competitors.map(comp => ({
  ...comp,
  displayName: getShortBrandName(comp.name)
}));
```

### 4. Chart Labels
```javascript
const { getShortBrandNames } = require('./utils/brandNameUtils');

const chartLabels = brandNames.map(name => getShortBrandName(name));
```

## Benefits

1. **No Hardcoding**: Works generically for any brand
2. **Consistency**: Same abbreviation logic across entire app
3. **Maintainability**: Single source of truth for brand name shortening
4. **Flexibility**: Easy to customize per use case
5. **Reusability**: One module, many use cases

## Examples

| Full Brand Name | Short Name | Reason |
|----------------|------------|--------|
| American Express SmartEarn™ Credit Card | Amex | Known abbreviation |
| Capital One Spark Cash Plus | Capital One | Extracted company name |
| itilite Corporate Card | itilite | Removed product suffix |
| Some Unknown Long Company Name Product | Some Unknown Long | Intelligent truncation |
| ShortName | ShortName | Kept as-is (already short) |

## Testing

The utility handles:
- ✅ Brand names with special characters (™, ®, ©)
- ✅ Multiple word company names
- ✅ Product names with suffixes
- ✅ Already short names
- ✅ Unknown/new brands
- ✅ Empty/null values

## Migration Notes

Previously, brand name shortening was hardcoded in `insightsService.js`. This has been refactored to use the modular utility. The `insightsService.js` now imports and uses the utility, maintaining backward compatibility while enabling reuse across the codebase.


