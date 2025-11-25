// AddTransactionProvider component
'use client'

import React, { useEffect } from 'react'
import useModal from '@/hooks/useModal'
import TransactionModal from '@/components/modals/TransactionModal'
import { useTranslations } from 'next-intl'

const AddTransactionProvider: React.FC = () => {
  const { isModalOpen, openModal, closeModal } = useModal()
  const t = useTranslations('transactions')

  useEffect(() => {
    const handler = () => openModal()
    window.addEventListener('transactions:add', handler)
    return () => window.removeEventListener('transactions:add', handler)
  }, [openModal])

  return isModalOpen ? (
    <TransactionModal
      title={t('modal.addTitle')}
      onClose={closeModal}
      onSubmit={(message, type) => {
        // Сообщить другим частям UI об обновлении (синхронизация графиков/счётчиков)
        if (type === 'success') {
          window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
        }
      }}
    />
  ) : null
}

export default AddTransactionProvider