// Imports 
import { useEffect, useRef } from 'react'

// Import types
import { SignOutModalProps } from '../../types/types'

// Import components 
import Button from '../ui-elements/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useTranslations } from 'next-intl'

const SignOutModal = ({ title, text, onClose, signOut }: SignOutModalProps) => {
    const handleSignOut = () => {
        signOut()
        onClose()
    }
    const tCommon = useTranslations('common')
    const tCta = useTranslations('cta')
  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
      {/* Убираем захардкоженный светлый фон и серые бордеры */}
      <DialogContent className="border">
        <DialogHeader>
          <DialogTitle className="text-secondary-black dark:text-white">{title}</DialogTitle>
        </DialogHeader>
        <p className="py-4 text-secondary-black dark:text-gray-300">{text}</p>
        <DialogFooter>
          <div className="flex gap-2">
            <Button text={tCommon('cancel')} variant="ghost" onClick={onClose} className="text-primary" />
            <Button text={tCta('signOut')} variant="default" onClick={handleSignOut}/>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SignOutModal