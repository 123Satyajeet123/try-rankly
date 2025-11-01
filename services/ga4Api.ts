import type { GA4ApiResponse, GA4Account, GA4Connection, PageData, GeoData, DeviceData } from '@/types/ga4'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Helper function to fetch with credentials
async function fetchWithCredentials(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

// OAuth & Connection
export const initiateGA4OAuth = () => {
  window.location.href = `${API_BASE_URL}/auth/ga4`
}

export const checkGA4Connection = async (): Promise<GA4ApiResponse<GA4Connection>> => {
  try {
    const response = await fetchWithCredentials(`${API_BASE_URL}/ga4/connection-status`)
    
    // Check if response is OK
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch {
          // Ignore parsing errors
        }
      }
      
      console.error('❌ [checkGA4Connection] HTTP error:', errorMessage, 'Status:', response.status);
      return {
        success: false,
        error: errorMessage
      };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
    console.error('❌ [checkGA4Connection] Network/unexpected error:', errorMessage);
    return {
      success: false,
      error: `Failed to check GA4 connection: ${errorMessage}`
    };
  }
}

export const disconnectGA4 = async (): Promise<GA4ApiResponse<void>> => {
  const response = await fetchWithCredentials(`${API_BASE_URL}/ga4/disconnect`, {
    method: 'POST',
  })
  return response.json()
}

// Property Management
export const getAccountsProperties = async (): Promise<GA4ApiResponse<{ accounts: GA4Account[] }>> => {
  const response = await fetchWithCredentials(`${API_BASE_URL}/ga4/accounts-properties`)
  return response.json()
}

export const saveProperty = async (accountId: string, propertyId: string): Promise<GA4ApiResponse<{ propertyId: string, propertyName: string }>> => {
  const response = await fetchWithCredentials(`${API_BASE_URL}/ga4/save-property`, {
    method: 'POST',
    body: JSON.stringify({ accountId, propertyId }),
  })
  return response.json()
}

// Data Fetching
export const getLLMPlatforms = async (startDate: string, endDate: string, dateRange?: string, conversionEvent: string = 'conversions'): Promise<GA4ApiResponse<Array<{ platform: string, sessions: string, users: string, pageViews: string }>>> => {
  try {
    const dateRangeParam = dateRange ? `&dateRange=${encodeURIComponent(dateRange)}` : '';
    const conversionEventParam = conversionEvent ? `&conversionEvent=${encodeURIComponent(conversionEvent)}` : '';
    const url = `${API_BASE_URL}/ga4/llm-platforms?startDate=${startDate}&endDate=${endDate}${dateRangeParam}${conversionEventParam}`;
    
    const response = await fetchWithCredentials(url);
    
    // Check if response is OK
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch {
          // Ignore parsing errors
        }
      }
      
      console.error('❌ [getLLMPlatforms] HTTP error:', errorMessage, 'Status:', response.status);
      return {
        success: false,
        error: errorMessage
      };
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ [getLLMPlatforms] API returned error:', data.error || 'Unknown error');
    }
    
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
    console.error('❌ [getLLMPlatforms] Network/unexpected error:', errorMessage);
    return {
      success: false,
      error: `Failed to fetch LLM platforms data: ${errorMessage}`
    };
  }
}

export const getPlatformSplit = async (startDate: string, endDate: string, dateRange?: string, conversionEvent: string = 'conversions'): Promise<GA4ApiResponse<Array<{ platform: string, sessions: string, percentage: string }>>> => {
  const dateRangeParam = dateRange ? `&dateRange=${encodeURIComponent(dateRange)}` : '';
  const conversionEventParam = conversionEvent ? `&conversionEvent=${encodeURIComponent(conversionEvent)}` : '';
  const url = `${API_BASE_URL}/ga4/platform-split?startDate=${startDate}&endDate=${endDate}${dateRangeParam}${conversionEventParam}`;
  
  try {
    console.log('🔄 [getPlatformSplit] Fetching from:', url);
    
    const response = await fetchWithCredentials(url);
    
    // Check if response is OK
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response isn't JSON, try to get text
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch {
          // Ignore parsing errors
        }
      }
      
      console.error('❌ [getPlatformSplit] HTTP error:', errorMessage, 'Status:', response.status);
      return {
        success: false,
        error: errorMessage
      };
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ [getPlatformSplit] API returned error:', data.error || 'Unknown error');
    } else {
      console.log('✅ [getPlatformSplit] API success:', { 
        hasData: !!data.data, 
        dataKeys: data.data ? Object.keys(data.data) : [] 
      });
    }
    
    return data;
  } catch (error) {
    // Network error or other fetch error
    const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
    console.error('❌ [getPlatformSplit] Network/unexpected error:', errorMessage, 'URL:', url);
    return {
      success: false,
      error: `Failed to fetch platform split data: ${errorMessage}`
    };
  }
}

export const getPages = async (startDate: string, endDate: string, limit: number = 10, dateRange?: string, conversionEvent: string = 'conversions'): Promise<GA4ApiResponse<Array<PageData>>> => {
  const dateRangeParam = dateRange ? `&dateRange=${encodeURIComponent(dateRange)}` : '';
  const conversionEventParam = conversionEvent ? `&conversionEvent=${encodeURIComponent(conversionEvent)}` : '';
  const response = await fetchWithCredentials(`${API_BASE_URL}/ga4/pages?startDate=${startDate}&endDate=${endDate}&limit=${limit}${dateRangeParam}${conversionEventParam}`)
  return response.json()
}

export const getConversionEvents = async (): Promise<GA4ApiResponse<{ events: Array<{ name: string, displayName: string, category: string }>, totalEvents: number }>> => {
  const response = await fetchWithCredentials(`${API_BASE_URL}/ga4/conversion-events`)
  return response.json()
}

export const getGeo = async (startDate: string, endDate: string): Promise<GA4ApiResponse<Array<GeoData>>> => {
  const response = await fetchWithCredentials(`${API_BASE_URL}/ga4/geo?startDate=${startDate}&endDate=${endDate}`)
  return response.json()
}

export const getDevices = async (startDate: string, endDate: string): Promise<GA4ApiResponse<Array<DeviceData>>> => {
  const response = await fetchWithCredentials(`${API_BASE_URL}/ga4/devices?startDate=${startDate}&endDate=${endDate}`)
  return response.json()
}

export const getPlatformTrends = async (startDate: string, endDate: string): Promise<GA4ApiResponse<any>> => {
  const response = await fetchWithCredentials(`${API_BASE_URL}/ga4/llm-platform-trends?startDate=${startDate}&endDate=${endDate}`)
  return response.json()
}

// Date range helpers
export const getDateRange = (days: number): { startDate: string, endDate: string } => {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

// Cache Management
export const clearGA4Cache = async (): Promise<GA4ApiResponse<void>> => {
  const response = await fetchWithCredentials(`${API_BASE_URL}/ga4/clear-cache`, {
    method: 'POST',
  })
  return response.json()
}

