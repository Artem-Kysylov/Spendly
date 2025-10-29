'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import Button from '@/components/ui-elements/Button'
import { useTranslations } from 'next-intl'

export default function NotFoundClient() {
  const router = useRouter()
  const tNotFound = useTranslations('notFound')

  const handleClick = () => {
    router.push('/')
  }

  return (
    <motion.div 
      className="flex flex-col items-center justify-center h-screen gap-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.img 
        src="/illustration-404.svg" 
        alt={tNotFound('alt.illustration')}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      />
      <motion.h1 
        className="text-[64px] sm:text-[80px] md:text-[100px] leading-none font-semibold text-primary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        404
      </motion.h1>
      <motion.p 
        className="text-[25px] font-semibold text-secondary-black text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
      >
        {tNotFound('title')}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
      >
        <Button
          text={tNotFound('button.goHome')}
          variant="primary"
          onClick={handleClick}
        />
      </motion.div>
    </motion.div>
  )
}
