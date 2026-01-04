import { useEffect, useState, useRef, SetStateAction, Dispatch } from "react";

const calculateMinHeight = (
  boxWrapperRef: React.RefObject<HTMLDivElement> | undefined,
  setMinHeight: Dispatch<SetStateAction<string | number>>
) => {
  console.log("boxWrapperRef", boxWrapperRef);
  let padding = 16;
  if (window && window.innerWidth > 1024) {
    padding = window.innerWidth * 0.013;
  }

  if (boxWrapperRef?.current) {
    let offsetTop = boxWrapperRef.current.offsetTop;
    let windowHeight = window.innerHeight;
    let height = windowHeight - offsetTop - padding;
    setMinHeight?.(height);
  }
};

/**
 * Custom hook to manage minimum height calculation for responsive components
 *
 * @returns {Object} - Object containing minHeight value and ref to attach to element
 * @returns {string | number} minHeight - Calculated minimum height
 * @returns {React.RefObject<HTMLDivElement>} ref - Ref to attach to the target element
 *
 * @example
 * const { minHeight, ref } = useMinimumHeight()
 *
 * return (
 *   <div ref={ref} style={{ minHeight }}>
 *     Content
 *   </div>
 * )
 */
export const useMinimumHeight = () => {
  const [minHeight, setMinHeight] = useState<string | number>("auto");
  const ref = useRef<HTMLDivElement>(null);

  // Calculate initial height
  useEffect(() => {
    if (ref?.current) {
      calculateMinHeight(ref as React.RefObject<HTMLDivElement>, setMinHeight);
    }
  }, [ref?.current]);

  // Add resize listener
  useEffect(() => {
    const handleResize = () => {
      if (ref?.current) {
        calculateMinHeight(
          ref as React.RefObject<HTMLDivElement>,
          setMinHeight
        );
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return { minHeight, ref };
};
