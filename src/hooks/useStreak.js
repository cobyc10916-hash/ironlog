import { useState } from 'react';

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastLogDate, setLastLogDate] = useState(null);

  const logToday = () => {
    const today = new Date().toDateString();
    if (lastLogDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newStreak = lastLogDate === yesterday ? streak + 1 : 1;
    setStreak(newStreak);
    setLongestStreak(prev => Math.max(prev, newStreak));
    setLastLogDate(today);
  };

  const resetStreak = () => {
    setStreak(0);
    setLastLogDate(null);
    // longestStreak is never decremented by a reset
  };

  return { streak, longestStreak, lastLogDate, logToday, resetStreak };
}
