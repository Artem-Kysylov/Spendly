'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import Button from '@/components/ui-elements/Button'
import ToastMessage from '@/components/ui-elements/ToastMessage'
import type { ToastMessageProps } from '@/types/types'

export default function Payment() {
  const [toast, setToast] = useState<ToastMessageProps | null>(null)

  const handleUpgradeClick = () => {
    setToast({ text: 'Payments are coming soon via Lemon Squeezy.', type: 'success' })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="container mx-auto px-4 py-10">
      {toast && <ToastMessage text={toast.text} type={toast.type} />}

      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <h1 className="text-[28px] md:text-[34px] font-semibold text-secondary-black dark:text-white">
          Upgrade to Pro
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Choose the plan that fits your needs. Billing will be powered by Lemon Squeezy.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Free Plan */}
        <motion.div
          className="rounded-lg border border-gray-200 dark:border-border p-6 bg-white dark:bg-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          <h3 className="font-medium text-secondary-black dark:text-white">Free</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Everything to get started</p>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-secondary-black dark:text-white">$0</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">per month</div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-white">
            <li>• Track expenses and budgets</li>
            <li>• Basic charts and insights</li>
            <li>• Local device notifications</li>
          </ul>
        </motion.div>

        {/* Pro Plan */}
        <motion.div
          className="rounded-lg border border-primary dark:border-primary p-6 bg-primary/5 dark:bg-primary/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
        >
          <h3 className="font-medium text-secondary-black dark:text-white">Pro</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Power features for growth</p>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-secondary-black dark:text-white">$5</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">per month</div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-800 dark:text-white">
            <li>• Unlimited AI assistant usage</li>
            <li>• Advanced charts and comparisons</li>
            <li>• Priority support</li>
            <li>• Custom goals and alerts</li>
            <li>• Early access to new features</li>
          </ul>
          <div className="mt-5">
            <Button
              text="Upgrade to Pro"
              variant="primary"
              onClick={handleUpgradeClick}
            />
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
              Lemon Squeezy integration — coming soon.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}