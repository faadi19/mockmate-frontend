import { InputHTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelIcon?: React.ReactNode;
  error?: string;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className, label, error, labelIcon, ...props }, ref) => {
    return (
      <div className="space-y-1.5 lg:space-y-[0.6vw] bg-card border border-border p-3 lg:p-[1vw] rounded-md lg:rounded-[1vw]">
        {label && (
          <div className="flex items-center gap-1 lg:gap-[0.5vw]">
            {labelIcon && (
              <div className="w-[30px] lg:w-[1.8vw] flex items-center justify-center">{labelIcon}</div>
            )}
            <label
              htmlFor={props.id}
              className="font-size-24px font-poppins-bold leading-none text-text-secondary"
            >
              {label}
            </label>
          </div>
        )}
        <input
          className={twMerge(
            "flex h-10 lg:h-[2.5vw] px-3 lg:px-[0.8vw] max-h-[50px] font-size-20px w-full rounded-md bg-background text-text-primary placeholder:text-text-secondary/70 border border-border focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-error focus:ring-error/35",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }
);

InputField.displayName = "InputField";

export default InputField;
