'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, ExternalLink, Code } from 'lucide-react'

interface SetupOptionsSectionProps {
  onSetupComplete: () => void
}

export function SetupOptionsSection({ onSetupComplete }: SetupOptionsSectionProps) {
  const handleGoogleAnalyticsConnect = () => {
    // TODO: Implement Google OAuth flow
    console.log('Connect to Google Analytics')
    onSetupComplete() // For now, just complete setup
  }

  const handleRanklySDKConnect = () => {
    // TODO: Implement SDK installation flow
    console.log('Use Rankly Docs SDK')
    onSetupComplete() // For now, just complete setup
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-6xl shadow-2xl border-0 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-16">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-6">
              Welcome to Agent Analytics
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started by connecting your traffic source to begin tracking AI-driven visitor patterns
            </p>
          </div>

          {/* Horizontal Section Divider */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-16"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Side - Setup Options */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h2 className="text-3xl font-semibold text-foreground">
                  Connect your traffic source
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Choose how you want Rankly to track AI-driven traffic on your site. Both options provide comprehensive analytics for human vs agent traffic patterns.
                </p>
              </div>

              <div className="space-y-6">
                {/* Google Analytics Option */}
                <Button
                  onClick={handleGoogleAnalyticsConnect}
                  size="lg"
                  className="w-full h-16 rounded-2xl text-lg font-semibold flex items-center justify-center gap-4 hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl"
                >
                  <span className="text-2xl">📊</span>
                  <div className="text-left">
                    <div>Connect Google Analytics</div>
                    <div className="text-sm opacity-80">Import existing GA4 data</div>
                  </div>
                  <ArrowRight className="w-6 h-6" />
                </Button>

                {/* Rankly SDK Option */}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRanklySDKConnect}
                  className="w-full h-16 rounded-2xl text-lg font-semibold flex items-center justify-center gap-4 border-2 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl"
                >
                  <Code className="w-6 h-6" />
                  <div className="text-left">
                    <div>Use Rankly Docs SDK</div>
                    <div className="text-sm opacity-60">Install our tracking script</div>
                  </div>
                  <ExternalLink className="w-6 h-6" />
                </Button>
              </div>
            </div>

            {/* Right Side - Modern Abstract Animation */}
            <div className="relative overflow-hidden rounded-3xl h-[500px] bg-gradient-to-br from-primary/10 via-accent/5 to-primary/20 border border-border/50">
              {/* Animated Grid Pattern */}
              <div className="absolute inset-0 opacity-30">
                <div className="grid grid-cols-12 grid-rows-12 h-full w-full">
                  {Array.from({ length: 144 }).map((_, i) => (
                    <div
                      key={i}
                      className="border border-primary/20"
                      style={{
                        animationDelay: `${i * 0.05}s`,
                        animation: 'pulse 4s ease-in-out infinite'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="space-y-12">
                  {/* Main Analytics Icon */}
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center mx-auto animate-pulse shadow-2xl">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/60 to-primary/40 flex items-center justify-center">
                      <span className="text-4xl">📈</span>
                    </div>
                  </div>
                  
                  {/* Data Flow Indicators */}
                  <div className="flex justify-center space-x-12">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/50 to-primary/30 animate-bounce shadow-lg" style={{ animationDelay: '0.5s' }}>
                      <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-lg">👥</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/50 to-accent/30 animate-bounce shadow-lg" style={{ animationDelay: '1s' }}>
                      <div className="w-full h-full rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-lg">🤖</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/50 to-primary/30 animate-bounce shadow-lg" style={{ animationDelay: '1.5s' }}>
                      <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-lg">📊</span>
                      </div>
                    </div>
                  </div>

                  {/* Connection Lines */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg className="w-full h-full opacity-20" viewBox="0 0 400 300">
                      <path
                        d="M50,150 Q200,50 350,150"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        className="text-primary"
                        style={{
                          strokeDasharray: "10,5",
                          animation: "dash 3s linear infinite"
                        }}
                      />
                      <path
                        d="M50,150 Q200,250 350,150"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        className="text-accent"
                        style={{
                          strokeDasharray: "10,5",
                          animation: "dash 3s linear infinite reverse"
                        }}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
