import { useState } from 'react'
import { UserAuth } from '../../context/AuthContext'

// Import components 
import TextInput from '../ui-elements/TextInput'
import Button from '../ui-elements/Button'
import BudgetPreset from '../ui-elements/BudgetPreset'

// Import types 
import { CreateMainBudgetProps } from '../../types/types'

const CreateMainBudget = ({ onSubmit }: CreateMainBudgetProps) => {
    const { signOut } = UserAuth()

    const [mainBudget, setMainBudget] = useState<string>('')
    const [selectedPreset, setSelectedPreset] = useState<string>('')

    const budgetPresets = [
        { value: '2000', title: '$2,000' },
        { value: '5000', title: '$5,000' },
        { value: '10000', title: '$10,000' },
        { value: '20000', title: '$20,000' },
    ]

    const handlePresetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSelectedPreset(value)
        setMainBudget(value)
    }

    const handleSubmit = () => {
        if (mainBudget) {
            onSubmit(mainBudget)
        }
    }

    const handleCancel = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        try {
            await signOut()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center gap-5 w-[630px]">
            <img src="/illustration-main-budget.svg" alt="main-budget" />
            <h2 className="text-[35px] font-semibold text-secondary-black">Let`s create your main budget</h2>
            <p className="text-secondary-black">Pick any convenient budget for you or type your custom value</p>
            <div className="flex gap-3 w-full">
                {budgetPresets.map((preset) => (
                    <BudgetPreset
                        key={preset.value}
                        value={preset.value}
                        currentValue={selectedPreset}
                        onChange={handlePresetChange}
                        title={preset.title}
                    />
                ))}
            </div>
            <TextInput 
                value={mainBudget}
                onChange={(e) => setMainBudget(e.target.value)}
                type="text"
                placeholder="Enter your main budget (USD)"
            />
            <div className='flex justify-center gap-3 w-full'>
                <Button 
                    variant='ghost'
                    text='Cancel' 
                    onClick={handleCancel}
                />
                <Button 
                    variant='default'
                    text="Create Main Budget"
                    onClick={handleSubmit}
                />
            </div>
        </div>
    )
}

export default CreateMainBudget