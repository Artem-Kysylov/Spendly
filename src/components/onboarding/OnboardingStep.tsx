'use client'

import { motion, useReducedMotion } from 'motion/react'

type Props = {
  title: string
  description: string
  image: string
  stepIndex: number
}

export default function OnboardingStep({ title, description, image, stepIndex }: Props) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      key={stepIndex}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{ willChange: 'opacity, transform' }}
      className="grid gap-8 sm:gap-10 sm:grid-cols-2 items-center"
    >
      <div className="order-2 sm:order-1">
        <h2 className="text-[28px] sm:text-[32px] font-semibold text-secondary-black">{title}</h2>
        <p className="mt-3 text-sm sm:text-base text-gray-600">{description}</p>
      </div>
      <div className="order-1 sm:order-2">
        <img
          src={image}
          alt="Onboarding visual"
          className="w-full max-w-[580px] rounded-md border border-gray-200 bg-white shadow-sm"
        />
      </div>
    </motion.div>
  )
}