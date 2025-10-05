'use client'

import { Button } from '@/components/ui/button'
import { Sun, Moon, BarChart3, MessageSquare, Globe, HelpCircle, Plus } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import apiService from '@/services/api'

export function Sidebar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleNewAnalysis = () => {
    router.push('/onboarding')
  }

  const navItems = [
    {
      title: 'Answer Engine Analytics',
      icon: BarChart3,
      link: '/dashboard',
      isActive: pathname === '/dashboard' || pathname.startsWith('/dashboard'),
    },
    {
      title: 'Agent Analytics',
      icon: MessageSquare,
      link: '/agent-analytics',
      isActive: pathname === '/agent-analytics',
    },
    {
      title: 'Actionables',
      icon: Globe,
      link: '#',
      isActive: false,
    },
  ]

  return (
    <aside className="w-64 bg-background border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-6">
        <h1 className="brand text-2xl tracking-tight">Rankly</h1>
      </div>

      {/* New Analysis Button */}
      <div className="px-4 pb-2">
        <Button
          onClick={handleNewAnalysis}
          className="w-full justify-center gap-2 bg-foreground text-background hover:bg-foreground/90"
        >
          <Plus className="h-4 w-4" />
          New Analysis
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <Link key={index} href={item.link}>
              <Button
                variant="ghost"
                className={`w-full justify-start h-10 px-3 body-text hover:bg-accent hover:text-accent-foreground ${
                  item.isActive ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/60 space-y-4">
        <Button variant="ghost" className="w-full justify-start h-10 px-3 body-text">
          <HelpCircle className="mr-3 h-4 w-4" />
          Contact us
        </Button>
        
        {/* Theme Toggle */}
        <div className="flex items-center justify-center">
          <div className="flex items-center bg-muted/50 rounded-full p-0.5" suppressHydrationWarning>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme('light')}
              className={`h-7 w-7 rounded-full transition-all ${
                mounted && theme === 'light' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme('dark')}
              className={`h-7 w-7 rounded-full transition-all ${
                mounted && theme === 'dark' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
