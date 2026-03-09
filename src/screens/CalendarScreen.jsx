import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CalendarGrid, { GRID_WIDTH } from '../components/CalendarGrid';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

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

function buildMockData() {
  const clean = new Set();
  const relapse = new Set();

  // February: Feb 16–20 clean
  for (let d = 16; d <= 20; d++) clean.add(`2026-02-${pad2(d)}`);
  // Feb 21–24: empty (unverified/missed) — no entries
  // Feb 25: clean
  clean.add('2026-02-25');
  // Feb 26–28: relapse (hollow + skull)
  for (let d = 26; d <= 28; d++) relapse.add(`2026-02-${pad2(d)}`);

  // March: March 1–9 clean streak (today = March 9)
  for (let d = 1; d <= 9; d++) clean.add(`2026-03-${pad2(d)}`);
  // March 9+: empty (future) — no entries

  return { clean, relapse };
}

const { clean: CLEAN_DAYS, relapse: RELAPSE_DAYS } = buildMockData();
// App start: Feb 16 2026 — navigation cannot go earlier than February 2026
const APP_START = { year: 2026, month: 2 };

export default function CalendarScreen({ navigation }) {
  const now = new Date();
  const todayString = getTodayStr();

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
        onPress={() => navigation.navigate('Home')}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
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
          cleanDays={CLEAN_DAYS}
          relapseDays={RELAPSE_DAYS}
          todayString={todayString}
        />
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
    bottom: 100,
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
});
