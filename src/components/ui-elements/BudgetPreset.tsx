// Import types 
import { BudgetPresetProps } from "../../types/types"

const BudgetPreset = ({ value, currentValue, onChange, title }: BudgetPresetProps) => {
    const getStyles = () => {
        return currentValue === value 
            ? 'bg-primary text-white border-primary' 
            : 'light-grey text-secondary-black'
    }

    return (
        <label className={`cursor-pointer p-7 flex-1 rounded-lg border text-center font-medium transition-all ${getStyles()}`}>
            <input
                type="radio"
                name="budget"
                value={value}
                className="hidden"
                checked={currentValue === value}
                onChange={onChange}
            />
            {title}
        </label>
    )
}

export default BudgetPreset 