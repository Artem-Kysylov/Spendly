// Import types
import { ToastMessageProps } from '../../types/types'

// Import components
import { CircleCheck, CircleX } from "lucide-react"
import { useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/use-toast'

const ToastMessage = ({ text, type }: ToastMessageProps) => {
  const wrapper =
    "fixed bottom-4 right-4 z-50"
  const base =
    "px-4 py-2 rounded-lg shadow-lg min-w-[200px] h-16 flex items-center"

  const color =
    type === 'success'
      ? "bg-success text-success-foreground"
      : "bg-error text-error-foreground"

  const { toast } = useToast()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    toast({
      description: text,
      variant: type === 'success' ? 'success' : 'destructive',
      duration: 3000,
    })
  }, [text, type, toast])

  return null
}

export default ToastMessage