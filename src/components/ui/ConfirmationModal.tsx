import { AlertTriangle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "rgb(var(--error))",
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg lg:rounded-[1vw] p-6 lg:p-[1.5vw] max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-4 lg:mb-[1vw]">
          <div className="w-16 h-16 lg:w-[4vw] lg:h-[4vw] rounded-full bg-primary/10 flex items-center justify-center">
            <AlertTriangle
              className="w-8 h-8 lg:w-[2vw] lg:h-[2vw]"
              style={{ color: confirmColor }}
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="font-size-24px font-poppins-regular text-text-primary text-center mb-2 lg:mb-[0.5vw]">
          {title}
        </h2>

        {/* Message */}
        <div className="font-size-18px font-poppins-regular text-text-secondary text-center mb-6 lg:mb-[1.5vw]">
          {message}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 lg:gap-[0.8vw]">
          {cancelText && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 lg:px-[1vw] lg:py-[0.5vw] bg-background hover:bg-primary/10 text-text-primary font-size-18px font-poppins-regular rounded-lg lg:rounded-[0.5vw] transition-colors border border-border"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 lg:px-[1vw] lg:py-[0.5vw] text-white font-size-18px font-poppins-regular rounded-lg lg:rounded-[0.5vw] transition-colors hover:opacity-90"
            style={{ backgroundColor: confirmColor }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

