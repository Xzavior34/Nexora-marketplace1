import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, HTMLMotionProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const springConfig = { type: "spring", stiffness: 400, damping: 30 };

    return (
      <motion.input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors shadow-sm hover:border-border",
          className,
        )}
        ref={ref as any}
        whileFocus={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={springConfig}
        {...(props as any)}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
