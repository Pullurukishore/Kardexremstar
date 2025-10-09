"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value = [50], onValueChange, min = 0, max = 100, step = 1, disabled = false, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value[0] || 50);
    const sliderRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (value[0] !== undefined) {
        setInternalValue(value[0]);
      }
    }, [value]);

    const handleMouseDown = (e: React.MouseEvent) => {
      if (disabled || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newValue = Math.round((min + percent * (max - min)) / step) * step;
      
      setInternalValue(newValue);
      onValueChange?.([newValue]);
    };

    const percentage = ((internalValue - min) / (max - min)) * 100;

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <div
          ref={sliderRef}
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-200 cursor-pointer"
          onMouseDown={handleMouseDown}
        >
          <div 
            className="absolute h-full bg-purple-600 rounded-full"
            style={{ width: `${percentage}%` }}
          />
          <div
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 block h-5 w-5 rounded-full border-2 border-purple-600 bg-white shadow-lg cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider }
