'use client'

import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface NotificationBellProps {
  count?: number
  className?: string
}

const NotificationBell = ({ count = 99, className = '' }: NotificationBellProps) => {
  return (
    <div className={`cursor-pointer relative ${className}`}>
      {/* Background */}
      <div className="w-[35px] h-[35px] rounded-full bg-primary/10 flex items-center justify-center transition-all duration-200 hover:bg-primary/40">
        {/* Bell icon */}
        <Bell className="w-5 h-5 text-primary" />
      </div>
      
      {/* Badge */}
      {count > 0 && (
        <Badge 
          variant="notification"
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0 flex items-center justify-center text-[10px] font-medium min-w-[20px]"
        >
          {count > 99 ? '99+' : count}
        </Badge>
      )}
    </div>
  )
}

export default NotificationBell