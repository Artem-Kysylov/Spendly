'use client'

import React from 'react'
import TopBar from '@/components/layout/TopBar'
import Sidebar from '@/components/layout/Sidebar'
import ProtectedRoute from '@/components/guards/ProtectedRoute'
import { AIAssistantProvider } from '@/components/ai-assistant'
import MobileTabBar from '@/components/layout/MobileTabBar'
import useDeviceType from '@/hooks/useDeviceType'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const { isDesktop, isMobile, isTablet } = useDeviceType()
  return (
    <ProtectedRoute>
      <AIAssistantProvider/>
        <div className="flex h-screen">
          <Sidebar />
          
          <div className="flex-1 flex flex-col lg:ml-64">
            <TopBar />
            <main className="flex-1 overflow-auto pb-20 lg:pb-0">
              {children}
            </main>
          </div>

          <MobileTabBar />
        </div>
    </ProtectedRoute>
  )
}