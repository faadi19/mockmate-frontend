import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  Edit,
  EyeIcon,
  EyeOffIcon,
  Loader2,
  XIcon,
} from "lucide-react";

interface CustomInputProps {
  label: string;
  value: string;
  onSave: (value: string) => Promise<void> | void;
  loading?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  type?: "text" | "password";
}

const CustomInput = ({
  label,
  value,
  onSave,
  loading = false,
  readOnly = false,
  placeholder = "Enter here...",
  type = "text",
}: CustomInputProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // 👇 FIXED: keep internal inputType separate so show/hide works
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
    setIsEditing(false);
  }, [value]);

  const handleSave = async () => {
    await onSave(inputValue);
    setIsEditing(false);
  };

  const actualType =
    type === "password"
      ? isPasswordVisible
        ? "text"
        : "password"
      : type;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-text-secondary font-medium">{label}</label>

      <div className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-full">
        <input
          ref={inputRef}
          type={actualType}
          readOnly={!isEditing || readOnly}
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-secondary/70"
        />

        {/* 👇 FIXED: Show/hide toggle works ANYTIME during editing */}
        {type === "password" && isEditing && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            {isPasswordVisible ? (
              <EyeOffIcon className="text-primary" />
            ) : (
              <EyeIcon className="text-primary" />
            )}
          </button>
        )}

        {/* EDIT / CANCEL BUTTON */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                setInputValue(value); // reset
                setIsEditing(false);
              } else {
                setIsPasswordVisible(false); // reset visibility on edit
                inputRef.current?.focus();
                setIsEditing(true);
              }
            }}
          >
            {isEditing ? (
              <XIcon className="text-red-400" />
            ) : (
              <Edit className="text-primary" />
            )}
          </button>
        )}

        {/* SAVE BUTTON */}
        {isEditing && (
          <button type="button" onClick={handleSave}>
            {loading ? (
              <Loader2 className="animate-spin text-primary" />
            ) : (
              <CheckIcon className="text-green-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default CustomInput;
