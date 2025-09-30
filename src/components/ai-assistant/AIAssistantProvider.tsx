"use client"

import React from 'react'
import { FloatingAIButton } from './index'

const AIAssistantProvider: React.FC = () => {
  const handleAIButtonClick = () => {
    // Пока что просто console.log, позже добавим модальное окно
    console.log('AI Assistant clicked')
  }

  return (
    <FloatingAIButton onClick={handleAIButtonClick} />
  )
}

export default AIAssistantProvider