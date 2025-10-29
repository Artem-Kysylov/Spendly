'use client'

import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import StepProgress from './StepProgress'
import Controls from './Controls'
import OnboardingStep from './OnboardingStep'
import { steps as data } from './steps'
import { useRouter } from '@/i18n/routing'
import { supabase } from '@/lib/supabaseClient'

export default function Onboarding() {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [idx, setIdx] = useState(0)

  const total = data.length
  const isFirst = idx === 0
  const isLast = idx === total - 1

  const current = useMemo(() => data[idx], [idx])

  const markCompleted = useCallback(async () => {
    try {
      await supabase.auth.updateUser({ data: { onboarding_completed: true } })
    } catch {}
  }, [])

  const handleSkip = useCallback(async () => {
    await markCompleted()
    router.push('/setup/budget')
  }, [markCompleted, router])

  const handleNext = useCallback(async () => {
    if (isLast) {
      await markCompleted()
      router.push('/payment')
      return
    }
    setIdx((v) => Math.min(v + 1, total - 1))
  }, [isLast, total, markCompleted, router])

  const handlePrev = useCallback(() => {
    setIdx((v) => Math.max(v - 1, 0))
  }, [])

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          handleSkip()
        } else {
          setOpen(true)
        }
      }}
    >
      <DialogContent
        className="w-[98vw] max-w-6xl p-8 sm:p-10 rounded-xl"
        overlayClassName="!bg-transparent dark:!bg-transparent !backdrop-blur-0"
      >
        <div className="flex flex-col">
          <div className="mb-6">
            <StepProgress total={total} current={idx} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <OnboardingStep
              key={current.id}
              title={current.title}
              description={current.description}
              image={current.image}
              stepIndex={idx}
            />
          </AnimatePresence>

          <Controls
            isFirst={isFirst}
            isLast={isLast}
            onPrev={handlePrev}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}