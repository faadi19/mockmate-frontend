import { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90 shadow-sm",
        outline:
          "border border-border text-text-primary hover:bg-primary/10",
        ghost: "hover:bg-primary/10 text-text-primary",
        link: "text-primary underline-offset-4 hover:underline p-0",
        destructive: "bg-error text-white hover:bg-error/90",
      },
      size: {
        sm: "px-3 font-size-16px lg:py-[0.5vw] lg:px-[0.5vw]",
        lg: "px-8 font-size-20px lg:py-[0.7vw] lg:px-[0.8vw]",
        icon: "p-2 font-size-20px lg:py-[0.5vw] lg:px-[0.5vw]",
        default: "py-2 px-4 font-size-18px lg:py-[0.5vw] lg:px-[0.5vw]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
  loading?: boolean;
  rounded?: boolean;
  icons?: ReactNode;
  iconsPosition?: "left" | "right";
}

const Button = ({
  className,
  variant,
  size,
  children,
  loading,
  rounded,
  icons,
  iconsPosition = "left",
  ...props
}: ButtonProps) => {
  return (
    <button
      className={twMerge(buttonVariants({ variant, size }), className, rounded && "rounded-full", 'flex items-center justify-center gap-2 lg:gap-[0.3vw]')}
      {...props}
    >
      {iconsPosition === "left" && icons} {children} {iconsPosition === "right" && icons}{" "}
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    </button>
  );
};

export default Button;