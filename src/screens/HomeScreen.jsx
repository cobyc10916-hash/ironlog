import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';
import { useStreak } from '../hooks/useStreak';

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

const HOLD_DURATION = 3000;
const GAP = 4;
const STROKE = 4;
const BUTTON_RADIUS = 8;
const QUOTE = 'THE ONLY WAY\nOUT IS THROUGH.';
const LOGGED_TEXT = 'LOGGED.';

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
      duration: 500,
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
  initialStreak = 132,
  demoMode = false,
  demoStreak,
  onLayoutMeasured,
  onDemoResetComplete,
  onDemoHoldComplete,
  resetDisabled = false,
}) {
  const { longestStreak } = useStreak();
  const [streak, setStreak] = useState(initialStreak);
  const prevStreakRef = useRef(initialStreak);
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

  const shouldAnimate = !demoMode && streak === prevStreakRef.current + 1;

  useEffect(() => {
    prevStreakRef.current = streak;
  }, [streak]);

  // Sync demoStreak prop into local streak state when in demo mode
  useEffect(() => {
    if (demoMode && demoStreak !== undefined && demoStreak !== null) {
      setStreak(demoStreak);
    }
  }, [demoMode, demoStreak]);

  const progress = useRef(new Animated.Value(0)).current;
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
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity
          ref={badgeRef}
          onPress={() => navigation.navigate('Badge')}
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

        <TouchableOpacity
          ref={streakRef}
          style={styles.numberContainer}
          onPress={() => navigation.navigate('Calendar')}
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
          <View style={styles.divider} />
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
  },
  numberContainer: {
    height: 160,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 48,
    paddingTop: 24,
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
});
