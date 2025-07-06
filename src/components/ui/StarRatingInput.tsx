
"use client";

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have this utility

interface StarRatingInputProps {
  count?: number;
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  className?: string;
  starClassName?: string;
  disabled?: boolean;
}

export default function StarRatingInput({
  count = 5,
  value = 0,
  onChange,
  size = 24,
  className,
  starClassName = 'text-accent cursor-pointer',
  disabled = false,
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | undefined>(undefined);

  const stars = Array(count).fill(0);

  const handleClick = (newValue: number) => {
    if (!disabled) {
      onChange(newValue);
    }
  };

  const handleMouseOver = (newHoverValue: number) => {
    if (!disabled) {
      setHoverValue(newHoverValue);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoverValue(undefined);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {stars.map((_, index) => {
        const starValue = index + 1;
        const isActive = (hoverValue || value) >= starValue;
        return (
          <Star
            key={index}
            size={size}
            className={cn(
              starClassName,
              isActive ? 'fill-current' : 'fill-transparent',
              disabled ? 'cursor-not-allowed opacity-70' : ''
            )}
            onClick={() => handleClick(starValue)}
            onMouseOver={() => handleMouseOver(starValue)}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
    </div>
  );
}
