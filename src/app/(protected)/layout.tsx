'use client'

// Imports 
import React from 'react'
import TopBar from '@/components/layout/TopBar'
import ProtectedRoute from '@/components/guards/ProtectedRoute'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <TopBar />
      {children}
    </ProtectedRoute>
  )
}