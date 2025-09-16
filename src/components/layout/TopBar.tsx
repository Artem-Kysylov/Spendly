// Imports 
import { UserAuth } from '../../context/AuthContext'
import { useLocation } from 'react-router-dom'
import useModal from '../../hooks/useModal'
import { Link } from 'react-router-dom'

// Import components 
import Button from "../ui-elements/Button"
import SignOutModal from '../modals/SignOutModal'

const TopBar = () => {
    const location = useLocation()
    // Hooks
    const { isModalOpen, openModal, closeModal } = useModal()

    const { session, signOut } = UserAuth()

    return (
        <>
            {isModalOpen && (
                <SignOutModal 
                    title="Signout"
                    text="Are you sure you want to signout?"
                    onClose={closeModal}
                    signOut={signOut}
                    />
                )}
            <div className="flex justify-between items-center p-5 border-b light-grey">
                <div className="flex items-center">
                    <img 
                        src="/Spendly-logo.svg" 
                        alt="Spendly Logo" 
                        className="h-6 w-auto"
                    />
                </div>

                <nav>
                    <ul className="flex items-center gap-8">
                        <li>
                            <Link 
                                to="/dashboard" 
                                className={`font-medium transition-colors duration-300 hover:text-primary ${
                                    location.pathname === '/dashboard' 
                                    ? 'text-primary' 
                                    : 'text-secondary-black'
                                }`}
                            >
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link 
                                to="/transactions" 
                                className={`font-medium transition-colors duration-300 hover:text-primary ${
                                    location.pathname === '/transactions' 
                                    ? 'text-primary' 
                                    : 'text-secondary-black'
                                }`}
                            >
                                Transactions
                            </Link>
                        </li>
                        <li>
                            <Link 
                                to="/budgets" 
                                className={`font-medium transition-colors duration-300 hover:text-primary ${
                                    location.pathname === '/budgets' 
                                    ? 'text-primary' 
                                    : 'text-secondary-black'
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
                        className='btn-ghost text-primary p-0'
                        onClick={openModal}
                    />
                </div>
            </div>
        </>
    )
}

export default TopBar