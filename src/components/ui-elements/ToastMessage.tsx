// Import types
import { ToastMessageProps } from '../../types/types'

// Import components
import { useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/use-toast'

const ToastMessage = ({ text, type }: ToastMessageProps) => {
  const { toast } = useToast()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    toast({
      variant: type === 'success' ? 'success' : 'destructive',
      description: text,
      duration: 3000,
    })
  }, [text, type, toast])

  return null
}

export default ToastMessage