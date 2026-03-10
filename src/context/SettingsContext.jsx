import { createContext, useContext, useState, useEffect, useMemo } from 'react';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  // intensity: 'normal' | 'extreme' | null
  const [intensity, setIntensity] = useState(null);

  // time state: indices into HOURS / MINUTES / PERIODS arrays from Notifications.jsx
  const [morningTime, setMorningTime] = useState({ hourIdx: 7, minuteIdx: 0, periodIdx: 0 }); // 8:00 AM
  const [dangerFrom,  setDangerFrom]  = useState({ hourIdx: 8, minuteIdx: 0, periodIdx: 1 }); // 9:00 PM
  const [dangerTo,    setDangerTo]    = useState({ hourIdx: 10, minuteIdx: 0, periodIdx: 1 }); // 11:00 PM

  // isReady: false until the first effect tick completes.
  // Keeps App.js on the black void screen until all initial state is settled.
  // Swap the useEffect body for AsyncStorage/Supabase hydration when ready.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Future: await AsyncStorage.getItem(...) or Supabase fetch here
    setIsReady(true);
  }, []);

  // Stable context value — only changes when individual fields change,
  // not on every provider render
  const value = useMemo(() => ({
    isReady,
    intensity,    setIntensity,
    morningTime,  setMorningTime,
    dangerFrom,   setDangerFrom,
    dangerTo,     setDangerTo,
  }), [isReady, intensity, morningTime, dangerFrom, dangerTo]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
