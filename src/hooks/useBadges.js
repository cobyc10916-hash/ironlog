import { useState, useEffect } from 'react';
import { badges as badgeDefinitions } from '../constants/badges';

export function useBadges(streak = 0) {
  const [earned, setEarned] = useState([]);

  useEffect(() => {
    const unlocked = badgeDefinitions.filter(b => streak >= b.days);
    setEarned(unlocked);
  }, [streak]);

  return { earned };
}
