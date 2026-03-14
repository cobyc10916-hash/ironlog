import { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 20;
const COL_GAP = 5;
const ROW_GAP = 5;
export const CELL_SIZE = Math.floor((SCREEN_WIDTH - H_PADDING * 2 - COL_GAP * 6) / 7);
// Exact pixel width of the 7-column grid — used by CalendarScreen to match header width
export const GRID_WIDTH = CELL_SIZE * 7 + COL_GAP * 6;

// Sunday-start headers
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toDateStr(year, month1, day) {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

// year: full year, month: 1-indexed
export default function CalendarGrid({ year, month, cleanDays, relapseDays, todayString, joinDateString }) {
  // Build the Sunday-start grid for the given year/month
  const rows = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDow = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
    const startOffset = firstDow; // Sunday-start: no adjustment
    const numRows = Math.ceil((startOffset + daysInMonth) / 7);
    return Array.from({ length: numRows }, (_, r) =>
      Array.from({ length: 7 }, (_, c) => {
        const d = r * 7 + c - startOffset + 1;
        return d >= 1 && d <= daysInMonth ? d : null;
      })
    );
  }, [year, month]);

  const getCellState = useCallback(
    (dayNum) => {
      if (dayNum === null) return 'blank';
      const ds = toDateStr(year, month, dayNum);
      // Before the user joined — no app data possible
      if (joinDateString && ds < joinDateString) return 'before-join';
      // Future dates — nothing has happened yet
      if (ds > todayString) return 'before-join';
      // Skull takes priority over everything — even the join date
      if (relapseDays.has(ds) && ds <= todayString) return 'relapse';
      // Join date itself is always clean — it's day 1 of the streak
      if (joinDateString && ds === joinDateString) return 'clean';
      if (cleanDays.has(ds)) return 'clean';
      // Opening the app marks today — today is never hollow
      if (ds === todayString) return 'clean';
      return 'empty';
    },
    [year, month, cleanDays, relapseDays, todayString, joinDateString]
  );

  const renderCell = (dayNum, key) => {
    if (dayNum === null) {
      return <View key={key} style={styles.cellWrapper} />;
    }

    const state = getCellState(dayNum);
    const today = toDateStr(year, month, dayNum) === todayString;

    return (
      <View key={key} style={styles.cellWrapper}>
        <View
          style={[
            styles.cell,
            state === 'clean' && styles.cellSolid,
            (state === 'empty' || state === 'relapse') && styles.cellHollow,
            state === 'before-join' && styles.cellBeforeJoin,
          ]}
        >
          {state === 'relapse' && (
            <MaterialCommunityIcons
              name="skull"
              size={Math.round(CELL_SIZE * 0.52)}
              color={colors.white}
            />
          )}
          {state === 'clean' && (
            <Text style={styles.dateNumDark}>{dayNum}</Text>
          )}
          {state === 'empty' && (
            <Text style={styles.dateNumLight}>{dayNum}</Text>
          )}
          {state === 'before-join' && (
            <Text style={styles.dateNumBeforeJoin}>{dayNum}</Text>
          )}
        </View>
        {today && <View style={styles.todayRingOverlay} />}
      </View>
    );
  };

  return (
    <View style={styles.gridRoot}>
      {/* Day headers — Sunday-start */}
      <View style={styles.labelRow}>
        {DAY_LABELS.map((lbl, i) => (
          <View key={i} style={styles.labelCell}>
            <Text style={styles.labelText}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* Grid rows */}
      {rows.map((row, r) => (
        <View key={r} style={styles.gridRow}>
          {row.map((dayNum, c) => renderCell(dayNum, c))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Explicit fixed width — eliminates any wrapping ambiguity
  gridRoot: {
    width: GRID_WIDTH,
  },

  labelRow: {
    flexDirection: 'row',
    gap: COL_GAP,
    marginBottom: 10,
  },
  labelCell: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  labelText: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.white,
    opacity: 0.4,
    letterSpacing: 1,
  },

  gridRow: {
    flexDirection: 'row',
    gap: COL_GAP,
    marginBottom: ROW_GAP,
  },

  cellWrapper: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    position: 'relative',
  },

  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cellSolid: {
    backgroundColor: colors.white,
  },

  cellHollow: {
    borderWidth: 1,
    borderColor: colors.white,
  },

  dateNumDark: {
    fontFamily: fonts.body,
    fontSize: Math.round(CELL_SIZE * 0.32),
    color: colors.background,
    fontWeight: '600',
  },
  dateNumLight: {
    fontFamily: fonts.body,
    fontSize: Math.round(CELL_SIZE * 0.32),
    color: colors.white,
    opacity: 0.55,
  },
  cellBeforeJoin: {
    // No border, no fill — just a dim number
  },
  dateNumBeforeJoin: {
    fontFamily: fonts.body,
    fontSize: Math.round(CELL_SIZE * 0.32),
    color: colors.white,
    opacity: 0.18,
  },

  todayRingOverlay: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 4,
  },
});
