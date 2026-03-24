"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
    thumbClassName?: string;
  }
>(({ className, thumbClassName, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-7 w-[63px] shrink-0 cursor-pointer items-center rounded-full border shadow-sm transition-all duration-200 ease-out",
      "border-primary bg-background data-[state=checked]:bg-primary data-[state=unchecked]:bg-background",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-7 rounded-full bg-primary shadow-[0_1px_2px_rgba(0,0,0,0.18)] transition-all duration-200 ease-out",
        "data-[state=checked]:translate-x-[30px] data-[state=checked]:bg-white data-[state=unchecked]:translate-x-1",
        thumbClassName,
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = "Switch";

export { Switch };
