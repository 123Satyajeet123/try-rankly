'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { initiateGA4OAuth, getAccountsProperties, saveProperty } from '@/services/ga4Api'

interface GA4Property {
  propertyId: string
  displayName: string
  accountId: string
  accountName: string
}

interface SetupOptionsSectionProps {
  onSetupComplete: () => void
}

export function SetupOptionsSection({ onSetupComplete }: SetupOptionsSectionProps) {
  const router = useRouter()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isFetchingProperties, setIsFetchingProperties] = useState(false)
  const [properties, setProperties] = useState<GA4Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>('')
  const [connectionStep, setConnectionStep] = useState<'welcome' | 'select-property' | 'connecting'>('welcome')

  const handleConnectGA4 = async () => {
    setIsConnecting(true)
    setConnectionStep('connecting')
    
    try {
      // Redirect to GA4 OAuth (separate from main Google auth)
      initiateGA4OAuth()
    } catch (error) {
      console.error('Error initiating OAuth:', error)
      toast.error('Failed to connect with Google Analytics')
      setIsConnecting(false)
      setConnectionStep('welcome')
    }
  }

  const handlePropertySelect = async (propertyId: string) => {
    setSelectedProperty(propertyId)
    setIsConnecting(true)

    try {
      // Find the selected property to get all details
      const selectedProp = properties.find(p => p.propertyId === propertyId)
      if (!selectedProp) {
        throw new Error('Selected property not found')
      }

      // Call the save-property endpoint
      const response = await saveProperty(selectedProp.accountId, selectedProp.propertyId)

      if (!response.success) {
        throw new Error('Failed to save property')
      }

      toast.success('✅ GA4 connected successfully — loading your dashboard...')
      
      // Small delay for better UX
      setTimeout(() => {
        onSetupComplete?.()
      }, 1500)

    } catch (error) {
      console.error('Error saving property:', error)
      toast.error('Failed to connect property')
      setIsConnecting(false)
    }
  }

  // Check if we're returning from OAuth and fetch properties
  useEffect(() => {
    const checkOAuthReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('oauth_complete') === 'true') {
        setConnectionStep('select-property')
        setIsFetchingProperties(true)

        try {
          const response = await getAccountsProperties()

          if (response.success && response.data.accounts) {
            // Flatten all properties from all accounts
            const allProperties = response.data.accounts.flatMap((account: any) => 
              account.properties.map((property: any) => ({
                propertyId: property.propertyId,
                displayName: property.propertyName,
                accountId: account.accountId,
                accountName: account.accountName,
              }))
            )
            setProperties(allProperties)
          } else {
            throw new Error('Failed to fetch properties')
          }
        } catch (error) {
          console.error('Error fetching properties:', error)
          toast.error('Failed to fetch GA4 properties')
          setConnectionStep('welcome')
        } finally {
          setIsFetchingProperties(false)
        }
      }
    }

    checkOAuthReturn()
  }, [])

  return (
    <div className="w-full flex items-center justify-center p-8">
      <div className="w-full max-w-5xl">
        {/* Split Card */}
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-border/20">
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left Content Section */}
            <div className="flex-1 p-16 flex flex-col justify-center space-y-8">
              {/* Header */}
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                      Track revenue from AI-driven traffic
                    </h1>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      Connect Google Analytics to measure how AI platforms drive leads, purchases, and revenue.
                    </p>
                  </div>
                </div>
              </div>

              {/* Content based on step */}
              <div className="space-y-8">
                {connectionStep === 'welcome' && (
                  <>
                    <Button 
                      onClick={handleConnectGA4}
                      className="w-full h-14 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
                      size="lg"
                    >
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Connect Google Analytics
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </>
                )}

                {connectionStep === 'select-property' && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Google Account Connected
                      </Badge>
                    </div>

                    {isFetchingProperties ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Fetching properties...</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">
                            Select GA4 Property
                          </label>
                          <Select onValueChange={handlePropertySelect} disabled={isConnecting}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose your property" />
                            </SelectTrigger>
                            <SelectContent>
                              {properties.map((property) => (
                                <SelectItem key={property.propertyId} value={property.propertyId}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{property.displayName}</span>
                                    <span className="text-xs text-muted-foreground">{property.accountName}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {isConnecting && selectedProperty && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Connecting property...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {connectionStep === 'connecting' && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Connecting...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Visual Section */}
            <div className="flex-1 bg-muted/30 p-16 flex flex-col justify-center">
              <div className="w-full max-w-md">
                {/* Analytics Chart Visualization */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">
                      AI Traffic Analytics
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      Track how AI platforms drive your business growth
                    </p>
                  </div>

                  {/* Traffic List */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between py-3 border-b border-border/20">
                      <span className="text-sm font-medium text-foreground">ChatGPT Traffic</span>
                      <span className="text-sm font-semibold text-green-600">+24%</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border/20">
                      <span className="text-sm font-medium text-foreground">Claude Traffic</span>
                      <span className="text-sm font-semibold text-green-600">+18%</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium text-foreground">Gemini Traffic</span>
                      <span className="text-sm font-semibold text-green-600">+12%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
