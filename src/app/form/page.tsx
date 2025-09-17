'use client';
// Imports 
import Form from '../../components/chunks/Form'
import Button from '../../components/ui-elements/Button'

// Import hooks 
import { useRouter } from 'next/navigation'

const FormPage = () => {
  const router = useRouter()

  

  return (
    <>
      <div className='ml-5 mr-5 mt-[30px]'>
        <Button
          variant='ghost'
          className='text-primary p-0'
          text='Back to Dashboard'
          onClick={() => router.push('/dashboard')}
        />
        <h1 className='text-[25px] font-semibold text-secondary-black mt-[30px] mb-2'>Fill out the form and add new transaction📝</h1>
        <Form />
      </div>
    </>
  )
}

export default FormPage