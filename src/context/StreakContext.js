import { createContext, useContext, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BADGE_DATA } from '../constants/badges';

const StreakContext = createContext(null);
const SHOWN_MILESTONES_KEY = '@ironlog_shown_milestones';

function pad2(n) { return String(n).padStart(2, '0'); }

const INITIAL_SINCE = new Date();
const INITIAL_STREAK = null;

// All badge day thresholds trigger the HomeScreen overlay
const OVERLAY_MILESTONE_VALUES = new Set(BADGE_DATA.map(b => b.days));

export function StreakProvider({ children }) {
  const [streak, setStreak] = useState(INITIAL_STREAK);
  const [sinceDate, setSinceDate] = useState(INITIAL_SINCE);
  const [pendingMilestone, setPendingMilestone] = useState(null);

  // Persisted shown set — loaded from AsyncStorage on mount so overlays never re-show after app restarts.
  const shownMilestonesRef = useRef(new Set());
  const [milestonesLoaded, setMilestonesLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SHOWN_MILESTONES_KEY)
      .then(val => {
        if (val) shownMilestonesRef.current = new Set(JSON.parse(val));
      })
      .catch(() => {})
      .finally(() => setMilestonesLoaded(true));
  }, []);

  const [longestStreak, setLongestStreak] = useState(INITIAL_STREAK);
  const [joinDateString, setJoinDateString] = useState(null);
  const [relapseDays, setRelapseDays] = useState(new Set());

  const cleanDays = useMemo(() => {
    const days = new Set();
    for (let i = 1; i <= streak; i++) {
      const d = new Date(sinceDate.getTime() + i * 86400000);
      days.add(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
    }
    return days;
  }, [sinceDate, streak]);

  // Queue a milestone overlay when streak hits an overlay milestone value.
  // Gated on milestonesLoaded so the persisted shown set is checked before triggering.
  useEffect(() => {
    if (!milestonesLoaded) return;
    if (!OVERLAY_MILESTONE_VALUES.has(streak)) return;
    if (shownMilestonesRef.current.has(streak)) return;
    setPendingMilestone(streak);
  }, [streak, milestonesLoaded]);

  // Call when HomeScreen (or BadgeScreen) has consumed/dismissed the milestone.
  // Synchronously clears pendingMilestone, marks it shown, and persists to AsyncStorage.
  const clearPendingMilestone = useCallback((milestoneValue) => {
    const val = milestoneValue ?? pendingMilestone;
    if (val == null) return;
    shownMilestonesRef.current.add(val);
    setPendingMilestone(null);
    AsyncStorage.setItem(SHOWN_MILESTONES_KEY, JSON.stringify([...shownMilestonesRef.current])).catch(() => {});
  }, [pendingMilestone]);

  return (
    <StreakContext.Provider value={{
      streak, setStreak,
      sinceDate, setSinceDate,
      longestStreak, setLongestStreak,
      joinDateString, setJoinDateString,
      relapseDays, setRelapseDays,
      cleanDays,
      pendingMilestone,
      clearPendingMilestone,
    }}>
      {children}
    </StreakContext.Provider>
  );
}

export function useStreakContext() {
  return useContext(StreakContext);
}
