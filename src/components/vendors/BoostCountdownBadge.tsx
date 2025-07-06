"use client";

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Rocket } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BoostCountdownBadgeProps {
  boostedUntil: string;
}

export default function BoostCountdownBadge({ boostedUntil }: BoostCountdownBadgeProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const expirationDate = new Date(boostedUntil);

    const calculateTimeLeft = () => {
      const now = new Date();
      if (expirationDate > now) {
        // We use formatDistanceToNow which is perfect for this "in X time" format
        setTimeLeft(formatDistanceToNow(expirationDate, { addSuffix: true }));
      } else {
        setTimeLeft('Expired');
      }
    };

    calculateTimeLeft();
    // Update the countdown every minute for live feedback
    const intervalId = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [boostedUntil]);

  if (timeLeft === 'Expired' || !timeLeft) {
    // Optionally render something else for expired boosts, or nothing.
    // For now, let's keep it consistent. The parent component will likely refetch and not show this.
    return (
        <Badge variant="secondary">Boost Expired</Badge>
    );
  }

  return (
    <Badge variant="default" className="bg-green-600 hover:bg-green-700 justify-center">
      <Rocket size={14} className="mr-1" />
      Boost expires {timeLeft}
    </Badge>
  );
}
