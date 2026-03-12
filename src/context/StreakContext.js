import { createContext, useContext, useState, useMemo, useRef } from 'react';

const StreakContext = createContext(null);

function pad2(n) { return String(n).padStart(2, '0'); }

// TODO: seed these from Supabase on app load
const INITIAL_SINCE = new Date(2026, 2, 8, 22, 0, 0); // March 8, 2026 at 10pm
const INITIAL_STREAK = 4;

export function StreakProvider({ children }) {
  const [streak, setStreak] = useState(INITIAL_STREAK);
  const [sinceDate, setSinceDate] = useState(INITIAL_SINCE);

  const longestStreakRef = useRef(INITIAL_STREAK);  // TODO: seed from Supabase profiles.longest_streak
  longestStreakRef.current = Math.max(longestStreakRef.current, streak);
  const longestStreak = longestStreakRef.current;

  // Clean days: one date string per full 24-hr period elapsed since sinceDate
  const cleanDays = useMemo(() => {
    const days = new Set();
    for (let i = 1; i <= streak; i++) {
      const d = new Date(sinceDate.getTime() + i * 86400000);
      days.add(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
    }
    return days;
  }, [sinceDate, streak]);

  return (
    <StreakContext.Provider value={{ streak, setStreak, sinceDate, setSinceDate, longestStreak, cleanDays }}>
      {children}
    </StreakContext.Provider>
  );
}

export function useStreakContext() {
  return useContext(StreakContext);
}
