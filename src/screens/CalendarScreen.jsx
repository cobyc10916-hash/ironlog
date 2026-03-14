import { useState, useMemo, useEffect } from 'react';
import { useStreakContext } from '../context/StreakContext';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CalendarGrid, { GRID_WIDTH } from '../components/CalendarGrid';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';
import { supabase } from '../lib/supabase';

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// App start: March 2026 — navigation cannot go earlier than this
const APP_START = { year: 2026, month: 3 };

// Module-level cache — survives unmount/remount within an app session.
// Eliminates the hollow-square flash on every calendar visit after the first.
let _cachedJoinDate    = null;
let _cachedCleanDays   = null;
let _cachedRelapseDays = null;

export default function CalendarScreen({ navigation }) {
  const { cleanDays, joinDateString: ctxJoinDateString, relapseDays: ctxRelapseDays } = useStreakContext();
  const now = new Date();
  const todayString = getTodayStr();

  const [relapseDays, setRelapseDays] = useState(() => _cachedRelapseDays ?? ctxRelapseDays);
  const [localCleanDays, setLocalCleanDays] = useState(() => _cachedCleanDays);
  const [joinDateString, setJoinDateString] = useState(() => _cachedJoinDate ?? ctxJoinDateString);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const [
          { data: relapseData,  error: relapseError  },
          { data: profileData,  error: profileError  },
          { data: streakData,   error: streakError   },
        ] = await Promise.all([
          supabase.from('resets').select('reset_at, historical_date').eq('user_id', user.id),
          supabase.from('profiles').select('install_date').eq('id', user.id).single(),
          supabase.from('streaks').select('streak_start_date, current_streak').eq('user_id', user.id).single(),
        ]);

        if (relapseError) {
          console.error('CALENDAR_FETCH_ERROR (resets):', relapseError);
        } else {
          const dates = (relapseData || []).map(row => {
            const src = row.historical_date || row.reset_at;
            if (!src) return null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return src;
            const d = new Date(src);
            return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
          }).filter(Boolean);
          _cachedRelapseDays = new Set(dates);
          setRelapseDays(_cachedRelapseDays);
        }

        if (profileError) {
          console.error('CALENDAR_FETCH_ERROR (profiles):', profileError);
        } else if (profileData?.install_date) {
          _cachedJoinDate = profileData.install_date;
          setJoinDateString(_cachedJoinDate);
        }

        if (streakError) {
          console.error('CALENDAR_FETCH_ERROR (streaks):', streakError);
          _cachedCleanDays = new Set();
          setLocalCleanDays(_cachedCleanDays);
        } else if (streakData?.streak_start_date) {
          const [sy, sm, sd] = streakData.streak_start_date.slice(0, 10).split('-').map(Number);
          const sinceDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
          const streak = streakData.current_streak ?? 0;
          const days = new Set();
          for (let i = 1; i <= streak; i++) {
            const d = new Date(sinceDate.getTime() + i * 86400000);
            days.add(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
          }
          _cachedCleanDays = days;
          setLocalCleanDays(_cachedCleanDays);
        } else {
          _cachedCleanDays = new Set();
          setLocalCleanDays(_cachedCleanDays);
        }
      } catch (err) {
        console.error('CALENDAR_FETCH_ERROR:', err);
        _cachedCleanDays = new Set();
        setLocalCleanDays(_cachedCleanDays);
      }
    })();
  }, []);

  const [viewDate, setViewDate] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const { year: viewYear, month: viewMonth } = viewDate;

  const atStart = viewYear === APP_START.year && viewMonth === APP_START.month;
  const atEnd = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;

  const goToPrev = () => {
    if (atStart) return;
    setViewDate(({ year, month }) =>
      month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
    );
  };

  const goToNext = () => {
    if (atEnd) return;
    setViewDate(({ year, month }) =>
      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
    );
  };

  const monthLabel = useMemo(
    () => `${MONTH_NAMES[viewMonth - 1]} ${viewYear}`,
    [viewYear, viewMonth]
  );

  return (
    <SafeAreaView style={styles.root}>

      {/* Back to Home */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={26} color={colors.white} />
      </TouchableOpacity>

      {/* Header block — flows from top, paddingTop sets vertical position */}
      <View style={styles.headerBlock}>

        <Text style={styles.headerLabel}>DAYS CHECKED IN</Text>

        {/* Fixed-height nav row — month text only, no arrows */}
        <View style={styles.monthNavRow}>
          <Text style={styles.headerMonth}>{monthLabel}</Text>
        </View>

        {/* Divider — marginBottom closes the gap to the grid */}
        <View style={styles.divider} />
      </View>

      {/* Grid — follows directly in flex-start flow; horizontally centered */}
      <View style={styles.gridContainer}>
        <CalendarGrid
          year={viewYear}
          month={viewMonth}
          cleanDays={localCleanDays ?? cleanDays}
          relapseDays={relapseDays}
          todayString={todayString}
          joinDateString={joinDateString}
        />
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCell, styles.legendCellSolid]} />
          <Text style={styles.legendLabel}>CLEAN</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCell, styles.legendCellHollow]}>
            <MaterialCommunityIcons name="skull" size={Math.round(LEGEND_SIZE * 0.52)} color={colors.white} />
          </View>
          <Text style={styles.legendLabel}>RELAPSE</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCell, styles.legendCellHollow]} />
          <Text style={styles.legendLabel}>NOT CHECKED IN</Text>
        </View>
      </View>

      {/* Circular nav buttons — below grid */}
      <View style={styles.navRow}>
        {!atStart ? (
          <TouchableOpacity
            style={styles.navCircle}
            onPress={goToPrev}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navCirclePlaceholder} />
        )}

        {!atEnd ? (
          <TouchableOpacity
            style={styles.navCircle}
            onPress={goToNext}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navCirclePlaceholder} />
        )}
      </View>

    </SafeAreaView>
  );
}

const LEGEND_SIZE = 18;

const styles = StyleSheet.create({
  // flex-start column — header and grid stack naturally, no centering gap
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  backBtn: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
  },

  // paddingTop shifts the entire cluster toward mid-screen
  headerBlock: {
    paddingTop: 160,
    alignItems: 'center',
  },

  headerLabel: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.white,
    opacity: 0.7,
    letterSpacing: 4,
    marginBottom: 6,
  },

  monthNavRow: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerMonth: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.white,
    letterSpacing: 5,
    textAlign: 'center',
  },

  // Nav row: absolutely pinned to bottom — never shifts with grid row count
  navRow: {
    position: 'absolute',
    bottom: 140,
    width: '100%',
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  navCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Invisible placeholder keeps spacing symmetric when one button is hidden
  navCirclePlaceholder: {
    width: 50,
    height: 50,
  },

  divider: {
    width: GRID_WIDTH,
    height: 0.5,
    backgroundColor: colors.white,
    opacity: 0.3,
    marginBottom: 15,
  },

  // No flex:1, no justifyContent — grid sits immediately below divider
  gridContainer: {
    alignItems: 'center',
  },

  // Absolutely pinned — never shifts with grid row count
  legendRow: {
    position: 'absolute',
    bottom: 50,
    width: GRID_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    opacity: 0.4,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  legendCell: {
    width: LEGEND_SIZE,
    height: LEGEND_SIZE,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  legendCellSolid: {
    backgroundColor: colors.white,
  },

  legendCellHollow: {
    borderWidth: 1,
    borderColor: colors.white,
  },

  legendLabel: {
    fontFamily: fonts.display,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.5,
  },
});
