// Imports 
import { useEffect, useRef } from 'react'

// Import types
import { DeleteModalProps } from '../../types/types'

// Import components 
import Button from '../ui-elements/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

const DeleteModal = ({ title, text, onClose, onConfirm, isLoading = false }: DeleteModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.showModal()
    }
    return () => {
      if (dialogRef.current) {
        dialogRef.current.close()
      }
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm()
  }

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="py-4">{text}</p>
        <DialogFooter>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Button 
              variant="ghost"
              text='Cancel' 
              onClick={onClose}
              disabled={isLoading}
            />
            <Button 
              variant="destructive"
              text={isLoading ? 'Deleting...' : 'Delete'} 
              type="submit"
              disabled={isLoading}
            />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteModal