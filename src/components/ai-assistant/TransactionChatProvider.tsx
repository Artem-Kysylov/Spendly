'use client'

import { useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { TransactionChatWindow } from './TransactionChatWindow'
import { Button } from '@/components/ui/button'
import { MessageSquarePlus } from 'lucide-react'

export function TransactionChatProvider() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Floating button to open transaction chat */}
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 rounded-full w-14 h-14 shadow-lg"
                size="icon"
                title="Add transaction via AI"
            >
                <MessageSquarePlus className="w-6 h-6" />
            </Button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="right" className="p-0 overflow-hidden w-full sm:max-w-md" aria-labelledby="transaction-chat-title">
                    <TransactionChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
                </SheetContent>
            </Sheet>
        </>
    )
}
