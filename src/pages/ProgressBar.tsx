import React from "react";

interface ProgressBarProps {
  value: number;
  max: number;
  colorClass: string; // You can pass any color class (e.g., bg-primary)
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, colorClass }) => {
  const percentage = (value / max) * 100;

  return (
    <div className="relative w-full h-2 bg-gray-300 rounded-full">
      <div
        className={`${colorClass} h-full rounded-full`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;
