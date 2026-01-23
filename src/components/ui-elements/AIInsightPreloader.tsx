import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

const AIInsightPreloader = () => {
  const t = useTranslations("ai_insight_loader");
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const steps = [
      { duration: 2000 }, // Step 1: 2 seconds
      { duration: 3000 }, // Step 2: 3 seconds  
      { duration: 2000 }, // Step 3: 2 seconds
    ];

    let timeoutId: NodeJS.Timeout;
    let totalElapsed = 0;

    const scheduleNextStep = (stepIndex: number) => {
      if (stepIndex >= steps.length) return;

      timeoutId = setTimeout(() => {
        setCurrentStep(stepIndex + 1);
        scheduleNextStep(stepIndex + 1);
      }, steps[stepIndex].duration);
    };

    scheduleNextStep(0);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const getStepText = () => {
    switch (currentStep) {
      case 0:
        return t("step1");
      case 1:
        return t("step2");
      case 2:
        return t("step3");
      default:
        return t("step3");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full py-12 space-y-4">
      {/* Blue Spinner */}
      <div className="flex items-center justify-center">
        <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
      
      {/* Sparkles Icon */}
      <Sparkles className="w-6 h-6 text-primary" />
      
      {/* Step Text */}
      <p className="text-sm text-muted-foreground text-center max-w-[200px] animate-pulse">
        {getStepText()}
      </p>
      
      {/* Progress Dots */}
      <div className="flex space-x-2">
        {[0, 1, 2].map((step) => (
          <div
            key={step}
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${
              step <= currentStep 
                ? "bg-primary" 
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default AIInsightPreloader;
