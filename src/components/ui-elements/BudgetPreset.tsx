// Import types
import { BudgetPresetProps } from "../../types/types";

const BudgetPreset = ({
  value,
  currentValue,
  onChange,
  title,
}: BudgetPresetProps) => {
  const getStyles = () => {
    return currentValue === value
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-secondary text-secondary-foreground border-border";
  };

  return (
    <label
      className={`cursor-pointer p-7 flex-1 rounded-lg border text-center font-medium transition-all ${getStyles()}`}
    >
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
  );
};

export default BudgetPreset;
