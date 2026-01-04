import { InputHTMLAttributes, forwardRef, useState, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff, Calendar } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const isPassword = type === 'password';
    const isDate = type === 'date';
    const inputType = isPassword && showPassword ? 'text' : type;

    // Combine refs
    const combinedRef = (node: HTMLInputElement | null) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      inputRef.current = node;
    };

    const handleCalendarClick = () => {
      if (isDate && inputRef.current) {
        inputRef.current.showPicker?.() || inputRef.current.focus();
      }
    };

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={props.id}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            className={twMerge(
              "flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              "[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
              isPassword && "pr-10",
              isDate && "pr-10",
              error && "border-error focus:ring-error/35",
              className
            )}
            ref={combinedRef}
            type={inputType}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            >
              {showPassword ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          )}
          {isDate && (
            <button
              type="button"
              onClick={handleCalendarClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
            </button>
          )}
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;