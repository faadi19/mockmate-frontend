import React from "react";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ContentHeaderProps {
  title?: string;
  description?: string;
  backButton?: boolean | React.ReactNode;
  sideButtons?: React.ReactNode;
  onBackButtonClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  sticky?: boolean;
}

const ContentHeader = ({
  title,
  description,
  backButton,
  sideButtons,
  onBackButtonClick,
  sticky = true,
}: ContentHeaderProps) => {
  const navigate = useNavigate();
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between pb-1.5 lg:pb-[0.75vw] pt-3 lg:pt-[1.7vw] mb-1.5 lg:mb-[0.75vw] max-w-full ${sticky ? 'sticky top-0 bg-background z-10' : ''}`}>
      <div className="flex gap-1 lg:gap-[0.5vw] min-w-0 flex-1">
        {backButton && (
          <button
            onClick={(e) =>
              onBackButtonClick ? onBackButtonClick(e) : navigate(-1)
            }
            className="hover:bg-primary/10 rounded-full transition-all aspect-square w-[40px] lg:w-[2vw] h-[40px] lg:h-[2vw] flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex flex-col gap-1 lg:gap-[0.5vw] min-w-0">
          {title && (
            <h1 className="font-size-40px font-poppins-semibold leading-none break-words">{title}</h1>
          )}
          {description && (
            <p className="text-text-secondary font-size-20px font-poppins-regular leading-none break-words">
              {description}
            </p>
          )}
        </div>
      </div>
      {sideButtons && <div className="flex-shrink-0 mt-2 md:mt-0">{sideButtons}</div>}
    </div>
  );
};

export default ContentHeader;
