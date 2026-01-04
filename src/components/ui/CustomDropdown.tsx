import { ChevronDown } from "lucide-react";
import { FC, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

export interface Options {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomDropdownProps {
  label?: string;
  labelIcon?: React.ReactNode;
  error?: string;
  options: Options[];
  onOptionChange: (options: Options[]) => void;
  value?: Options[];
  disabled?: boolean;
  id?: string;
  className?: string;
  dropdownPosition?: "bottom" | "top";
  multiple?: boolean;
  placeholder?: string;
}

const CustomDropdown: FC<CustomDropdownProps> = ({
  className,
  label,
  error,
  labelIcon,
  options,
  onOptionChange,
  value = [],
  disabled,
  id,
  dropdownPosition = "bottom",
  placeholder = "Select an option",
  multiple = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownPositionClass = dropdownPosition === "bottom" ? "top-full mt-1" : "bottom-full mb-1";

  const dpArrowClass = dropdownPosition === "bottom" ? showDropdown ? "scale-y-[-1]" : "" : showDropdown ? "scale-y-[-1]" : "scale-y-[1]";

  const handleOptionClick = (option: Options) => {
    if (multiple) {
      if (value.some((v) => v.value === option.value)) {
        onOptionChange([...value.filter((v) => v.value !== option.value)]);
      } else {
        onOptionChange([...value, option]);
      }
    } else {
      onOptionChange([option]);
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
        if (showDropdown) {
            setShowDropdown(false);
        }
    };
    window.addEventListener("click", handleClickOutside);
    return () => {
        window.removeEventListener("click", handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <div className="space-y-1.5 lg:space-y-[0.6vw] bg-card border border-border p-3 lg:p-[1vw] rounded-md lg:rounded-[1vw]">
      {label && (
        <div className="flex items-center gap-1 lg:gap-[0.5vw]">
          {labelIcon && (
            <div className="w-[30px] lg:w-[1.8vw] flex items-center justify-center">
              {labelIcon}
            </div>
          )}
          <label
            htmlFor={id}
            className="font-size-24px font-poppins-bold leading-none text-text-secondary"
          >
            {label}
          </label>
        </div>
      )}
      <div className="relative">
        <button
          className={twMerge(
            "flex h-10 lg:h-[2.5vw] px-3 lg:px-[0.8vw] max-h-[50px] font-size-20px w-full rounded-md bg-background text-text-primary placeholder:text-text-secondary/70 border border-border focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-error focus:ring-error/35",
            className
          )}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          disabled={disabled}
        >
          <div className="flex items-center gap-1 lg:gap-[0.5vw] flex-1 overflow-x-auto relative">
            {value.length > 0 ? value.map((option) => option.label).join(", ") : <span className="text-text-secondary/70">{placeholder}</span>}
          </div>
          <div className="w-fit flex items-center justify-center">
            <ChevronDown className={twMerge("size-5 lg:size-[1.5vw] text-text-secondary transition-transform duration-300", dpArrowClass)} />
          </div>
        </button>
        {showDropdown && (
          <div className={twMerge("absolute left-0 z-10 w-full bg-card border border-border rounded-md shadow-lg", dropdownPositionClass)}>
            {options.map((option) => (
              <div
                key={option.value}
                className={twMerge(
                  "px-3 py-2 lg:py-[0.5vw] text-text-secondary hover:text-text-primary cursor-pointer font-size-16px font-poppins-regular",
                  value.some((v) => v.value === option.value) ? "bg-primary/10 text-text-primary" : "hover:bg-primary/10"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick(option);
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
};

export default CustomDropdown;
