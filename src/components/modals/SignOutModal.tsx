// Imports 
import { useEffect, useRef } from 'react'

// Import types
import { SignOutModalProps } from '../../types/types'

// Import components 
import Button from '../ui-elements/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

const SignOutModal = ({ title, text, onClose, signOut }: SignOutModalProps) => {
    const handleSignOut = () => {
        signOut()
        onClose()
    }

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-white dark:bg-card border border-gray-200 dark:border-border">
        <DialogHeader>
          <DialogTitle className="text-secondary-black dark:text-white">{title}</DialogTitle>
        </DialogHeader>
        <p className="py-4 text-secondary-black dark:text-gray-300">{text}</p>
        <DialogFooter>
          <div className="flex gap-2">
            <Button text='Cancel' variant="ghost" onClick={onClose} className="text-primary" />
            <Button text='Sign Out' variant="default" onClick={handleSignOut}/>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SignOutModal