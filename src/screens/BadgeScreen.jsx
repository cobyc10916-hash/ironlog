import { memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

// ─── Sizing ────────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 20;
const COL_GAP   = 12;
const ROW_GAP   = 24;
const BADGE_W   = Math.floor((SCREEN_WIDTH - H_PADDING * 2 - COL_GAP * 2) / 3);
const BADGE_H   = Math.round(BADGE_W * 1.16);

// ─── Mock — swap for Supabase streak ───────────────────────────────────────────
const currentStreak = 21;

// ─── Badge data ────────────────────────────────────────────────────────────────
// Row 1: 1D 3D 5D  |  Row 2: 1W 2W 1M  |  Row 3+: monthly/yearly
const BADGE_DATA = [
  { number: '1',  unit: 'DAY',    days: 1    },
  { number: '3',  unit: 'DAYS',   days: 3    },
  { number: '5',  unit: 'DAYS',   days: 5    },
  { number: '1',  unit: 'WEEK',   days: 7    },
  { number: '2',  unit: 'WEEKS',  days: 14   },
  { number: '1',  unit: 'MONTH',  days: 30   },
  { number: '2',  unit: 'MONTHS', days: 60   },
  { number: '3',  unit: 'MONTHS', days: 90   },
  { number: '4',  unit: 'MONTHS', days: 120  },
  { number: '5',  unit: 'MONTHS', days: 150  },
  { number: '6',  unit: 'MONTHS', days: 180  },
  { number: '7',  unit: 'MONTHS', days: 210  },
  { number: '8',  unit: 'MONTHS', days: 240  },
  { number: '9',  unit: 'MONTHS', days: 270  },
  { number: '10', unit: 'MONTHS', days: 300  },
  { number: '11', unit: 'MONTHS', days: 330  },
  { number: '1',  unit: 'YEAR',   days: 365  },
  { number: '2',  unit: 'YEARS',  days: 730  },
  { number: '3',  unit: 'YEARS',  days: 1095 },
  { number: '5',  unit: 'YEARS',  days: 1825 },
];

// ─── Row chunks ────────────────────────────────────────────────────────────────
const ROWS = [];
for (let i = 0; i < BADGE_DATA.length; i += 3) {
  ROWS.push(BADGE_DATA.slice(i, i + 3));
}

// ─── Progress to next milestone ────────────────────────────────────────────────
const _lastEarned  = [...BADGE_DATA].reverse().find(b => b.days <= currentStreak);
const _nextBadge   = BADGE_DATA.find(b => b.days > currentStreak);
const PROGRESS     = _nextBadge && _lastEarned
  ? (currentStreak - _lastEarned.days) / (_nextBadge.days - _lastEarned.days)
  : _nextBadge ? 0 : 1;
const PROGRESS_PCT = Math.round(PROGRESS * 100);
const NEXT_LABEL   = _nextBadge
  ? `${_nextBadge.number} ${_nextBadge.unit}`
  : 'ALL EARNED';
const DAYS_LABEL   = _nextBadge
  ? `${currentStreak} / ${_nextBadge.days} DAYS`
  : `${currentStreak} DAYS`;

// ─── Iron Hex paths (viewBox "0 0 100 120") ───────────────────────────────────
//
// Pointy-top hexagon: points at north & south, flat vertical edges left & right.
// Center: (50, 60)  |  Outer circumradius R = 52  |  Inner R = 47.3 (4px uniform inset)
//
// Outer apothem (center→flat-edge midpoint) = 52 × cos30° = 52 × 0.866 = 45.0
// Inner apothem = 45.0 − 4 = 41.0  →  R_inner = 41.0 / 0.866 = 47.3
//
// Outer vertices (pointy-top, CW from top):
//   Top(50,8)  TR(95,34)  BR(95,86)  Bot(50,112)  BL(5,86)  TL(5,34)
//
// Inner vertices:
//   Top(50,13)  TR(91,36)  BR(91,84)  Bot(50,107)  BL(9,84)  TL(9,36)
//
// Edge unit vectors (all edges share the same 3 directions):
//   Vertical flat sides:        (0, ±1)
//   Upper-diagonal (NE/SW):     (0.866, ±0.5)
//   Lower-diagonal (NW/SE):    (−0.866, ±0.5)
//
// Corner rounding r=3 — approach/depart = vertex ∓ r × incoming/outgoing unit:
//   Top(50,8):     approach(47.4,9.5)   Q 50 8   depart(52.6,9.5)
//   TR(95,34):     approach(92.4,32.5)  Q 95 34  depart(95,37)
//   BR(95,86):     approach(95,83)      Q 95 86  depart(92.4,87.5)
//   Bot(50,112):   approach(52.6,110.5) Q 50 112 depart(47.4,110.5)
//   BL(5,86):      approach(7.6,87.5)   Q 5 86   depart(5,83)
//   TL(5,34):      approach(5,37)       Q 5 34   depart(7.6,32.5)

const HEX_OUTER = [
  'M 47.4 9.5',
  'Q 50 8 52.6 9.5',
  'L 92.4 32.5',
  'Q 95 34 95 37',
  'L 95 83',
  'Q 95 86 92.4 87.5',
  'L 52.6 110.5',
  'Q 50 112 47.4 110.5',
  'L 7.6 87.5',
  'Q 5 86 5 83',
  'L 5 37',
  'Q 5 34 7.6 32.5',
  'Z',
].join(' ');

// Inner corners (same r=3, same unit vectors):
//   Top(50,13):    approach(47.4,14.5)  Q 50 13  depart(52.6,14.5)
//   TR(91,36):     approach(88.4,34.5)  Q 91 36  depart(91,39)
//   BR(91,84):     approach(91,81)      Q 91 84  depart(88.4,85.5)
//   Bot(50,107):   approach(52.6,105.5) Q 50 107 depart(47.4,105.5)
//   BL(9,84):      approach(11.6,85.5)  Q 9 84   depart(9,81)
//   TL(9,36):      approach(9,39)       Q 9 36   depart(11.6,34.5)

const HEX_INNER = [
  'M 47.4 14.5',
  'Q 50 13 52.6 14.5',
  'L 88.4 34.5',
  'Q 91 36 91 39',
  'L 91 81',
  'Q 91 84 88.4 85.5',
  'L 52.6 105.5',
  'Q 50 107 47.4 105.5',
  'L 11.6 85.5',
  'Q 9 84 9 81',
  'L 9 39',
  'Q 9 36 11.6 34.5',
  'Z',
].join(' ');

// ─── BadgeInsignia ──────────────────────────────────────────────────────────────
const BadgeInsignia = memo(function BadgeInsignia({ number, unit, isEarned }) { return (
  <View style={[styles.badge, !isEarned && styles.badgeUnearned]}>
    <Svg
      width={BADGE_W}
      height={BADGE_H}
      viewBox="4 7 92 106"
      style={StyleSheet.absoluteFill}
    >
      {/* White fill + outer stroke — the face of the hex plate */}
      <Path
        d={HEX_OUTER}
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Recessed inlay channel — dark groove ring, 4px uniform inset */}
      <Path
        d={HEX_INNER}
        fill="none"
        stroke="#0a0a0a"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </Svg>

    <View style={styles.textOverlay}>
      <Text style={[styles.numberText, { color: '#0a0a0a' }, number === '5' && { marginLeft: -4 }]}>
        {number}
      </Text>
      <Text style={[styles.unitText, { color: '#0a0a0a' }]}>
        {unit}
      </Text>
    </View>
  </View>
); });

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function BadgeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation?.goBack()}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={26} color={colors.white} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.headerLabel}>ACHIEVEMENTS</Text>
        <View style={styles.divider} />
      </View>

      {/* Progress to next milestone */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressNextLabel}>
          {_nextBadge ? `NEXT: ${NEXT_LABEL}` : NEXT_LABEL}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${PROGRESS_PCT}%` }]} />
        </View>
        <Text style={styles.progressDays}>{DAYS_LABEL}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        indicatorStyle="white"
        persistentScrollbar
        scrollIndicatorInsets={{ right: 1 }}
      >
        {ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((badge) => (
              <BadgeInsignia
                key={badge.days}
                number={badge.number}
                unit={badge.unit}
                isEarned={badge.days <= currentStreak}
              />
            ))}
          </View>
        ))}
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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

  header: {
    height: 68,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  headerLabel: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.white,
    opacity: 0.7,
    letterSpacing: 6,
    marginBottom: 14,
    paddingLeft: 12,
  },
  divider: {
    width: SCREEN_WIDTH - H_PADDING * 2,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },

  progressContainer: {
    paddingHorizontal: H_PADDING,
    paddingTop: 10,
    paddingBottom: 16,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.white,
    borderRadius: 2,
    marginTop: -3,
  },
  progressNextLabel: {
    fontFamily: fonts.display,
    fontSize: 9,
    color: colors.white,
    opacity: 0.9,
    letterSpacing: 2,
    marginBottom: 8,
  },
  progressDays: {
    fontFamily: fonts.display,
    fontSize: 9,
    color: colors.white,
    opacity: 0.45,
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: 24,
    paddingBottom: 60,
    gap: ROW_GAP,
  },

  row: {
    flexDirection: 'row',
    gap: COL_GAP,
  },

  badge: {
    width: BADGE_W,
    height: BADGE_H,
    position: 'relative',
  },

  badgeUnearned: {
    opacity: 0.2,
  },

  // Hexagon is symmetric top-to-bottom — true center is the visual center.
  // Small paddingBottom compensates for unit label below the number.
  textOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
    paddingRight: 4,
  },

  numberText: {
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 50,
    textAlign: 'center',
    letterSpacing: -6,
  },

  unitText: {
    fontFamily: fonts.display,
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: -2,
    marginLeft: 6,
  },
});
