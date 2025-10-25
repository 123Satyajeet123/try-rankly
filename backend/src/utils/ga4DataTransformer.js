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
    const platform = detectPlatform(source, medium, referrer);
    const sessions = parseFloat(row.metricValues?.[0]?.value || '0');
    
    const current = comparisonMap.get(platform) || { sessions: 0 };
    current.sessions += sessions;
    comparisonMap.set(platform, current);
  }
  
  // Aggregate metrics by platform for current period
  const platformMap = new Map();
  
  for (const row of rows) {
    const source = row.dimensionValues?.[0]?.value || '';
    const medium = row.dimensionValues?.[1]?.value || '';
    const referrer = row.dimensionValues?.[2]?.value || ''; // Added referrer dimension
    const metrics = row.metricValues || [];
    
    const platform = detectPlatform(source, medium, referrer);
    
    const current = platformMap.get(platform) || {
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
    
    // Parse metrics
    current.sessions += parseFloat(metrics[0]?.value || '0');
    current.engagementRate += parseFloat(metrics[1]?.value || '0');
    current.conversions += parseFloat(metrics[2]?.value || '0');
    current.bounceRate += parseFloat(metrics[3]?.value || '0');
    current.avgSessionDuration += parseFloat(metrics[4]?.value || '0');
    current.pagesPerSession += parseFloat(metrics[5]?.value || '0');
    current.newUsers += parseFloat(metrics[6]?.value || '0');
    current.totalUsers += parseFloat(metrics[7]?.value || '0');
    current.count += 1;
    
    platformMap.set(platform, current);
  }
  
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
  
  // Add aggregated LLM data
  if (llmData.sessions > 0) {
    llmData.engagementRate = llmData.count > 0 ? llmData.engagementRate / llmData.count : 0;
    llmData.bounceRate = llmData.count > 0 ? llmData.bounceRate / llmData.count : 0;
    llmData.avgSessionDuration = llmData.count > 0 ? llmData.avgSessionDuration / llmData.count : 0;
    llmData.pagesPerSession = llmData.count > 0 ? llmData.pagesPerSession / llmData.count : 0;
    platformMap.set('LLMs', llmData);
  }
  
  // Store LLM platform breakdown for validation
  const llmBreakdown = llmPlatformData.map(({ platform, data }) => ({
    platform,
    sessions: data.sessions
  }));
  
  // Calculate averages and format final platform data
  const finalPlatformData = [];
  
  // Process each platform
  for (const [platform, data] of platformMap.entries()) {
    const avgEngagementRate = data.count > 0 ? data.engagementRate / data.count : 0;
    const avgBounceRate = data.count > 0 ? data.bounceRate / data.count : 0;
    const avgSessionDuration = data.count > 0 ? data.avgSessionDuration / data.count : 0;
    const avgPagesPerSession = data.count > 0 ? data.pagesPerSession / data.count : 0;
    const returningUsers = data.totalUsers - data.newUsers;
    const conversionRate = data.sessions > 0 ? (data.conversions / data.sessions) * 100 : 0;
    
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
      percentage: totalSessions > 0 ? (data.sessions / totalSessions * 100) : 0,
      engagementRate: avgEngagementRate * 100,
      conversions: data.conversions,
      bounceRate: avgBounceRate * 100,
      avgSessionDuration: avgSessionDuration,
      pagesPerSession: avgPagesPerSession,
      newUsers: data.newUsers,
      returningUsers: returningUsers,
      goalCompletions: data.conversions,
      revenue: 0,
      conversionRate: conversionRate,
      // Comparison data
      change: sessionChange,
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
    percentage: `${item.percentage.toFixed(1)}%`,
    change: item.change,
    absoluteChange: item.absoluteChange,
    trend: item.trend
  }));
  
  // Top platform info
  const topPlatform = finalPlatformData[0]?.name || 'N/A';
  const topPlatformShare = finalPlatformData[0]?.percentage || 0;
  
  // Debug: Log LLM breakdown
  console.log('🔍 LLM Platform Breakdown:', {
    totalLLMSessions: llmData.sessions,
    llmBreakdown: llmBreakdown,
    totalSessions: totalSessions,
    validation: finalPlatformData.reduce((sum, p) => sum + p.sessions, 0) === totalSessions
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
  
  // Build comparison map
  const comparisonMap = new Map();
  for (const row of comparisonRows) {
    const referrer = row.dimensionValues?.[0]?.value || '';
    let platform = 'Other';
    for (const [name, pattern] of Object.entries(LLM_PATTERNS)) {
      if (pattern.test(referrer)) {
        platform = name;
        break;
      }
    }
    const sessions = parseFloat(row.metricValues?.[0]?.value || '0');
    const current = comparisonMap.get(platform) || { sessions: 0 };
    current.sessions += sessions;
    comparisonMap.set(platform, current);
  }
  
  const platformMap = new Map();
  
  for (const row of rows) {
    const referrer = row.dimensionValues?.[0]?.value || '';
    const metrics = row.metricValues || [];
    
    // Detect platform from referrer
    let platform = 'Other';
    for (const [name, pattern] of Object.entries(LLM_PATTERNS)) {
      if (pattern.test(referrer)) {
        platform = name;
        break;
      }
    }
    
    const current = platformMap.get(platform) || {
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
    
    current.sessions += parseFloat(metrics[0]?.value || '0');
    current.engagementRate += parseFloat(metrics[1]?.value || '0');
    current.conversions += parseFloat(metrics[2]?.value || '0');
    current.bounceRate += parseFloat(metrics[3]?.value || '0');
    current.avgSessionDuration += parseFloat(metrics[4]?.value || '0');
    current.pagesPerSession += parseFloat(metrics[5]?.value || '0');
    current.newUsers += parseFloat(metrics[6]?.value || '0');
    current.totalUsers += parseFloat(metrics[7]?.value || '0');
    current.count += 1;
    
    platformMap.set(platform, current);
  }
  
  // Calculate averages and format platforms
  const platformDataArray = [];
  
  for (const [platform, data] of platformMap.entries()) {
    const avgEngagementRate = data.count > 0 ? data.engagementRate / data.count : 0;
    const avgBounceRate = data.count > 0 ? data.bounceRate / data.count : 0;
    const avgSessionDuration = data.count > 0 ? data.avgSessionDuration / data.count : 0;
    const avgPagesPerSession = data.count > 0 ? data.pagesPerSession / data.count : 0;
    const returningUsers = data.totalUsers - data.newUsers;
    const conversionRate = data.sessions > 0 ? (data.conversions / data.sessions) * 100 : 0;
    
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
      engagementRate: avgEngagementRate * 100,
      conversions: data.conversions,
      bounceRate: avgBounceRate * 100,
      avgSessionDuration: avgSessionDuration,
      pagesPerSession: avgPagesPerSession,
      newUsers: data.newUsers,
      returningUsers: returningUsers,
      conversionRate: conversionRate,
      // Comparison data
      change: sessionChange,
      absoluteChange: absoluteChange,
      trend: sessionChange > 0 ? 'up' : sessionChange < 0 ? 'down' : 'neutral'
    });
  }
  
  // Sort by sessions
  platformDataArray.sort((a, b) => b.sessions - a.sessions);
  
  // Calculate totals and percentages
  const totalLLMSessions = platformDataArray.reduce((sum, p) => sum + p.sessions, 0);
  const totalLLMConversions = platformDataArray.reduce((sum, p) => sum + p.conversions, 0);
  const avgEngagementRate = platformDataArray.length > 0 
    ? platformDataArray.reduce((sum, p) => sum + p.engagementRate, 0) / platformDataArray.length 
    : 0;
  
  // Add percentage field to each platform
  const platformsWithPercentage = platformDataArray.map(platform => ({
    ...platform,
    percentage: totalLLMSessions > 0 ? (platform.sessions / totalLLMSessions) * 100 : 0
  }));
  
  // Debug: Log LLM platforms total
  console.log('🔍 LLM Platforms Total:', {
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
 * Transform geographic data
 */
function transformGeoData(rawData) {
  if (!rawData.rows) {
    return [];
  }

  return rawData.rows.map(row => {
    const dimensionValues = row.dimensionValues || [];
    const metricValues = row.metricValues || [];
    
    return {
      country: dimensionValues[0]?.value || 'Unknown',
      sessions: metricValues[0]?.value || '0',
      users: metricValues[1]?.value || '0'
    };
  });
}

/**
 * Transform device data
 */
function transformDeviceData(rawData) {
  if (!rawData.rows) {
    return [];
  }

  return rawData.rows.map(row => {
    const dimensionValues = row.dimensionValues || [];
    const metricValues = row.metricValues || [];
    
    return {
      device: dimensionValues[0]?.value || 'Unknown',
      os: dimensionValues[1]?.value || 'Unknown',
      browser: dimensionValues[2]?.value || 'Unknown',
      sessions: metricValues[0]?.value || '0',
      users: metricValues[1]?.value || '0'
    };
  });
}

/**
 * Transform pages data
 */
function transformPagesData(rawData) {
  if (!rawData.rows) {
    return [];
  }

  return rawData.rows.map(row => {
    const dimensionValues = row.dimensionValues || [];
    const metricValues = row.metricValues || [];
    
    return {
      pagePath: dimensionValues[0]?.value || 'Unknown',
      pageTitle: dimensionValues[1]?.value || 'Unknown',
      sessions: metricValues[0]?.value || '0',
      pageViews: metricValues[1]?.value || '0',
      avgTimeOnPage: metricValues[2]?.value || '0'
    };
  });
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
