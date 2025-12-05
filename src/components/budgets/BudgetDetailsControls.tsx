// Imports
import { useRouter } from "@/i18n/routing";
import { MoreVertical, ChevronLeft } from "lucide-react";
// import components
import Button from "../ui-elements/Button";
import { useTranslations } from "next-intl";
import Dropdown from "../ui-elements/Dropdown";
import useDeviceType from "@/hooks/useDeviceType";

// Import types
import { BudgetDetailsControlsProps } from "../../types/types";
const BudgetDetailsControls = ({
  onDeleteClick,
  onEditClick,
}: BudgetDetailsControlsProps) => {
  const router = useRouter();
  const tBudgets = useTranslations("budgets");
  const { isMobile } = useDeviceType();

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <Button
        text={
          isMobile ? (
            <ChevronLeft className="w-6 h-6 text-primary" />
          ) : (
            tBudgets("details.controls.goToBudgets")
          )
        }
        className={isMobile ? "p-0 w-6 h-6" : "p-0 text-primary"}
        variant="ghost"
        onClick={() => router.push("/budgets")}
      />
      <div className="flex items-center">
        <Dropdown
          ariaLabel="More actions"
          buttonVariant="ghost"
          buttonSize="icon"
          buttonClassName={isMobile ? "h-6 w-6 p-0" : undefined}
          icon={<MoreVertical className={isMobile ? "h-6 w-6" : "h-4 w-4"} />}
          contentClassName={isMobile ? "w-[260px] p-1" : undefined}
          items={[
            {
              label: tBudgets("details.controls.editBudget"),
              onClick: onEditClick,
              className: isMobile ? "px-3 py-2 text-sm" : undefined,
            },
            {
              label: tBudgets("details.controls.deleteBudget"),
              onClick: onDeleteClick,
              destructive: true,
              className: isMobile ? "px-3 py-2 text-sm" : undefined,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default BudgetDetailsControls;
