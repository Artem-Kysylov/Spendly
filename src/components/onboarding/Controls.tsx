"use client";

import Button from "@/components/ui-elements/Button";
import { useRouter } from "@/i18n/routing";

type Props = {
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
};

export default function Controls({
  isFirst,
  isLast,
  onPrev,
  onNext,
  onSkip,
}: Props) {
  const router = useRouter();

  const handleUpgradeClick = () => {
    router.push("/paywall");
  };
  return (
    <div className="mt-8 flex items-center justify-between">
      {/* Левая часть: Back всегда в одном месте (кроме первого шага) */}
      <div className="flex items-center">
        {!isFirst && <Button variant="outline" text="Back" onClick={onPrev} />}
      </div>

      {/* Правая часть: Skip/Start for FREE + Next/Upgrade to Pro */}
      <div className="flex items-center gap-2">
        {!isLast ? (
          <Button
            variant="ghost"
            text="Skip tour"
            className="text-primary"
            onClick={onSkip}
          />
        ) : (
          <Button
            variant="ghost"
            text="Start for FREE"
            className="text-primary"
            onClick={onSkip}
          />
        )}

        {!isLast ? (
          <Button variant="default" text="Next" onClick={onNext} />
        ) : (
          <Button variant="default" text="Upgrade to Pro" onClick={handleUpgradeClick} />
        )}
      </div>
    </div>
  );
}
