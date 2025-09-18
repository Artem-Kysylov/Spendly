'use client'

// Imports 
import { UserAuth } from '@/context/AuthContext'
import useModal from '@/hooks/useModal'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

// Import components 
import Button from "@/components/ui-elements/Button"
import SignOutModal from '@/components/modals/SignOutModal'

const TopBar = () => {
    const { session, signOut } = UserAuth()
    const { isModalOpen, openModal, closeModal } = useModal()
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
            <div className="mx-auto px-5 h-16 flex items-center justify-between">
                <Image src="/Spendly-logo.svg" alt="logo" width={100} height={100} />
                <nav>
                    <ul className="flex items-center gap-6 list-none">
                        <li>
                            <Link
                                href="/dashboard"
                                className={`font-medium transition-colors duration-300 hover:text-primary ${
                                    pathname === '/dashboard' ? 'text-primary' : 'text-secondary-black'
                                }`}
                            >
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/transactions"
                                className={`font-medium transition-colors duration-300 hover:text-primary ${
                                    pathname === '/transactions' ? 'text-primary' : 'text-secondary-black'
                                }`}
                            >
                                Transactions
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/budgets"
                                className={`font-medium transition-colors duration-300 hover:text-primary ${
                                    pathname === '/budgets' ? 'text-primary' : 'text-secondary-black'
                                }`}
                            >
                                Budgets
                            </Link>
                        </li>
                    </ul>
                </nav>
                <div className="flex items-center gap-2">
                    {session?.user?.user_metadata?.avatar_url && (
                        <div className="avatar flex items-center justify-center bg-white">
                            <div className="w-10 h-10 rounded-full overflow-hidden">
                                <img 
                                    className="w-full h-full object-cover"
                                    src={session.user.user_metadata.avatar_url}
                                    alt='user-avatar'
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        </div>
                    )}
                    <Button
                        text='Signout'
                        variant="ghost"
                        className='text-primary p-0'
                        onClick={openModal}
                    />
                </div>
            </div>
            {isModalOpen && (
                <SignOutModal 
                    title="Sign Out"
                    text="Are you sure you want to sign out?"
                    onClose={closeModal}
                    signOut={signOut}
                />
            )}
        </header>
    )
}

export default TopBar