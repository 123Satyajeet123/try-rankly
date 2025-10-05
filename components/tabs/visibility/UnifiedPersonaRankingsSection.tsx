import React from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'

// Mock data for persona rankings
const personaData = [
  {
    persona: 'Marketing Manager',
    status: 'Leader',
    statusColor: 'bg-green-500',
    rankings: [
      { rank: 1, name: 'TechCorp' },
      { rank: 2, name: 'DataFlow' },
      { rank: 3, name: 'SmartAI' },
      { rank: 4, name: 'CloudSync' },
      { rank: 5, name: 'InnovateTech', isOwner: true },
      { rank: 6, name: 'NextGen Solutions' },
      { rank: 7, name: 'Future Systems' },
      { rank: 8, name: 'Digital Dynamics' },
      { rank: 9, name: 'CloudFirst Inc' },
      { rank: 10, name: 'AI Solutions Pro' },
    ]
  },
  {
    persona: 'Product Manager',
    status: 'Needs work',
    statusColor: 'bg-red-500',
    rankings: [
      { rank: 1, name: 'DataFlow' },
      { rank: 2, name: 'CloudSync' },
      { rank: 3, name: 'SmartAI' },
      { rank: 4, name: 'TechCorp' },
      { rank: 5, name: 'NextGen Solutions' },
      { rank: 6, name: 'InnovateTech', isOwner: true },
      { rank: 7, name: 'Future Systems' },
      { rank: 8, name: 'Digital Dynamics' },
      { rank: 9, name: 'CloudFirst Inc' },
      { rank: 10, name: 'AI Solutions Pro' },
    ]
  },
]

function UnifiedPersonaRankingsSection() {
  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Visibility Ranking by User Personas</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your brand&apos;s visibility ranking across different user personas
          </p>
        </div>
        
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 items-center text-sm font-medium text-muted-foreground border-b border-border/60 pb-3">
              <div className="col-span-2">User Personas</div>
              <div className="col-span-1 text-center">#1</div>
              <div className="col-span-1 text-center">#2</div>
              <div className="col-span-1 text-center">#3</div>
              <div className="col-span-1 text-center">#4</div>
              <div className="col-span-1 text-center">#5</div>
            </div>

            {/* Persona Rows */}
            {personaData.map((persona, index) => (
              <div key={persona.persona} className="grid grid-cols-7 gap-4 items-center py-3 border-b border-border/30 last:border-b-0">
                {/* Persona Column */}
                <div className="col-span-2 flex items-center gap-3">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{persona.persona}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-1 text-white ${persona.statusColor} border-0`}
                  >
                    {persona.status}
                  </Badge>
                </div>

                {/* Ranking Columns */}
                {persona.rankings.slice(0, 5).map((ranking) => (
                  <div key={`${persona.persona}-${ranking.rank}`} className="col-span-1 flex justify-center">
                    <div className="w-20 h-8 flex items-center justify-center rounded-full px-2">
                      <span 
                        className="text-xs font-medium truncate" 
                        style={{color: ranking.isOwner ? '#2563EB' : 'inherit'}}
                      >
                        {ranking.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

export { UnifiedPersonaRankingsSection }

