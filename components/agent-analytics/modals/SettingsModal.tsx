'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onDisconnect: () => void
  lastSyncTime?: string
}

interface ConnectionStatus {
  isConnected: boolean
  user?: {
    email: string
    name: string
  }
  ga4Property?: {
    accountId: string
    propertyId: string
    accountName: string
    propertyName: string
  }
  lastSynced?: string
}

export function SettingsModal({ isOpen, onClose, onDisconnect, lastSyncTime }: SettingsModalProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ isConnected: false })
  const [loading, setLoading] = useState(false) // Start as false for immediate popup
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Show modal immediately, then fetch status in background
      fetchConnectionStatus()
    }
  }, [isOpen])

  const fetchConnectionStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      
      if (data.authenticated) {
        setConnectionStatus({
          isConnected: true,
          user: {
            email: data.user.email,
            name: data.user.name
          },
          ga4Property: {
            accountId: data.ga4Property.accountId,
            propertyId: data.ga4Property.propertyId,
            accountName: data.ga4Property.accountName,
            propertyName: data.ga4Property.propertyName
          },
          lastSynced: lastSyncTime || new Date().toISOString()
        })
      } else {
        setConnectionStatus({ isConnected: false })
      }
    } catch (error) {
      console.error('Error fetching connection status:', error)
      setConnectionStatus({ isConnected: false })
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true)
      
      // Call disconnect API
      const response = await fetch('/api/auth/disconnect', {
        method: 'POST'
      })
      
      if (response.ok) {
        setConnectionStatus({ isConnected: false })
        onDisconnect()
        onClose()
      } else {
        console.error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
    } finally {
      setDisconnecting(false)
    }
  }

  const formatLastSynced = (timestamp?: string) => {
    if (!timestamp) return 'Never'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
    return date.toLocaleDateString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md" 
        style={{ 
          zIndex: 9999,
          position: 'fixed'
        }}
      >
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>
            Manage your Google Analytics connection and sync settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Connection Status</h3>
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <Badge 
                  variant={connectionStatus.isConnected ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {connectionStatus.isConnected ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      Disconnected
                    </>
                  )}
                </Badge>
              )}
            </div>

            {connectionStatus.isConnected && connectionStatus.user && (
              <div className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Account</span>
                      <p className="text-sm font-medium">{connectionStatus.user.email}</p>
                      {connectionStatus.user.name && (
                        <p className="text-xs text-muted-foreground">{connectionStatus.user.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                {connectionStatus.ga4Property && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-muted-foreground">GA4 Property</span>
                        <p className="text-sm font-medium">{connectionStatus.ga4Property.propertyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {connectionStatus.ga4Property.accountName} • {connectionStatus.ga4Property.propertyId}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Last Sync */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Last Synced</h3>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {formatLastSynced(connectionStatus.lastSynced)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Actions</h3>
            
            {connectionStatus.isConnected ? (
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={fetchConnectionStatus}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Connection Status
                </Button>
                
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  {disconnecting ? 'Disconnecting...' : 'Disconnect Account'}
                </Button>
              </div>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => {
                  onClose()
                  window.location.href = '/api/auth/google?returnUrl=/agent-analytics'
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Connect Google Analytics
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
