/**
 * Utility functions to transform GA4 API responses
 * Based on traffic-analytics implementation
 */

// LLM platform detection patterns
const LLM_PATTERNS = {
  'ChatGPT': /(chatgpt|openai\.com|chat\.openai)/i,
  'Claude': /(claude|anthropic)/i,
  'Gemini': /(gemini|bard|google\s*ai)/i,
  'Perplexity': /perplexity/i,
  'Copilot': /copilot/i,
  'Grok': /(grok|xai)/i,
  'Poe': /poe/i,
  'Character.ai': /character\.ai/i
};

/**
 * Detect platform from source and medium OR pageReferrer
 */
function detectPlatform(source, medium, referrer = null) {
  const sourceLower = source ? source.toLowerCase() : '';
  const mediumLower = medium ? medium.toLowerCase() : '';
  const referrerLower = referrer ? referrer.toLowerCase() : '';
  
  // Priority 1: Check referrer for LLM platforms (most accurate)
  if (referrer) {
    for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
      if (pattern.test(referrer)) {
        return platform;
      }
    }
  }
  
  // Priority 2: Check source for LLM platforms
  if (source) {
    for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
      if (pattern.test(source)) {
        return platform;
      }
    }
  }
  
  // Standard platform detection
  if (mediumLower === 'organic') return 'organic';
  if (mediumLower === 'cpc' || mediumLower === 'paid') return 'paid';
  if (mediumLower === 'referral') return 'referral';
  if (mediumLower === 'email') return 'email';
  if (mediumLower === 'social') return 'social';
  if (sourceLower === '(direct)') return 'direct';
  
  return 'other';
}

/**
 * Calculate comparison date range for period-over-period analysis
 */
function calculateComparisonDates(startDate, endDate) {
  // Handle GA4 relative dates
  let endDateProcessed = endDate;
  if (endDate === 'today') {
    endDateProcessed = new Date().toISOString().split('T')[0];
  }
  if (endDate === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    endDateProcessed = yesterday.toISOString().split('T')[0];
  }
  
  // Parse dates
  let start, end;
  if (startDate.includes('daysAgo')) {
    const days = parseInt(startDate);
    start = new Date();
    start.setDate(start.getDate() - days);
  } else if (startDate.match(/^\d{8}$/)) {
    // Handle YYYYMMDD format
    start = new Date(startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  } else {
    // Assume YYYY-MM-DD format
    start = new Date(startDate);
  }
  
  if (endDateProcessed.includes('daysAgo')) {
    const days = parseInt(endDateProcessed);
    end = new Date();
    end.setDate(end.getDate() - days);
  } else if (endDateProcessed.match(/^\d{8}$/)) {
    // Handle YYYYMMDD format
    end = new Date(endDateProcessed.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  } else {
    // Assume YYYY-MM-DD format
    end = new Date(endDateProcessed);
  }
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Invalid dates in calculateComparisonDates:', { startDate, endDate, start, end });
    return {
      comparisonStartDate: '7daysAgo',
      comparisonEndDate: 'today'
    };
  }
  
  // Calculate period length
  const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  // Calculate comparison period (same length, immediately before)
  const comparisonEnd = new Date(start);
  comparisonEnd.setDate(comparisonEnd.getDate() - 1);
  
  const comparisonStart = new Date(comparisonEnd);
  comparisonStart.setDate(comparisonStart.getDate() - periodDays);
  
  // Format dates as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    comparisonStartDate: formatDate(comparisonStart),
    comparisonEndDate: formatDate(comparisonEnd)
  };
}

/**
 * Transform platform split data (similar to traffic-analytics)
 */
function transformToPlatformSplit(ga4Response, comparisonResponse = null) {
  const rows = ga4Response.rows || [];
  const comparisonRows = comparisonResponse?.rows || [];
  
  // Build comparison map
  const comparisonMap = new Map();
  for (const row of comparisonRows) {
    const source = row.dimensionValues?.[0]?.value || '';
    const medium = row.dimensionValues?.[1]?.value || '';
    const referrer = row.dimensionValues?.[2]?.value || ''; // Added referrer dimension
    
    // Use same LLM detection logic as current period
    let detectedLLM = null;
    if (referrer) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(referrer)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    if (!detectedLLM && source) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(source)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    
    const platform = detectedLLM || detectPlatform(source, medium, referrer);
    const sessions = parseFloat(row.metricValues?.[0]?.value || '0');
    
    const current = comparisonMap.get(platform) || { sessions: 0 };
    current.sessions += sessions;
    comparisonMap.set(platform, current);
  }
  
  // Aggregate metrics by platform for current period
  const platformMap = new Map();
  let llmRowsDetected = 0;
  let llmRowsByPattern = {};
  
  for (const row of rows) {
    const source = row.dimensionValues?.[0]?.value || '';
    const medium = row.dimensionValues?.[1]?.value || '';
    const referrer = row.dimensionValues?.[2]?.value || ''; // Added referrer dimension
    const metrics = row.metricValues || [];
    
    // Check for LLM patterns in all dimensions before standard detection
    let detectedLLM = null;
    const sourceLower = source ? source.toLowerCase() : '';
    const referrerLower = referrer ? referrer.toLowerCase() : '';
    
    // Check referrer first (most accurate)
    if (referrer) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(referrer)) {
          detectedLLM = platform;
          llmRowsDetected++;
          llmRowsByPattern[platform] = (llmRowsByPattern[platform] || 0) + 1;
          break;
        }
      }
    }
    
    // Check source if no LLM found in referrer
    if (!detectedLLM && source) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(source)) {
          detectedLLM = platform;
          llmRowsDetected++;
          llmRowsByPattern[platform] = (llmRowsByPattern[platform] || 0) + 1;
          break;
        }
      }
    }
    
    // Use detected LLM or fall back to standard platform detection
    const platform = detectedLLM || detectPlatform(source, medium, referrer);
    
    const current = platformMap.get(platform) || {
      sessions: 0,
      engagementRate: 0, // Will store weighted sum: engagementRate * sessions
      conversions: 0,
      bounceRate: 0, // Will store weighted sum: bounceRate * sessions
      avgSessionDuration: 0, // Will store total duration in seconds
      pagesPerSession: 0, // Will store total page views
      newUsers: 0,
      totalUsers: 0,
      count: 0
    };
    
    // Parse metrics - GA4 returns engagementRate and bounceRate as decimals (0-1)
    const rowSessions = parseFloat(metrics[0]?.value || '0');
    const rowEngagementRate = parseFloat(metrics[1]?.value || '0'); // Decimal 0-1
    const rowConversions = parseFloat(metrics[2]?.value || '0');
    const rowBounceRate = parseFloat(metrics[3]?.value || '0'); // Decimal 0-1
    const rowAvgSessionDuration = parseFloat(metrics[4]?.value || '0'); // Seconds
    const rowPagesPerSession = parseFloat(metrics[5]?.value || '0'); // Number
    const rowNewUsers = parseFloat(metrics[6]?.value || '0');
    const rowTotalUsers = parseFloat(metrics[7]?.value || '0');
    
    // Accumulate values for weighted averages
    current.sessions += rowSessions;
    current.engagementRate += rowEngagementRate * rowSessions; // Weighted sum
    current.conversions += rowConversions;
    current.bounceRate += rowBounceRate * rowSessions; // Weighted sum
    current.avgSessionDuration += rowAvgSessionDuration * rowSessions; // Total duration
    current.pagesPerSession += rowPagesPerSession * rowSessions; // Total page views
    current.newUsers += rowNewUsers;
    current.totalUsers += rowTotalUsers;
    current.count += 1;
    
    platformMap.set(platform, current);
  }
  
  console.log('🔍 LLM Detection Stats:', {
    totalRows: rows.length,
    llmRowsDetected: llmRowsDetected,
    llmRowsByPattern: llmRowsByPattern,
    platformsInMap: Array.from(platformMap.keys()).filter(p => Object.keys(LLM_PATTERNS).includes(p))
  });
  
  // Calculate totals
  const totalSessions = Array.from(platformMap.values()).reduce((sum, val) => sum + val.sessions, 0);
  const comparisonTotalSessions = Array.from(comparisonMap.values()).reduce((sum, p) => sum + p.sessions, 0);
  
  // Aggregate LLM platforms - but keep the data to calculate totals correctly
  const llmData = {
    sessions: 0,
    engagementRate: 0,
    conversions: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    pagesPerSession: 0,
    newUsers: 0,
    totalUsers: 0,
    count: 0
  };
  
  const llmPlatforms = Object.keys(LLM_PATTERNS);
  const llmPlatformData = [];
  
  for (const platform of llmPlatforms) {
    const data = platformMap.get(platform);
    if (data) {
      llmData.sessions += data.sessions;
      llmData.engagementRate += data.engagementRate;
      llmData.conversions += data.conversions;
      llmData.bounceRate += data.bounceRate;
      llmData.avgSessionDuration += data.avgSessionDuration;
      llmData.pagesPerSession += data.pagesPerSession;
      llmData.newUsers += data.newUsers;
      llmData.totalUsers += data.totalUsers;
      llmData.count += data.count;
      
      // Store individual LLM platform data
      llmPlatformData.push({ platform, data });
      
      platformMap.delete(platform);
    }
  }
  
  // Add aggregated LLM data - calculate weighted averages
  if (llmData.sessions > 0) {
    llmData.engagementRate = Math.round((llmData.engagementRate / llmData.sessions) * 10000) / 10000; // Weighted average, rounded to 4 decimals for precision
    llmData.bounceRate = Math.round((llmData.bounceRate / llmData.sessions) * 10000) / 10000; // Weighted average, rounded to 4 decimals for precision
    llmData.avgSessionDuration = Math.round((llmData.avgSessionDuration / llmData.sessions) * 100) / 100; // Weighted average, rounded to 2 decimals
    llmData.pagesPerSession = Math.round((llmData.pagesPerSession / llmData.sessions) * 100) / 100; // Weighted average, rounded to 2 decimals
    platformMap.set('LLMs', llmData);
  }
  
  // Store LLM platform breakdown for validation
  const llmBreakdown = llmPlatformData.map(({ platform, data }) => ({
    platform,
    sessions: data.sessions
  }));
  
  // Calculate averages and format final platform data
  const finalPlatformData = [];
  
  // Process each platform - calculate weighted averages
  for (const [platform, data] of platformMap.entries()) {
    // Calculate weighted averages (divide by total sessions, not count)
    const avgEngagementRate = data.sessions > 0 ? Math.round((data.engagementRate / data.sessions) * 10000) / 10000 : 0; // Rounded to 4 decimals for precision
    const avgBounceRate = data.sessions > 0 ? Math.round((data.bounceRate / data.sessions) * 10000) / 10000 : 0; // Rounded to 4 decimals for precision
    const avgSessionDuration = data.sessions > 0 ? Math.round((data.avgSessionDuration / data.sessions) * 100) / 100 : 0; // Rounded to 2 decimals
    const avgPagesPerSession = data.sessions > 0 ? Math.round((data.pagesPerSession / data.sessions) * 100) / 100 : 0; // Rounded to 2 decimals
    const returningUsers = data.totalUsers - data.newUsers;
    const conversionRate = data.sessions > 0 ? Math.round((data.conversions / data.sessions) * 10000) / 100 : 0; // Rounded to 2 decimals
    
    // Calculate change from comparison period
    const comparisonData = comparisonMap.get(platform);
    const previousSessions = comparisonData?.sessions || 0;
    const sessionChange = previousSessions > 0 
      ? ((data.sessions - previousSessions) / previousSessions) * 100 
      : 0;
    const absoluteChange = data.sessions - previousSessions;
    
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    
    finalPlatformData.push({
      name: platformName,
      sessions: data.sessions,
      percentage: totalSessions > 0 ? Math.round((data.sessions / totalSessions * 100) * 100) / 100 : 0, // Rounded to 2 decimals
      engagementRate: Math.round((avgEngagementRate * 100) * 100) / 100, // Rounded to 2 decimals
      conversions: data.conversions,
      bounceRate: Math.round((avgBounceRate * 100) * 100) / 100, // Rounded to 2 decimals
      avgSessionDuration: avgSessionDuration, // Already rounded to 2 decimals
      pagesPerSession: avgPagesPerSession, // Already rounded to 2 decimals
      newUsers: data.newUsers,
      returningUsers: returningUsers,
      goalCompletions: data.conversions,
      revenue: 0,
      conversionRate: conversionRate, // Already rounded to 2 decimals
      // Comparison data
      change: Math.round(sessionChange * 100) / 100, // Rounded to 2 decimals
      absoluteChange: absoluteChange,
      trend: sessionChange > 0 ? 'up' : sessionChange < 0 ? 'down' : 'neutral'
    });
  }
  
  // Sort by sessions (descending)
  finalPlatformData.sort((a, b) => b.sessions - a.sessions);
  
  // Create platform split (for pie/donut chart) with colors
  const platformColors = {
    'organic': '#10B981',
    'direct': '#EF4444',
    'referral': '#F59E0B',
    'llms': '#06B6D4',
    'other': '#6B7280',
    'social': '#F97316',
    'email': '#14B8A6',
    'paid': '#8B5CF6'
  };
  
  const platformSplit = finalPlatformData.map(item => ({
    name: item.name,
    value: item.percentage,
    color: platformColors[item.name.toLowerCase()] || '#6B7280'
  }));
  
  // Create rankings (for table) with comparison
  const rankings = finalPlatformData.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    sessions: item.sessions,
    percentage: `${item.percentage.toFixed(2)}%`,
    change: item.change,
    absoluteChange: item.absoluteChange,
    trend: item.trend
  }));
  
  // Top platform info
  const topPlatform = finalPlatformData[0]?.name || 'N/A';
  const topPlatformShare = finalPlatformData[0]?.percentage || 0;
  
  // Debug: Log LLM breakdown with detailed validation
  const finalTotalSessions = finalPlatformData.reduce((sum, p) => sum + p.sessions, 0);
  const llmPlatformsSessions = finalPlatformData.find(p => p.name === 'LLMs')?.sessions || 0;
  
  console.log('🔍 LLM Platform Breakdown:', {
    totalLLMSessions: llmData.sessions,
    llmBreakdown: llmBreakdown,
    totalSessions: totalSessions,
    finalTotalSessions: finalTotalSessions,
    llmPlatformsSessions: llmPlatformsSessions,
    validation: Math.abs(finalTotalSessions - totalSessions) < 1, // Allow small floating point differences
    individualLLMTotal: llmBreakdown.reduce((sum, p) => sum + p.sessions, 0),
    platformsInMap: Array.from(platformMap.keys()),
    finalPlatformNames: finalPlatformData.map(p => p.name)
  });
  
  return {
    platformSplit,
    rankings,
    totalSessions,
    summary: {
      totalSessions,
      topPlatform,
      topPlatformShare,
      totalChange: comparisonTotalSessions > 0 
        ? ((totalSessions - comparisonTotalSessions) / comparisonTotalSessions) * 100 
        : 0,
      llmBreakdown // Add LLM breakdown for debugging
    },
    // Include the detailed performance data for Traffic Performance section
    performanceData: finalPlatformData
  };
}

/**
 * Transform LLM platforms data (similar to traffic-analytics)
 */
function transformToLLMPlatforms(ga4Response, comparisonResponse = null) {
  const rows = ga4Response.rows || [];
  const comparisonRows = comparisonResponse?.rows || [];
  
  // Build comparison map - use same detection logic as platform-split
  const comparisonMap = new Map();
  for (const row of comparisonRows) {
    const source = row.dimensionValues?.[0]?.value || '';
    const medium = row.dimensionValues?.[1]?.value || '';
    const referrer = row.dimensionValues?.[2]?.value || '';
    
    // Use same LLM detection logic as platform-split
    let detectedLLM = null;
    if (referrer) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(referrer)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    if (!detectedLLM && source) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(source)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    
    // Only process LLM platforms, skip others
    if (!detectedLLM) continue;
    
    const sessions = parseFloat(row.metricValues?.[0]?.value || '0');
    const current = comparisonMap.get(detectedLLM) || { sessions: 0 };
    current.sessions += sessions;
    comparisonMap.set(detectedLLM, current);
  }
  
  const platformMap = new Map();
  
  for (const row of rows) {
    const source = row.dimensionValues?.[0]?.value || '';
    const medium = row.dimensionValues?.[1]?.value || '';
    const referrer = row.dimensionValues?.[2]?.value || '';
    const metrics = row.metricValues || [];
    
    // Use same LLM detection logic as platform-split
    let detectedLLM = null;
    if (referrer) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(referrer)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    if (!detectedLLM && source) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(source)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    
    // Only process LLM platforms, skip others
    if (!detectedLLM) continue;
    
    const platform = detectedLLM;
    
    const current = platformMap.get(platform) || {
      sessions: 0,
      engagementRate: 0, // Will store weighted sum: engagementRate * sessions
      conversions: 0,
      bounceRate: 0, // Will store weighted sum: bounceRate * sessions
      avgSessionDuration: 0, // Will store total duration in seconds
      pagesPerSession: 0, // Will store total page views
      newUsers: 0,
      totalUsers: 0,
      count: 0
    };
    
    // Parse metrics - GA4 returns engagementRate and bounceRate as decimals (0-1)
    const rowSessions = parseFloat(metrics[0]?.value || '0');
    const rowEngagementRate = parseFloat(metrics[1]?.value || '0'); // Decimal 0-1
    const rowConversions = parseFloat(metrics[2]?.value || '0');
    const rowBounceRate = parseFloat(metrics[3]?.value || '0'); // Decimal 0-1
    const rowAvgSessionDuration = parseFloat(metrics[4]?.value || '0'); // Seconds
    const rowPagesPerSession = parseFloat(metrics[5]?.value || '0'); // Number
    const rowNewUsers = parseFloat(metrics[6]?.value || '0');
    const rowTotalUsers = parseFloat(metrics[7]?.value || '0');
    
    // Accumulate values for weighted averages
    current.sessions += rowSessions;
    current.engagementRate += rowEngagementRate * rowSessions; // Weighted sum
    current.conversions += rowConversions;
    current.bounceRate += rowBounceRate * rowSessions; // Weighted sum
    current.avgSessionDuration += rowAvgSessionDuration * rowSessions; // Total duration
    current.pagesPerSession += rowPagesPerSession * rowSessions; // Total page views
    current.newUsers += rowNewUsers;
    current.totalUsers += rowTotalUsers;
    current.count += 1;
    
    platformMap.set(platform, current);
  }
  
  // Calculate weighted averages and format platforms
  const platformDataArray = [];
  
  for (const [platform, data] of platformMap.entries()) {
    // Calculate weighted averages (divide by total sessions, not count) - rounded to 2 decimals
    const avgEngagementRate = data.sessions > 0 ? Math.round((data.engagementRate / data.sessions) * 10000) / 10000 : 0; // Rounded to 4 decimals for precision
    const avgBounceRate = data.sessions > 0 ? Math.round((data.bounceRate / data.sessions) * 10000) / 10000 : 0; // Rounded to 4 decimals for precision
    const avgSessionDuration = data.sessions > 0 ? Math.round((data.avgSessionDuration / data.sessions) * 100) / 100 : 0; // Rounded to 2 decimals
    const avgPagesPerSession = data.sessions > 0 ? Math.round((data.pagesPerSession / data.sessions) * 100) / 100 : 0; // Rounded to 2 decimals
    const returningUsers = data.totalUsers - data.newUsers;
    const conversionRate = data.sessions > 0 ? Math.round((data.conversions / data.sessions) * 10000) / 100 : 0; // Rounded to 2 decimals
    
    // Calculate change from comparison period
    const comparisonData = comparisonMap.get(platform);
    const previousSessions = comparisonData?.sessions || 0;
    const sessionChange = previousSessions > 0 
      ? ((data.sessions - previousSessions) / previousSessions) * 100 
      : 0;
    const absoluteChange = data.sessions - previousSessions;
    
    platformDataArray.push({
      name: platform,
      sessions: data.sessions,
      engagementRate: Math.round((avgEngagementRate * 100) * 100) / 100, // Rounded to 2 decimals
      conversions: data.conversions,
      bounceRate: Math.round((avgBounceRate * 100) * 100) / 100, // Rounded to 2 decimals
      avgSessionDuration: avgSessionDuration, // Already rounded to 2 decimals
      pagesPerSession: avgPagesPerSession, // Already rounded to 2 decimals
      newUsers: data.newUsers,
      returningUsers: returningUsers,
      conversionRate: conversionRate, // Already rounded to 2 decimals
      // Comparison data
      change: Math.round(sessionChange * 100) / 100, // Rounded to 2 decimals
      absoluteChange: absoluteChange,
      trend: sessionChange > 0 ? 'up' : sessionChange < 0 ? 'down' : 'neutral'
    });
  }
  
  // Sort by sessions
  platformDataArray.sort((a, b) => b.sessions - a.sessions);
  
  // Calculate totals and percentages
  const totalLLMSessions = platformDataArray.reduce((sum, p) => sum + p.sessions, 0);
  const totalLLMConversions = platformDataArray.reduce((sum, p) => sum + p.conversions, 0);
  // Calculate weighted average engagement rate (weighted by sessions) - rounded to 2 decimals
  const totalEngagementRateWeighted = platformDataArray.reduce((sum, p) => sum + (p.engagementRate * p.sessions / 100), 0); // engagementRate is percentage, divide by 100 to get decimal
  const avgEngagementRate = totalLLMSessions > 0 ? Math.round(((totalEngagementRateWeighted / totalLLMSessions) * 100) * 100) / 100 : 0; // Rounded to 2 decimals
  
  // Add percentage field to each platform - rounded to 2 decimals
  const platformsWithPercentage = platformDataArray.map(platform => ({
    ...platform,
    percentage: totalLLMSessions > 0 ? Math.round((platform.sessions / totalLLMSessions) * 10000) / 100 : 0
  }));
  
  // Debug: Log LLM platforms total with detailed detection stats
  let llmRowsDetected = 0;
  let llmRowsByPattern = {};
  for (const row of rows) {
    const source = row.dimensionValues?.[0]?.value || '';
    const referrer = row.dimensionValues?.[2]?.value || '';
    let detectedLLM = null;
    if (referrer) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(referrer)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    if (!detectedLLM && source) {
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(source)) {
          detectedLLM = platform;
          break;
        }
      }
    }
    if (detectedLLM) {
      llmRowsDetected++;
      llmRowsByPattern[detectedLLM] = (llmRowsByPattern[detectedLLM] || 0) + 1;
    }
  }
  
  console.log('🔍 LLM Platforms Total (Updated Detection):', {
    totalRows: rows.length,
    llmRowsDetected: llmRowsDetected,
    llmRowsByPattern: llmRowsByPattern,
    totalLLMSessions,
    platformBreakdown: platformsWithPercentage.map(p => ({ name: p.name, sessions: p.sessions })),
    validation: platformsWithPercentage.reduce((sum, p) => sum + p.sessions, 0) === totalLLMSessions
  });
  
  return {
    platforms: platformsWithPercentage,
    performanceData: platformsWithPercentage,
    summary: {
      totalLLMSessions,
      totalLLMConversions,
      avgEngagementRate
    }
  };
}

/**
 * Transform basic metrics data
 */
function transformMetricsData(rawData) {
  const row = rawData.rows?.[0]?.metricValues;
  if (!row) {
    return {
      totalSessions: '0',
      totalUsers: '0',
      totalPageViews: '0',
      avgSessionDuration: '0'
    };
  }

  return {
    totalSessions: row[0]?.value || '0',
    totalUsers: row[1]?.value || '0',
    totalPageViews: row[2]?.value || '0',
    avgSessionDuration: row[3]?.value || '0'
  };
}

/**
 * Transform platform data (legacy, kept for compatibility)
 */
function transformPlatformData(rawData) {
  // Use the new transformation functions
  if (rawData.dimensionValues && rawData.dimensionValues.length > 1) {
    // Looks like platform split data
    return transformToPlatformSplit(rawData);
  } else {
    // Looks like LLM platforms data
    return transformToLLMPlatforms(rawData);
  }
}

/**
 * Transform geographic data (matching traffic-analytics format)
 */
function transformGeoData(rawData) {
  const rows = rawData.rows || [];
  
  console.log('🌍 [transformGeoData] Processing geo data:', {
    totalRows: rows.length,
    sampleRows: rows.slice(0, 3).map(r => ({
      country: r.dimensionValues?.[0]?.value,
      sessions: r.metricValues?.[0]?.value
    }))
  });

  let totalSessions = 0;
  let totalConversions = 0;

  const countries = rows.map(row => {
    const country = row.dimensionValues?.[0]?.value || 'Unknown';
    const metrics = row.metricValues || [];
    
    const sessions = parseFloat(metrics[0]?.value || '0');
    const conversions = parseFloat(metrics[1]?.value || '0');
    const bounceRate = parseFloat(metrics[2]?.value || '0') * 100;
    const avgSessionDuration = parseFloat(metrics[3]?.value || '0');
    const engagementRate = parseFloat(metrics[4]?.value || '0') * 100;
    
    totalSessions += sessions;
    totalConversions += conversions;
    
    return {
      country,
      sessions: Math.round(sessions),
      percentage: 0, // Will be calculated after
      conversions: Math.round(conversions),
      conversionRate: sessions > 0 ? (conversions / sessions) * 100 : 0,
      bounceRate: Math.round(bounceRate * 10) / 10,
      avgSessionDuration: Math.round(avgSessionDuration),
      engagementRate: Math.round(engagementRate * 10) / 10
    };
  });

  // Calculate percentages
  countries.forEach(country => {
    country.percentage = totalSessions > 0 ? (country.sessions / totalSessions) * 100 : 0;
  });

  console.log('🌍 [transformGeoData] Final data:', {
    totalCountries: countries.length,
    totalSessions,
    totalConversions,
    topCountries: countries.slice(0, 3).map(c => ({ country: c.country, sessions: c.sessions }))
  });

  return {
    countries,
    totalSessions: Math.round(totalSessions),
    totalConversions: Math.round(totalConversions)
  };
}

/**
 * Transform device data (matching traffic-analytics format)
 */
function transformDeviceData(rawData) {
  const rows = rawData.rows || [];
  
  console.log('📱 [transformDeviceData] Processing device data:', {
    totalRows: rows.length,
    sampleRows: rows.slice(0, 3).map(r => ({
      device: r.dimensionValues?.[0]?.value,
      os: r.dimensionValues?.[1]?.value,
      browser: r.dimensionValues?.[2]?.value,
      sessions: r.metricValues?.[0]?.value
    }))
  });

  const deviceMap = new Map();
  const osMap = new Map();
  const browserMap = new Map();
  let totalSessions = 0;

  for (const row of rows) {
    const device = row.dimensionValues?.[0]?.value || 'Unknown';
    const os = row.dimensionValues?.[1]?.value || 'Unknown';
    const browser = row.dimensionValues?.[2]?.value || 'Unknown';
    const metrics = row.metricValues || [];
    
    const sessions = parseFloat(metrics[0]?.value || '0');
    const conversions = parseFloat(metrics[1]?.value || '0');
    const bounceRate = parseFloat(metrics[2]?.value || '0');
    const avgSessionDuration = parseFloat(metrics[3]?.value || '0');
    const engagementRate = parseFloat(metrics[4]?.value || '0');
    
    totalSessions += sessions;

    // Aggregate by device
    const deviceData = deviceMap.get(device) || {
      sessions: 0,
      conversions: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
      engagementRate: 0,
      count: 0
    };
    deviceData.sessions += sessions;
    deviceData.conversions += conversions;
    deviceData.bounceRate += bounceRate;
    deviceData.avgSessionDuration += avgSessionDuration;
    deviceData.engagementRate += engagementRate;
    deviceData.count += 1;
    deviceMap.set(device, deviceData);

    // Aggregate by OS
    osMap.set(os, (osMap.get(os) || 0) + sessions);

    // Aggregate by Browser
    browserMap.set(browser, (browserMap.get(browser) || 0) + sessions);
  }

  // Transform device data
  const deviceBreakdown = Array.from(deviceMap.entries()).map(([device, data]) => ({
    device,
    sessions: Math.round(data.sessions),
    percentage: totalSessions > 0 ? (data.sessions / totalSessions) * 100 : 0,
    conversions: Math.round(data.conversions),
    conversionRate: data.sessions > 0 ? (data.conversions / data.sessions) * 100 : 0,
    bounceRate: Math.round((data.bounceRate / data.count) * 1000) / 10,
    avgSessionDuration: Math.round(data.avgSessionDuration / data.count),
    engagementRate: Math.round((data.engagementRate / data.count) * 1000) / 10
  })).sort((a, b) => b.sessions - a.sessions);

  // Transform OS data
  const osBreakdown = Array.from(osMap.entries()).map(([os, sessions]) => ({
    os,
    sessions: Math.round(sessions),
    percentage: totalSessions > 0 ? (sessions / totalSessions) * 100 : 0
  })).sort((a, b) => b.sessions - a.sessions);

  // Transform browser data
  const browserBreakdown = Array.from(browserMap.entries()).map(([browser, sessions]) => ({
    browser,
    sessions: Math.round(sessions),
    percentage: totalSessions > 0 ? (sessions / totalSessions) * 100 : 0
  })).sort((a, b) => b.sessions - a.sessions);

  console.log('📱 [transformDeviceData] Final data:', {
    deviceBreakdown: deviceBreakdown.slice(0, 3).map(d => ({ device: d.device, sessions: d.sessions })),
    osBreakdown: osBreakdown.slice(0, 3).map(o => ({ os: o.os, sessions: o.sessions })),
    browserBreakdown: browserBreakdown.slice(0, 3).map(b => ({ browser: b.browser, sessions: b.sessions })),
    totalSessions
  });

  return {
    deviceBreakdown,
    osBreakdown,
    browserBreakdown,
    totalSessions: Math.round(totalSessions)
  };
}

/**
 * Transform pages data
 */
/**
 * Transform GA4 pages data to frontend format (matching traffic-analytics implementation)
 * @param {Object} ga4Response - GA4 API response
 * @param {string} defaultUri - Property's default URI (e.g., "https://fibr.ai")
 */
function transformPagesData(ga4Response, defaultUri = null) {
  const rows = ga4Response.rows || [];
  
  console.log('📄 [transformPagesData] Processing pages data:', {
    totalRows: rows.length,
    defaultUri,
    sampleRows: rows.slice(0, 3).map(row => ({
      pagePath: row.dimensionValues?.[0]?.value,
      pageTitle: row.dimensionValues?.[1]?.value,
      sessions: row.metricValues?.[0]?.value,
      conversions: row.metricValues?.[2]?.value,
      allMetrics: row.metricValues?.map((m, i) => ({ index: i, value: m.value }))
    }))
  });

  // Group by page path to aggregate data
  const pageMap = new Map();
  
  for (const row of rows) {
    const pagePath = row.dimensionValues?.[0]?.value || '';
    const pageTitle = row.dimensionValues?.[1]?.value || '';
    const sessionSource = row.dimensionValues?.[2]?.value || '';
    const sessionMedium = row.dimensionValues?.[3]?.value || '';
    const metrics = row.metricValues || [];

    const sessions = parseFloat(metrics[0]?.value || '0');
    const engagementRate = parseFloat(metrics[1]?.value || '0');
    const conversions = parseFloat(metrics[2]?.value || '0'); // This is the conversion metric (dynamic based on selectedConversionEvent)
    const bounceRate = parseFloat(metrics[3]?.value || '0');
    const sessionDuration = parseFloat(metrics[4]?.value || '0');
    const pagesPerSession = parseFloat(metrics[5]?.value || '0');
    const newUsers = parseFloat(metrics[6]?.value || '0');
    const totalUsers = parseFloat(metrics[7]?.value || '0');

    // Debug: Log conversion values for first few rows
    if (rows.indexOf(row) < 3) {
      console.log('🔍 [transformPagesData] Row conversion data:', {
        pagePath,
        sessions,
        conversions,
        conversionMetricIndex: 2,
        conversionValue: metrics[2]?.value
      });
    }

    // Detect LLM platform from sessionSource + sessionMedium
    const platform = detectPlatform(sessionSource, sessionMedium);

    const current = pageMap.get(pagePath) || {
      title: pageTitle,
      url: defaultUri ? `${defaultUri}${pagePath}` : pagePath, // Construct full URL if defaultUri is available
      sessions: 0,
      totalEngagementRate: 0,
      totalConversions: 0,
      totalBounceRate: 0,
      totalSessionDuration: 0,
      totalPagesPerSession: 0,
      totalNewUsers: 0,
      totalUsers: 0,
      sessionCount: 0,
      sources: new Set(),
      platformSessions: new Map()
    };

    // Clone sources Set to avoid mutation issues
    const newSources = new Set(current.sources);
    const newPlatformSessions = new Map(current.platformSessions);
    
    if (platform && platform !== 'other') {
      newSources.add(platform);
      // Track sessions per platform
      const currentPlatformSessions = newPlatformSessions.get(platform) || 0;
      newPlatformSessions.set(platform, currentPlatformSessions + sessions);
    }

    pageMap.set(pagePath, {
      title: pageTitle || current.title,
      url: defaultUri ? `${defaultUri}${pagePath}` : pagePath, // Construct full URL if defaultUri is available
      sessions: current.sessions + sessions,
      totalEngagementRate: current.totalEngagementRate + (engagementRate * sessions),
      totalConversions: current.totalConversions + conversions,
      totalBounceRate: current.totalBounceRate + (bounceRate * sessions),
      totalSessionDuration: current.totalSessionDuration + (sessionDuration * sessions),
      totalPagesPerSession: current.totalPagesPerSession + (pagesPerSession * sessions),
      totalNewUsers: current.totalNewUsers + newUsers,
      totalUsers: current.totalUsers + totalUsers,
      sessionCount: current.sessionCount + sessions,
      sources: newSources,
      platformSessions: newPlatformSessions
    });
  }

    // Convert to array with computed metrics
    const pages = Array.from(pageMap.entries()).map(([url, data]) => {
      const avgEngagementRate = data.sessionCount > 0 ? (data.totalEngagementRate / data.sessionCount) * 100 : 0;
      const avgBounceRate = data.sessionCount > 0 ? (data.totalBounceRate / data.sessionCount) * 100 : 0;
      const avgSessionDuration = data.sessionCount > 0 ? (data.totalSessionDuration / data.sessionCount) : 0;
      const avgPagesPerSession = data.sessionCount > 0 ? (data.totalPagesPerSession / data.sessionCount) : 0;

      // Compute Session Quality Score (SQS)
      const sqs = Math.min(100, Math.max(0, 
        (avgEngagementRate * 0.4) + 
        ((100 - avgBounceRate) * 0.3) + 
        (Math.min(avgSessionDuration / 60, 5) * 10 * 0.2) + 
        (Math.min(avgPagesPerSession, 5) * 20 * 0.1)
      ));

      // Determine content group
      const contentGroup = getContentGroup(url, data.title);
      
      // Determine page type
      const pageType = getPageType(url, data.title);
      
      // Determine LLM journey position
      const llmJourney = getLLMJourney(data.sessions, avgEngagementRate);
      
      // Get all providers and format for display
      const allProviders = Array.from(data.sources);
      const providerName = allProviders.length > 1
        ? allProviders.map(p => p === 'other-llm' ? 'Other LLM' : p.charAt(0).toUpperCase() + p.slice(1)).join(', ')
        : (allProviders[0]
            ? (allProviders[0] === 'other-llm' ? 'Other LLM' : allProviders[0].charAt(0).toUpperCase() + allProviders[0].slice(1))
            : 'Unknown');

      const platformSessionsObj = Object.fromEntries(data.platformSessions);

      // Ensure URL is properly constructed
      let finalUrl = data.url;
      if (defaultUri && !finalUrl.startsWith('http')) {
        // If we have defaultUri but URL doesn't start with http, construct full URL
        // Handle both cases: path starting with / and path without /
        if (finalUrl.startsWith('/')) {
          finalUrl = `${defaultUri}${finalUrl}`;
        } else {
          finalUrl = `${defaultUri}/${finalUrl}`;
        }
        console.log('🔗 [transformPagesData] Constructed URL:', { original: data.url, final: finalUrl, defaultUri });
      } else if (!defaultUri) {
        console.warn('⚠️ [transformPagesData] No defaultUri available, URL will be path only:', finalUrl);
      }

      return {
        title: data.title || 'Untitled Page',
        url: finalUrl, // Use the properly constructed URL
        sessions: data.sessions,
        sqs: Math.round(sqs * 100) / 100,
        contentGroup,
        conversionRate: data.sessions > 0 ? Math.round((data.totalConversions / data.sessions) * 100 * 100) / 100 : 0,
        bounce: Math.round(avgBounceRate * 100) / 100, // Keep as percentage (0-100)
        pageType,
        timeOnPage: Math.round(avgSessionDuration),
        llmJourney,
        provider: providerName,
        platformSessions: platformSessionsObj,
        // Debug fields
        _totalConversions: data.totalConversions, // Keep for debugging
        _conversionRateRaw: data.sessions > 0 ? (data.totalConversions / data.sessions) * 100 : 0
      };
    }).sort((a, b) => b.sessions - a.sessions);

  // Debug: Log conversion rates summary
  const pagesWithConversions = pages.filter(p => p._totalConversions > 0);
  console.log('🔍 [transformPagesData] Conversion summary:', {
    totalPages: pages.length,
    pagesWithConversions: pagesWithConversions.length,
    totalSessions: pages.reduce((sum, p) => sum + p.sessions, 0),
    totalConversions: pages.reduce((sum, p) => sum + p._totalConversions, 0),
    defaultUri,
    sampleUrls: pages.slice(0, 5).map(p => ({
      page: p.title,
      url: p.url,
      hasHttp: p.url.startsWith('http')
    })),
    sampleConversionRates: pages.slice(0, 5).map(p => ({
      page: p.title,
      sessions: p.sessions,
      conversions: p._totalConversions,
      conversionRate: p.conversionRate
    }))
  });

  const totalSessions = pages.reduce((sum, page) => sum + page.sessions, 0);
  const avgSQS = pages.length > 0 ? pages.reduce((sum, page) => sum + page.sqs, 0) / pages.length : 0;

  return {
    pages,
    summary: {
      totalSessions,
      totalPages: pages.length,
      avgSQS
    }
  };
}

/**
 * Helper function to determine content group based on URL and title
 */
function getContentGroup(url, title) {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  if (urlLower.includes('/pricing') || titleLower.includes('pricing')) {
    return 'Pricing';
  }
  if (urlLower.includes('/tools/') || titleLower.includes('tool') || titleLower.includes('generator')) {
    return 'Free Tools';
  }
  if (urlLower.includes('/ab-testing') || titleLower.includes('a/b testing') || titleLower.includes('ab testing')) {
    return 'A/B Testing';
  }
  if (urlLower.includes('/conversion-rate-optimization') || urlLower.includes('/cro') || 
      titleLower.includes('conversion rate') || titleLower.includes('cro')) {
    return 'CRO Education';
  }
  if (urlLower.includes('/landing-page') || titleLower.includes('landing page')) {
    return 'Landing Pages';
  }
  if (urlLower.includes('/geo') || titleLower.includes('generative engine') || titleLower.includes('llm seo')) {
    return 'GEO/LLM SEO';
  }
  if (urlLower.includes('/docs') || urlLower.includes('/help') || urlLower.includes('/guide') ||
      titleLower.includes('documentation') || titleLower.includes('guide')) {
    return 'Docs';
  }
  if (urlLower.includes('/product') || urlLower.includes('/pilot') || 
      titleLower.includes('product') || titleLower.includes('pilot')) {
    return 'Product';
  }
  if (urlLower.includes('/case-stud') || urlLower.includes('/whitepaper') || 
      urlLower.includes('/resource') || titleLower.includes('case study') || 
      titleLower.includes('whitepaper')) {
    return 'Resources';
  }
  if (urlLower.includes('/blog') || urlLower.includes('/article') || 
      titleLower.includes('blog') || titleLower.includes('article')) {
    return 'Blog';
  }
  if (urlLower === '/' || urlLower.includes('/home')) {
    return 'Homepage';
  }
  
  return 'Other';
}

/**
 * Helper function to determine page type
 */
function getPageType(url, title) {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  if (urlLower === '/' || urlLower.includes('/home')) {
    return 'Home';
  }
  if (urlLower.includes('/landing/') || titleLower.includes('landing')) {
    return 'Landing';
  }
  if (urlLower.includes('/blog/') || titleLower.includes('blog')) {
    return 'Content';
  }
  if (urlLower.includes('/product/') || titleLower.includes('product')) {
    return 'Product';
  }
  if (urlLower.includes('/support/') || titleLower.includes('support')) {
    return 'Support';
  }
  
  return 'Content';
}

/**
 * Helper function to determine LLM journey position
 */
function getLLMJourney(sessions, engagementRate) {
  if (sessions > 50 && engagementRate > 60) {
    return 'Entry';
  }
  if (sessions < 10 && engagementRate < 30) {
    return 'Exit';
  }
  return 'Middle';
}

/**
 * Transform trend data for charts
 */
function transformTrendData(rawData) {
  const rows = rawData.rows || [];
  
  // Group by date and platform
  const dateMap = new Map();
  
  for (const row of rows) {
    const date = row.dimensionValues?.[0]?.value || '';
    const source = row.dimensionValues?.[1]?.value || '';
    const medium = row.dimensionValues?.[2]?.value || '';
    const sessions = parseInt(row.metricValues?.[0]?.value || '0');
    
    // Detect platform
    const platform = detectPlatform(source, medium);
    
    if (!dateMap.has(date)) {
      dateMap.set(date, new Map());
    }
    
    const platformMap = dateMap.get(date);
    const current = platformMap.get(platform) || 0;
    platformMap.set(platform, current + sessions);
  }
  
  // Define all expected platforms
  const allPlatforms = ['organic', 'direct', 'referral', 'LLMs', 'other', 'social', 'email', 'paid'];
  
  // Convert to array format with LLM aggregation
  const result = Array.from(dateMap.entries())
    .map(([date, platformMap]) => {
      const dataPoint = { date: formatDate(date) };
      
      // Aggregate LLM platforms
      const llmPlatforms = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity'];
      let llmSessions = 0;
      
      llmPlatforms.forEach(llmPlatform => {
        const sessions = platformMap.get(llmPlatform) || 0;
        llmSessions += sessions;
        platformMap.delete(llmPlatform);
      });
      
      // Add aggregated LLMs
      dataPoint['LLMs'] = llmSessions;
      
      // Add all platforms
      allPlatforms.forEach(platform => {
        if (platform === 'LLMs') return;
        dataPoint[platform] = platformMap.get(platform) || 0;
      });
      
      return dataPoint;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return result;
}

/**
 * Format date for chart display
 */
function formatDate(dateString) {
  if (!dateString) return '';
  // GA4 returns dates in YYYYMMDD format
  if (dateString.length === 8) {
    return `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`;
  }
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

module.exports = {
  transformMetricsData,
  transformPlatformData,
  transformToPlatformSplit,
  transformToLLMPlatforms,
  transformTrendData,
  transformGeoData,
  transformDeviceData,
  transformPagesData,
  calculateComparisonDates
};
