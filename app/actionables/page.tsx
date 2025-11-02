'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageList } from '@/components/tabs/pages/PageList'

export default function ActionablesDashboard() {
  const [selectedDateRange] = useState('30 days')

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Pages Tab Section */}
            <div>
              <PageList 
                range={{ from: new Date(), to: new Date() }}
                dateRange={selectedDateRange}
                isLoading={false}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

