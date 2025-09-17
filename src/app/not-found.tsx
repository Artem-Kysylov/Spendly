'use client';
// Imports 
import { useRouter } from 'next/navigation'



// Import components
import Button from '../components/ui-elements/Button'

const NotFound = () => {
  const router = useRouter()

  const handleClick = () => {
    router.push('/')
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-5">
      <img src="/illustration-404.svg" alt="404" />
      <h1 className="text-[100px] leading-none font-semibold text-primary">404</h1>
      <p className="text-[25px] font-semibold text-secondary-black text-center">Sorry, this page does not exist</p>
      <Button
        text='Go to the Home page'
        variant="primary"
        onClick={handleClick}
      />
    </div>
  )
}

export default NotFound