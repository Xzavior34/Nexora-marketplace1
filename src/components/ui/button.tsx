import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-brand text-brand-foreground hover:bg-brand/90 shadow-md hover:shadow-stripe",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md",
        outline: "border border-border bg-transparent text-foreground hover:bg-secondary hover:text-secondary-foreground shadow-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-brand underline-offset-4 hover:underline",
        // Custom variants
        gold: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md hover:shadow-stripe font-bold",
        hero: "bg-brand text-brand-foreground hover:bg-brand/90 px-8 py-6 text-base shadow-lg hover:shadow-stripe",
        "hero-outline": "border border-border bg-background/50 text-foreground hover:bg-background/80 px-8 py-6 text-base backdrop-blur-sm shadow-sm",
        "gold-hero": "bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-6 text-base font-bold shadow-lg hover:shadow-stripe",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-4",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const springConfig = { type: "spring", stiffness: 400, damping: 30 };

    if (asChild) {
      return <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref as any} {...props} />;
    }

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref as any}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={springConfig}
        {...(props as any)}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
