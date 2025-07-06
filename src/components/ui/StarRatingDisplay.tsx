
"use client";

import { Star, StarHalf } from 'lucide-react';

interface StarRatingDisplayProps {
  rating: number;
  totalStars?: number;
  size?: number;
  className?: string;
  showText?: boolean;
  reviewCount?: number;
}

export default function StarRatingDisplay({
  rating,
  totalStars = 5,
  size = 16,
  className = 'text-accent',
  showText = false,
  reviewCount,
}: StarRatingDisplayProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = totalStars - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} fill="currentColor" size={size} className="stroke-current" />
      ))}
      {hasHalfStar && <StarHalf key="half" fill="currentColor" size={size} className="stroke-current" />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={size} className="stroke-current" />
      ))}
      {showText && reviewCount !== undefined && (
         <span className="ml-1 text-xs text-muted-foreground">
            ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  );
}

// Helper to get cn if not available
const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');
