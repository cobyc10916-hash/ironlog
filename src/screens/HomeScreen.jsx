import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';
import { BADGE_DATA } from '../constants/badges';
import { useStreakContext } from '../context/StreakContext';

// Pointy-top hexagon path — same geometry as BadgeScreen (viewBox "4 7 92 106")
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

const OVERLAY_BADGE_W = 150;
const OVERLAY_BADGE_H = Math.round(OVERLAY_BADGE_W * 1.16);

const HOLD_DURATION = 3000;
const GAP = 4;
const STROKE = 4;
const BUTTON_RADIUS = 8;
const QUOTE = 'THE ONLY WAY\nOUT IS THROUGH.';
const LOGGED_TEXT = 'LOGGED.';

const MILESTONE_DATA = {
  1:   { number: '1',   unit: 'DAY',    quote: 'FIRST STEP TAKEN.' },
  3:   { number: '3',   unit: 'DAYS',   quote: 'THE GRIND IS REAL.' },
  5:   { number: '5',   unit: 'DAYS',   quote: 'KEEP GOING.', lines: ['KEEP', 'GOING'] },
  7:   { number: '1',   unit: 'WEEK',   quote: 'ONE WEEK FORGED.' },
  14:  { number: '2',   unit: 'WEEKS',  quote: 'UNBREAKABLE.' },
  30:  { number: '1',   unit: 'MONTH',  quote: 'THIRTY DAYS OF STEEL.' },
  60:  { number: '2',   unit: 'MONTHS', quote: 'TWO MONTHS. NO EXCUSES.' },
  100: { number: '100', unit: 'DAYS',   quote: 'TRIPLE DIGITS. LOCKED IN.' },
  365: { number: '1',   unit: 'YEAR',   quote: 'ONE YEAR. MISSION COMPLETE.' },
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

function OdometerDigit({ digit, digitHeight, fontSize, animate }) {
  const translateY = useRef(new Animated.Value(-digitHeight * digit)).current;

  useEffect(() => {
    if (!animate) {
      translateY.setValue(-digitHeight * digit);
      return;
    }
    Animated.timing(translateY, {
      toValue: -digitHeight * digit,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [digit, digitHeight, animate]);

  return (
    <View style={{ height: digitHeight, overflow: 'hidden', marginRight: -6 }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <Text
            key={d}
            style={{
              fontFamily: fonts.display,
              fontSize,
              color: colors.white,
              height: digitHeight,
              lineHeight: digitHeight,
            }}
          >
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

export function getRingMetrics(bw, bh) {
  const pw = bw + 2 * GAP + STROKE;
  const ph = bh + 2 * GAP + STROKE;
  const prx = BUTTON_RADIUS + GAP + STROKE / 2;
  const svgW = bw + 2 * (GAP + STROKE);
  const svgH = bh + 2 * (GAP + STROKE);
  const ox = STROKE / 2;
  const oy = STROKE / 2;
  const cx = ox + pw / 2;

  const d = [
    `M ${cx} ${oy}`,
    `L ${ox + pw - prx} ${oy}`,
    `A ${prx} ${prx} 0 0 1 ${ox + pw} ${oy + prx}`,
    `L ${ox + pw} ${oy + ph - prx}`,
    `A ${prx} ${prx} 0 0 1 ${ox + pw - prx} ${oy + ph}`,
    `L ${ox + prx} ${oy + ph}`,
    `A ${prx} ${prx} 0 0 1 ${ox} ${oy + ph - prx}`,
    `L ${ox} ${oy + prx}`,
    `A ${prx} ${prx} 0 0 1 ${ox + prx} ${oy}`,
    `L ${cx} ${oy}`,
  ].join(' ');

  const perimeter = 2 * (pw + ph) + prx * (2 * Math.PI - 8);
  return { svgW, svgH, d, perimeter };
}

export default function HomeScreen({
  navigation,
  initialStreak = 5,
  demoMode = false,
  demoStreak,
  onLayoutMeasured,
  onDemoResetComplete,
  onDemoHoldComplete,
  resetDisabled = false,
}) {
  const { streak: ctxStreak, setStreak: setCtxStreak, sinceDate: ctxSinceDate, setSinceDate: setCtxSinceDate, longestStreak: ctxLongestStreak } = useStreakContext();

  // Demo mode uses local state to avoid polluting the shared streak context
  const [demoStreakState, setDemoStreakState] = useState(initialStreak);
  const demoLongestRef = useRef(initialStreak);
  demoLongestRef.current = Math.max(demoLongestRef.current, demoStreakState);

  const streak = demoMode ? demoStreakState : ctxStreak;
  const setStreak = demoMode ? setDemoStreakState : setCtxStreak;
  const sinceDate = demoMode ? new Date(2026, 2, 8, 22, 0, 0) : ctxSinceDate;
  const setSinceDate = demoMode ? (() => {}) : setCtxSinceDate;
  const longestStreak = demoMode ? demoLongestRef.current : ctxLongestStreak;

  const prevStreakRef = useRef(streak);
  const [buttonLayout, setButtonLayout] = useState({ width: 0, height: 0 });
  const [visibleChars, setVisibleChars] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [daysCleanWidth, setDaysCleanWidth] = useState(0);
  const [loggedVisibleChars, setLoggedVisibleChars] = useState(0);

  // Refs for layout measurement — used by Demo to position spotlight cutouts
  const badgeRef = useRef(null);
  const settingsRef = useRef(null);
  const streakRef = useRef(null);
  const resetRef = useRef(null);
  const daysCleanRef = useRef(null);

  const nextBadge = BADGE_DATA.find(b => b.days > longestStreak);
  const progressPct = nextBadge ? Math.min((streak / nextBadge.days) * 100, 100) : 100;

  const shouldAnimate = !demoMode && streak === prevStreakRef.current + 1;

  const [displayNextBadge, setDisplayNextBadge] = useState(nextBadge);
  const shownMilestonesRef = useRef(new Set());
  const progressResetRef = useRef(null);
  const [badgeOverlayVisible, setBadgeOverlayVisible] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState(null);
  const badgeOverlayAnim = useRef(new Animated.Value(0)).current;

  const progress = useRef(new Animated.Value(0)).current;
  const badgeProgressAnim = useRef(new Animated.Value(progressPct)).current;
  const sinceOpacity = useRef(new Animated.Value(1)).current;
  const prevNextBadgeRef = useRef(nextBadge);

  useEffect(() => {
    prevStreakRef.current = streak;
  }, [streak]);

  useEffect(() => {
    const prevNextBadge = prevNextBadgeRef.current;
    prevNextBadgeRef.current = nextBadge;

    // Badge milestone crossed — fill to 100%, pause, then show new target
    if (prevNextBadge && nextBadge && prevNextBadge.days < nextBadge.days) {
      Animated.timing(badgeProgressAnim, {
        toValue: 100,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        progressResetRef.current = () => {
          setDisplayNextBadge(nextBadge);
          Animated.timing(badgeProgressAnim, {
            toValue: progressPct,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
          progressResetRef.current = null;
        };
      });
      return;
    }

    setDisplayNextBadge(nextBadge);
    Animated.timing(badgeProgressAnim, {
      toValue: progressPct,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressPct]);

  // Badge milestone overlay
  useEffect(() => {
    if (demoMode) return;
    const data = MILESTONE_DATA[streak];
    if (!data) return;
    if (shownMilestonesRef.current.has(streak)) return;
    shownMilestonesRef.current.add(streak);
    // Delay until after odometer (800ms) + progress bar fill (400ms) + hold beat (1800ms)
    const t = setTimeout(() => {
      setActiveMilestone(data);
      setBadgeOverlayVisible(true);
      badgeOverlayAnim.setValue(0);
      Animated.sequence([
        Animated.timing(badgeOverlayAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(badgeOverlayAnim, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(badgeOverlayAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setBadgeOverlayVisible(false);
        progressResetRef.current?.();
      });
    }, 3000);
    return () => clearTimeout(t);
  }, [streak]);

  // DEV DEMO — remove before shipping: simulates a new day arriving 10s after mount
  useEffect(() => {
    if (demoMode) return;
    const t = setTimeout(() => setStreak(s => s + 1), 10000);
    return () => clearTimeout(t);
  }, []);

  // Sync demoStreak prop into local streak state when in demo mode
  useEffect(() => {
    if (demoMode && demoStreak !== undefined && demoStreak !== null) {
      setStreak(demoStreak);
    }
  }, [demoMode, demoStreak]);
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const numberOpacity = useRef(new Animated.Value(1)).current;
  const quoteOpacity = useRef(new Animated.Value(0)).current;
  const loggedOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const holdAnim = useRef(null);
  const pulseLoop = useRef(null);
  const hapticTimers = useRef([]);
  const typewriterTimers = useRef([]);
  const loggedTypewriterTimers = useRef([]);
  const isComplete = useRef(false);
  const isAnimating = useRef(false);
  const lastQuoteTime = useRef(0);

  const clearHapticTimers = () => {
    hapticTimers.current.forEach(clearTimeout);
    hapticTimers.current = [];
  };

  const clearTypewriter = () => {
    typewriterTimers.current.forEach(clearTimeout);
    typewriterTimers.current = [];
  };

  const clearLoggedTypewriter = () => {
    loggedTypewriterTimers.current.forEach(clearTimeout);
    loggedTypewriterTimers.current = [];
  };

  const startTypewriter = (onComplete) => {
    const charDelay = 1800 / QUOTE.length;
    let i = 0;
    const tick = () => {
      i++;
      setVisibleChars(i);
      if (i < QUOTE.length) {
        typewriterTimers.current.push(setTimeout(tick, charDelay));
      } else {
        onComplete();
      }
    };
    typewriterTimers.current.push(setTimeout(tick, charDelay));
  };

  const startLoggedTypewriter = (onComplete) => {
    const charDelay = 1000 / LOGGED_TEXT.length;
    let i = 0;
    const tick = () => {
      i++;
      setLoggedVisibleChars(i);
      if (i < LOGGED_TEXT.length) {
        loggedTypewriterTimers.current.push(setTimeout(tick, charDelay));
      } else {
        onComplete();
      }
    };
    loggedTypewriterTimers.current.push(setTimeout(tick, charDelay));
  };

  const updateSinceDate = () => {
    const now = new Date();
    const sameDay = now.toDateString() === sinceDate.toDateString();
    if (sameDay) return;
    Animated.timing(sinceOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setSinceDate(now);
      Animated.timing(sinceOpacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    });
  };

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 1.03, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1.0, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    Animated.timing(buttonScale, { toValue: 1.0, duration: 150, useNativeDriver: true }).start();
  };

  // Called when 3s hold completes — in demo mode skips confirm and goes straight to reset
  const handleHoldComplete = () => {
    stopPulse();
    isComplete.current = true;
    clearHapticTimers();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (demoMode) {
      Animated.timing(ringOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
      onDemoHoldComplete?.();
      performReset(true);
      return;
    }
    overlayOpacity.setValue(0);
    setShowConfirm(true);
    Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  // Called after YES is confirmed — runs the actual reset sequence
  const performReset = (withQuote) => {
    isAnimating.current = true;

    Animated.timing(ringOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(numberOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        if (withQuote) {
          lastQuoteTime.current = Date.now();
          setVisibleChars(0);
          quoteOpacity.setValue(1);
          startTypewriter(() => {
            setTimeout(() => {
              Animated.timing(quoteOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
                setStreak(0);
                updateSinceDate();
                progress.setValue(0);
                clearTypewriter();
                isAnimating.current = false;
                isComplete.current = false;
                Animated.timing(numberOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start(() => {
                  if (demoMode) onDemoResetComplete?.();
                });
              });
            }, 1500);
          });
        } else {
          loggedOpacity.setValue(1);
          startLoggedTypewriter(() => {
            setTimeout(() => {
              Animated.timing(loggedOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
                setLoggedVisibleChars(0);
                setStreak(0);
                updateSinceDate();
                progress.setValue(0);
                clearLoggedTypewriter();
                isAnimating.current = false;
                isComplete.current = false;
                Animated.timing(numberOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
              });
            }, 800);
          });
        }
      });
    });
  };

  const handleConfirmYes = () => {
    Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowConfirm(false);
      const withQuote = Date.now() - lastQuoteTime.current >= 3600000;
      performReset(withQuote);
    });
  };

  const handleConfirmNo = () => {
    Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowConfirm(false);
      isComplete.current = false;
      Animated.parallel([
        Animated.timing(progress, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: false }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  const handlePressIn = () => {
    if (resetDisabled) return;
    if (isAnimating.current || showConfirm) return;

    isComplete.current = false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    hapticTimers.current = [
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 1000),
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 2000),
    ];

    startPulse();
    progress.setValue(0);
    Animated.timing(ringOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    holdAnim.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    holdAnim.current.start(({ finished }) => {
      if (finished) handleHoldComplete();
    });
  };

  const handlePressOut = () => {
    if (isComplete.current || isAnimating.current) return;
    stopPulse();
    holdAnim.current?.stop();
    clearHapticTimers();
    Animated.parallel([
      Animated.timing(progress, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      Animated.timing(ringOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const { svgW, svgH, d, perimeter } = getRingMetrics(buttonLayout.width, buttonLayout.height);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [perimeter, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.screenWrapper}>
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity
          ref={badgeRef}
          onPress={() => navigation.navigate('Badge')}
          disabled={demoMode}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onLayout={() => badgeRef.current?.measure((_x, _y, w, h, px, py) => {
            onLayoutMeasured?.('badgeIcon', { x: px, y: py, width: w, height: h });
          })}
        >
          <Svg width={27} height={30} viewBox="4 7 92 106">
            <Path d={HEX_OUTER} fill="rgba(255,255,255,0.20)" stroke={colors.white} strokeWidth="5.5" strokeLinejoin="round" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity
          ref={settingsRef}
          onPress={() => navigation.navigate('Settings')}
          disabled={demoMode}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onLayout={() => settingsRef.current?.measure((_x, _y, w, h, px, py) => {
            onLayoutMeasured?.('settingsIcon', { x: px, y: py, width: w, height: h });
          })}
        >
          <View style={{ width: 30, height: 30 }}>
            <Ionicons name="settings" size={30} color={colors.white} style={{ opacity: 0.20, position: 'absolute' }} />
            <Ionicons name="settings-outline" size={30} color={colors.white} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.youVsYouContainer}>
        <Text style={styles.youVsYou}>YOU VS YOU</Text>
      </View>

      <View style={styles.center}>
        <Text
          ref={daysCleanRef}
          style={styles.daysClean}
          onLayout={(e) => {
            setDaysCleanWidth(e.nativeEvent.layout.width);
            daysCleanRef.current?.measure((_x, _y, w, h, px, py) => {
              onLayoutMeasured?.('daysClean', { x: px, y: py, width: w, height: h });
            });
          }}
        >DAYS CLEAN</Text>
        <View style={[styles.miniDivider, { width: (60 + daysCleanWidth) / 2 }]} />

        {/* Wrapper preserves exact vertical footprint of original numberContainer (marginVertical:48, height:160).
            SINCE and badge are absolutely positioned inside the bottom margin zone so no flex siblings move. */}
        <View style={styles.numberWrapper}>
          <TouchableOpacity
            ref={streakRef}
            style={styles.numberContainer}
            onPress={() => navigation.navigate('Calendar')}
            disabled={demoMode}
            activeOpacity={0.8}
            onLayout={() => streakRef.current?.measure((_x, _y, w, h, px, py) => {
              onLayoutMeasured?.('streakNumber', { x: px, y: py, width: w, height: h });
            })}
          >
            <Animated.View style={[styles.odometerRow, { opacity: numberOpacity }]}>
              {streak.toString().split('').map((d, i, arr) => {
                const numDigits = arr.length;
                const digitHeight = numDigits >= 4 ? Math.max(60, Math.floor(160 * 3 / numDigits)) : 160;
                const posFromRight = numDigits - 1 - i;
                return (
                  <OdometerDigit
                    key={`digit-${posFromRight}`}
                    digit={parseInt(d, 10)}
                    digitHeight={digitHeight}
                    fontSize={digitHeight}
                    animate={shouldAnimate}
                  />
                );
              })}
            </Animated.View>
            <Animated.View
              style={[StyleSheet.absoluteFillObject, styles.quoteContainer, { opacity: quoteOpacity }]}
            >
              <Text style={styles.quoteText}>
                <Text style={{ color: colors.white }}>{QUOTE.slice(0, visibleChars)}</Text>
                <Text style={{ color: 'transparent' }}>{QUOTE.slice(visibleChars)}</Text>
              </Text>
            </Animated.View>
            <Animated.View
              style={[StyleSheet.absoluteFillObject, styles.quoteContainer, { opacity: loggedOpacity }]}
            >
              <Text style={styles.quoteText}>
                <Text style={{ color: colors.white }}>{LOGGED_TEXT.slice(0, loggedVisibleChars)}</Text>
                <Text style={{ color: 'transparent' }}>{LOGGED_TEXT.slice(loggedVisibleChars)}</Text>
              </Text>
            </Animated.View>
          </TouchableOpacity>

          {/* SINCE date — absolutely positioned in the bottom margin zone */}
          <Animated.View style={[styles.sinceAndBadge, { opacity: sinceOpacity }]}>
            <Text style={styles.sinceText}>
              SINCE {sinceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.resetWrapper, { transform: [{ scale: buttonScale }] }]}>
          {buttonLayout.width > 0 && (
            <Animated.View style={{ opacity: ringOpacity }} pointerEvents="none">
              <Svg
                width={svgW}
                height={svgH}
                style={[styles.progressRingSvg, { top: -(GAP + STROKE), left: -(GAP + STROKE) }]}
              >
                <AnimatedPath
                  d={d}
                  stroke={colors.white}
                  strokeWidth={STROKE}
                  strokeDasharray={[perimeter]}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </Animated.View>
          )}

          <TouchableOpacity
            ref={resetRef}
            disabled={resetDisabled}
            style={[styles.resetButton, { opacity: resetDisabled ? 0.4 : 1 }]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            onLayout={(e) => {
              setButtonLayout({
                width: e.nativeEvent.layout.width,
                height: e.nativeEvent.layout.height,
              });
              resetRef.current?.measure((_x, _y, w, h, px, py) => {
                onLayoutMeasured?.('resetButton', { x: px, y: py, width: w, height: h });
              });
            }}
          >
            <Animated.View
              style={[StyleSheet.absoluteFillObject, styles.flashOverlay, { opacity: flashOpacity }]}
            />
            <Text style={styles.resetText}>RESET</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.bottomSpacer} />

      {!demoMode && (
        <View style={styles.bottom}>
          {displayNextBadge && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Badge')}
              activeOpacity={0.6}
              style={styles.nextBadgeSection}
            >
              <View style={styles.nextBadgeRow}>
                <View style={styles.nextBadgeLabel}>
                  <Text style={styles.nextBadgeText}>NEXT </Text>
                  <Svg width={13} height={14} viewBox="4 7 92 106" style={{ marginLeft: -2, opacity: 0.7 }}>
                    <Path d={HEX_OUTER} fill="none" stroke={colors.white} strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
                  </Svg>
                  <Text style={styles.nextBadgeText}>: {displayNextBadge.number} {displayNextBadge.unit}</Text>
                </View>
                <Text style={styles.nextBadgeCount}>{Math.min(streak, displayNextBadge.days)}/{displayNextBadge.days}</Text>
              </View>
              <View style={styles.progressPill}>
                <Animated.View style={[styles.progressFill, {
                  width: badgeProgressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                }]} />
              </View>
            </TouchableOpacity>
          )}
          <Text style={styles.longestStreak}>LONGEST STREAK: {longestStreak} DAYS</Text>
        </View>
      )}

      {/* Confirmation overlay — Modal covers full screen including safe areas */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Text style={styles.confirmHeadline}>ARE YOU SURE?</Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity style={styles.noButton} onPress={handleConfirmNo} activeOpacity={0.8}>
              <Text style={styles.noText}>NO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.yesButton} onPress={handleConfirmYes} activeOpacity={0.8}>
              <Text style={styles.yesText}>YES</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>

      {badgeOverlayVisible && activeMilestone && (
        <Animated.View style={[styles.badgeOverlay, { opacity: badgeOverlayAnim }]}>
          <Text style={styles.badgeEarnedLabel}>EARNED:</Text>
          <View style={styles.overlayBadge}>
            <Svg
              width={OVERLAY_BADGE_W}
              height={OVERLAY_BADGE_H}
              viewBox="4 7 92 106"
              style={StyleSheet.absoluteFill}
            >
              <Path d={HEX_OUTER} fill="#ffffff" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
              <Path d={HEX_INNER} fill="none" stroke="#0a0a0a" strokeWidth="4" strokeLinejoin="round" />
            </Svg>
            <View style={styles.overlayBadgeTextWrapper}>
              <Text style={styles.overlayBadgeNumber}>{activeMilestone.number}</Text>
              <Text style={styles.overlayBadgeUnit}>{activeMilestone.unit}</Text>
            </View>
          </View>
          {activeMilestone.lines ? (
            <View style={styles.badgeQuoteLines}>
              {activeMilestone.lines.map((word) => (
                <Text key={word} style={styles.badgeQuoteLine}>{word}</Text>
              ))}
            </View>
          ) : (
            <Text style={styles.badgeQuote}>{activeMilestone.quote}</Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  youVsYouContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  youVsYou: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.white,
    opacity: 0.3,
    letterSpacing: 6,
  },
  center: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  miniDivider: {
    height: 1,
    backgroundColor: colors.white,
    opacity: 0.5,
    marginTop: 4,
  },
  daysClean: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.white,
    letterSpacing: 8,
    marginTop: 16,
  },
  numberWrapper: {
    marginVertical: 48,
    width: '100%',
    alignItems: 'center',
  },
  numberContainer: {
    height: 160,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
  },
  sinceAndBadge: {
    position: 'absolute',
    top: 178,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  odometerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteText: {
    fontFamily: fonts.display,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 3,
    lineHeight: 30,
  },
  sinceText: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.white,
    opacity: 0.4,
    letterSpacing: 3,
  },
  nextBadgeSection: {
    width: '100%',
    gap: 6,
  },
  nextBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextBadgeLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextBadgeText: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.white,
    opacity: 0.5,
    letterSpacing: 2,
  },
  nextBadgeCount: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.white,
    opacity: 0.35,
    letterSpacing: 1,
  },
  progressPill: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  resetWrapper: {
    marginTop: 16,
  },
  progressRingSvg: {
    position: 'absolute',
  },
  resetButton: {
    borderColor: colors.white,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: colors.background,
    paddingVertical: 14,
    paddingHorizontal: 48,
    overflow: 'hidden',
  },
  flashOverlay: {
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  resetText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 6,
  },
  bottomSpacer: {
    flex: 1,
  },
  bottom: {
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.white,
  },
  longestStreak: {
    fontFamily: fonts.display,
    fontSize: 10,
    color: colors.white,
    opacity: 0.5,
    letterSpacing: 3,
  },
  // Confirmation overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  confirmHeadline: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.white,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 40,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  yesButton: {
    flex: 1,
    borderColor: colors.white,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: colors.background,
    paddingVertical: 16,
    alignItems: 'center',
  },
  yesText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 6,
  },
  noButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingVertical: 16,
    alignItems: 'center',
  },
  noText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.background,
    letterSpacing: 6,
  },
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  badgeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 120,
    pointerEvents: 'box-only',
  },
  badgeEarnedLabel: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.white,
    letterSpacing: 8,
    marginLeft: 10,
  },
  overlayBadge: {
    width: OVERLAY_BADGE_W,
    height: OVERLAY_BADGE_H,
    position: 'relative',
  },
  overlayBadgeTextWrapper: {
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
  overlayBadgeNumber: {
    fontFamily: fonts.display,
    fontSize: 64,
    lineHeight: 68,
    color: '#0a0a0a',
    textAlign: 'center',
    letterSpacing: -6,
  },
  overlayBadgeUnit: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: '#0a0a0a',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: -2,
    marginLeft: 6,
  },
  badgeQuote: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.white,
    opacity: 0.35,
    letterSpacing: 4,
    marginTop: 20,
  },
  badgeQuoteLines: {
    position: 'absolute',
    bottom: 210,
    left: 10,
    right: 0,
    alignItems: 'center',
    gap: 0,
  },
  badgeQuoteLine: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.white,
    opacity: 0.7,
    letterSpacing: 6,
    textAlign: 'center',
  },
});
