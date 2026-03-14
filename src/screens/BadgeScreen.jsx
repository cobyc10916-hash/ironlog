import { memo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';
import { BADGE_DATA } from '../constants/badges';
import { useStreakContext } from '../context/StreakContext';
import { supabase } from '../lib/supabase';

// ─── Sizing ────────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 20;
const COL_GAP   = 12;
const ROW_GAP   = 24;
const BADGE_W   = Math.floor((SCREEN_WIDTH - H_PADDING * 2 - COL_GAP * 2) / 3);
const BADGE_H   = Math.round(BADGE_W * 1.16);

// ─── Row chunks (static — BADGE_DATA never changes) ───────────────────────────
const ROWS = [];
for (let i = 0; i < BADGE_DATA.length; i += 3) {
  ROWS.push(BADGE_DATA.slice(i, i + 3));
}

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

const BadgeInsignia = memo(function BadgeInsignia({ number, unit, isEarned, isRevealing, revealAnim }) {
  // Single Animated.View for all states — prevents native remount flicker on state transitions.
  // opacity: animated during reveal, 1 when earned, 0.2 when unearned.
  const opacity = isRevealing && revealAnim ? revealAnim : isEarned ? 1 : 0.2;
  return (
    <Animated.View style={[styles.badge, { opacity }]}>
      <Svg width={BADGE_W} height={BADGE_H} viewBox="4 7 92 106" style={StyleSheet.absoluteFill}>
        <Path d={HEX_OUTER} fill="#ffffff" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
        <Path d={HEX_INNER} fill="none" stroke="#0a0a0a" strokeWidth="4" strokeLinejoin="round" />
      </Svg>
      <View style={styles.textOverlay}>
        <Text style={[styles.numberText, { color: '#0a0a0a' }, number === '5' && { marginLeft: -4 }]}>{number}</Text>
        <Text style={[styles.unitText, { color: '#0a0a0a' }]}>{unit}</Text>
      </View>
    </Animated.View>
  );
});

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function BadgeScreen({ navigation }) {
  const { clearPendingMilestone } = useStreakContext();
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  const _nextBadge   = BADGE_DATA.find(b => b.days > longestStreak);
  const PROGRESS_PCT = _nextBadge ? Math.min((currentStreak / _nextBadge.days) * 100, 100) : 100;

  const progressAnim = useRef(new Animated.Value(PROGRESS_PCT)).current;
  const newBadgeRevealAnim = useRef(new Animated.Value(0)).current;
  const [revealingBadgeDays, setRevealingBadgeDays] = useState(null);
  const [displayNextBadge, setDisplayNextBadge] = useState(_nextBadge);
  const prevNextBadgeRef = useRef(_nextBadge);
  const justLoadedRef = useRef(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function fetchBadgeData() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');

        const [streaksResult, badgesResult] = await Promise.all([
          supabase
            .from('streaks')
            .select('current_streak, longest_streak')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('badges')
            .select('badge_key, earned_at')
            .eq('user_id', user.id),
        ]);

        if (streaksResult.error) throw streaksResult.error;
        if (badgesResult.error) throw badgesResult.error;

        const { current_streak, longest_streak } = streaksResult.data ?? {};
        setCurrentStreak(current_streak ?? 0);
        setLongestStreak(longest_streak ?? 0);
      } catch (err) {
        console.error('BADGE_FETCH_ERROR:', err);
      } finally {
        justLoadedRef.current = true;
        setLoading(false);
      }
    }

    fetchBadgeData();
  }, []);

  useEffect(() => {
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      progressAnim.setValue(PROGRESS_PCT);
      setDisplayNextBadge(_nextBadge);
      return;
    }

    const prevNextBadge = prevNextBadgeRef.current;
    prevNextBadgeRef.current = _nextBadge;

    // Badge milestone crossed — fill bar, hold, reveal badge, hold, then show new target
    if (prevNextBadge && _nextBadge && prevNextBadge.days < _nextBadge.days) {
      // Immediately mark badge as revealing — start at 0.2 to match unearned opacity (seamless handoff)
      newBadgeRevealAnim.setValue(0.2);
      setRevealingBadgeDays(prevNextBadge.days);
      // User is watching the reveal here — suppress the HomeScreen overlay for this milestone
      clearPendingMilestone(prevNextBadge.days);

      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        // Hold at 100% with X/X label, then fade badge in
        setTimeout(() => {
          Animated.timing(newBadgeRevealAnim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            // Hold badge fully visible, then transition to new progress target
            setTimeout(() => {
              setRevealingBadgeDays(null);
              setDisplayNextBadge(_nextBadge);
              Animated.timing(progressAnim, {
                toValue: PROGRESS_PCT,
                duration: 600,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
              }).start();
            }, 2000);
          });
        }, 1000);
      });
      return;
    }

    setDisplayNextBadge(_nextBadge);
    Animated.timing(progressAnim, {
      toValue: PROGRESS_PCT,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [PROGRESS_PCT]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const NEXT_LABEL = displayNextBadge
    ? `${displayNextBadge.number} ${displayNextBadge.unit}`
    : 'ALL EARNED';
  const DAYS_LABEL = displayNextBadge
    ? `${currentStreak} / ${displayNextBadge.days} DAYS`
    : `${currentStreak} DAYS`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
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
          <Animated.View style={[styles.progressFill, {
            width: progressAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            }),
          }]} />
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
                isEarned={badge.days <= longestStreak}
                isRevealing={revealingBadgeDays === badge.days}
                revealAnim={newBadgeRevealAnim}
              />
            ))}
          </View>
        ))}
      </ScrollView>

    </SafeAreaView>
    </Animated.View>
    </View>
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
