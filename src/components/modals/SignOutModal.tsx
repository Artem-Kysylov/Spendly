// Imports 
import { useEffect, useRef } from 'react'

// Import types
import { SignOutModalProps } from '../../types/types'

// Import components 
import Button from '../ui-elements/Button'

const SignOutModal = ({ title, text, onClose, signOut }: SignOutModalProps) => {
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

    const handleSignOut = () => {
        signOut()
        onClose()
      }

  return (
    <dialog ref={dialogRef} className="modal">
    <div className="modal-box">
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="py-4">{text}</p>
      <div className="modal-action">
        <form method="dialog">
          <Button className='btn-ghost' text='Cancel' onClick={onClose}/>
          <Button className='btn-primary text-white' text='Sign Out' onClick={handleSignOut}/>
        </form>
      </div>
    </div>
  </dialog>
  )
}

export default SignOutModal