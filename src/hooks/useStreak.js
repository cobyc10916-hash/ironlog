import { useState, useEffect } from 'react';

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [lastLogDate, setLastLogDate] = useState(null);

  const logToday = () => {
    const today = new Date().toDateString();
    if (lastLogDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    setStreak(prev => (lastLogDate === yesterday ? prev + 1 : 1));
    setLastLogDate(today);
  };

  const resetStreak = () => {
    setStreak(0);
    setLastLogDate(null);
  };

  return { streak, lastLogDate, logToday, resetStreak };
}
