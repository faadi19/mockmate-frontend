import { twMerge } from 'tailwind-merge';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  className?: string;
  colorClass?: string;
}

const ProgressBar = ({
  value,
  max,
  label,
  className,
  colorClass = 'bg-primary',
}: ProgressBarProps) => {
  const percentage = (value / max) * 100;
  
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">{label}</span>
          <span className="text-sm font-semibold text-text-primary">{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className={twMerge("h-2 w-full overflow-hidden rounded-full bg-border", className)}>
        <div
          className={twMerge("h-full transition-all duration-300", colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;