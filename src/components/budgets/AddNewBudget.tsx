// imports
import { useTranslations } from "next-intl";
import useDeviceType from "@/hooks/useDeviceType";
import ProLockLabel from "../free/ProLockLabel";

function AddNewBudget({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  const tBudgets = useTranslations("budgets");
  const { isDesktop } = useDeviceType();
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`relative flex items-center justify-center gap-2 border border-primary rounded-lg w-full ${isDesktop ? "h-[200px]" : "h-[60px]"} bg-card transition-colors duration-300 group ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer md:hover:bg-primary"}`}
    >
      <span
        className={`text-2xl transition-colors duration-300 ${disabled ? "text-primary" : "text-primary md:group-hover:text-primary-foreground"}`}
      >
        +
      </span>
      <p
        className={`font-semibold transition-colors duration-300 ${disabled ? "text-primary" : "text-primary md:group-hover:text-primary-foreground"}`}
      >
        {tBudgets("list.card.createNew")}
      </p>
      {disabled && <ProLockLabel className="absolute top-2 right-2" />}
    </button>
  );
}

export default AddNewBudget;
