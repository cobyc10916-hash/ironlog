import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

// ─── Sizing ────────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 20;
const COL_GAP   = 12;
const ROW_GAP   = 20;
const BADGE_W   = Math.floor((SCREEN_WIDTH - H_PADDING * 2 - COL_GAP * 2) / 3);
const BADGE_H   = Math.round(BADGE_W * 1.22);  // taller than wide for shield silhouette

// ─── Mock — swap for Supabase streak ───────────────────────────────────────────
const currentStreak = 8;

// ─── Badge data ────────────────────────────────────────────────────────────────
const BADGE_DATA = [
  { rank: 'INITIATE',   number: '1', unit: 'DAY',    days: 1   },
  { rank: 'RECRUIT',    number: '3', unit: 'DAYS',   days: 3   },
  { rank: 'SOLDIER',    number: '5', unit: 'DAYS',   days: 5   },
  { rank: 'CORPORAL',   number: '1', unit: 'WEEK',   days: 7   },
  { rank: 'SERGEANT',   number: '2', unit: 'WEEKS',  days: 14  },
  { rank: 'LIEUTENANT', number: '1', unit: 'MONTH',  days: 30  },
  { rank: 'CAPTAIN',    number: '3', unit: 'MONTHS', days: 90  },
  { rank: 'MAJOR',      number: '6', unit: 'MONTHS', days: 180 },
  { rank: 'COLONEL',    number: '1', unit: 'YEAR',   days: 365 },
];

// ─── Shield SVG ────────────────────────────────────────────────────────────────
// ViewBox 0 0 100 122 — flat top, straight sides to ~y:68, Bezier taper to point
const SHIELD_PATH = 'M 8 6 L 92 6 L 92 68 Q 92 100 50 116 Q 8 100 8 68 Z';
const SHIELD_STROKE_W = (100 / BADGE_W) * 1.5; // ~1.5px visual regardless of badge size

// ─── Row chunks ────────────────────────────────────────────────────────────────
const ROWS = [];
for (let i = 0; i < BADGE_DATA.length; i += 3) {
  ROWS.push(BADGE_DATA.slice(i, i + 3));
}

// ─── Badge component ───────────────────────────────────────────────────────────
function Badge({ rank, number, unit, earned }) {
  const textColor = earned ? colors.background : colors.white;

  return (
    <View style={[styles.badge, !earned && styles.badgeUnearned]}>
      {/* Shield shape */}
      <Svg
        width={BADGE_W}
        height={BADGE_H}
        viewBox="0 0 100 122"
        style={StyleSheet.absoluteFill}
      >
        <Path
          d={SHIELD_PATH}
          fill={earned ? colors.white : 'transparent'}
          stroke={colors.white}
          strokeWidth={earned ? 0 : SHIELD_STROKE_W}
        />
      </Svg>

      {/* Text — centered in shield body, shifted up from the tapered point */}
      <View style={styles.textBlock}>
        <Text style={[styles.rankText, { color: textColor }]} numberOfLines={1}>
          {rank}
        </Text>
        <Text style={[styles.numberText, { color: textColor }]}>
          {number}
        </Text>
        <Text style={[styles.unitText, { color: textColor }]} numberOfLines={1}>
          {unit}
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function BadgeScreen() {
  return (
    <SafeAreaView style={styles.root}>

      {/* Fixed-height header — Bolted Console: never shifts */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>ACHIEVEMENTS</Text>
        <View style={styles.divider} />
      </View>

      {/* Scrollable grid */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((badge) => (
              <Badge
                key={badge.days}
                rank={badge.rank}
                number={badge.number}
                unit={badge.unit}
                earned={badge.days <= currentStreak}
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

  // Fixed height — no content-driven resize
  header: {
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 14,
  },
  headerLabel: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.white,
    opacity: 0.7,
    letterSpacing: 6,
    marginBottom: 14,
  },
  divider: {
    width: SCREEN_WIDTH - H_PADDING * 2,
    height: 0.5,
    backgroundColor: colors.white,
    opacity: 0.3,
  },

  scrollContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: 24,
    paddingBottom: 40,
    gap: ROW_GAP,
  },

  row: {
    flexDirection: 'row',
    gap: COL_GAP,
  },

  // Badge container — fixed size, no flex
  badge: {
    width: BADGE_W,
    height: BADGE_H,
    position: 'relative',
  },

  // Unearned: entire badge at 20% opacity (border + text ghosted together)
  badgeUnearned: {
    opacity: 0.2,
  },

  // Text sits in the upper body of the shield — paddingBottom lifts it above the taper
  textBlock: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Math.round(BADGE_H * 0.16),
  },

  rankText: {
    fontFamily: fonts.display,
    fontSize: 6.5,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 2,
  },

  numberText: {
    fontFamily: fonts.display,
    fontSize: Math.round(BADGE_W * 0.28),
    lineHeight: Math.round(BADGE_W * 0.32),
    textAlign: 'center',
    letterSpacing: -1,
  },

  unitText: {
    fontFamily: fonts.display,
    fontSize: 7,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 2,
  },
});
