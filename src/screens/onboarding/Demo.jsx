import { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import HomeScreen from '../HomeScreen';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

// Extra padding around reset button so the SVG progress ring is fully visible
const EXPOSE_PAD = 40;
// Tight padding for streak number spotlight — just enough to show the number itself
const STREAK_PAD = 16;
// Screen height used to compute bottomOverlay height
const SCREEN_HEIGHT = Dimensions.get('window').height;

// 0-indexed. duration=null means user-triggered (no auto-advance).
const STEPS = [
  { duration: 4000, script: 'THIS IS YOUR HOME BASE.' },
  { duration: 4000, script: 'THE NUMBER IN THE CENTER IS YOUR DAYS CLEAN. YOUR ONLY METRIC.' },
  { duration: null,  script: 'HOLD THE RESET BUTTON NOW. FEEL WHAT IT COSTS.', userTriggered: true },
  { duration: 4000, script: 'TAP YOUR STREAK NUMBER TO SEE EVERY DAY LOGGED.' },
  { duration: 4000, script: 'THE HEXAGON TRACKS YOUR EARNED BADGES.' },
  { duration: 4000, script: 'SETTINGS. NOTIFICATIONS. INTENSITY. ALL HERE.' },
  { duration: 3000, script: null, final: true },
];

const MOCK_NAV = {
  navigate: () => {},
  goBack: () => {},
  push: () => {},
  replace: () => {},
  reset: () => {},
  dispatch: () => {},
  addListener: () => ({ remove: () => {} }),
  removeListener: () => {},
  isFocused: () => true,
  canGoBack: () => false,
  setOptions: () => {},
  setParams: () => {},
  getState: () => null,
  getParent: () => null,
};

// 8px dot + pulsing ring expanding to 44px, loops every 1.2s
function TapIndicator({ x, y }) {
  const ringScale   = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(ringScale,   { toValue: 5.5, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0,   duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - 4, top: y - 4 }}>
      <View style={styles.tapDot} />
      <Animated.View style={[styles.tapRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
    </View>
  );
}

export default function Demo({ navigation }) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);

  // Layout positions from HomeScreen elements
  const [resetLayout,    setResetLayout]    = useState(null);
  const [streakLayout,   setStreakLayout]    = useState(null);
  const [badgeLayout,    setBadgeLayout]     = useState(null);
  const [settingsLayout, setSettingsLayout]  = useState(null);

  // Spotlight overlay — two bands (top + bottom) whose gap IS the spotlight.
  // topH: height of topOverlay (everything above the spotlight).
  // botH: height of bottomOverlay (everything below the spotlight).
  // Both start at 0 so they occupy no space when spotlight is off.
  // useNativeDriver: false required for height; opacity lives in inner nested View.
  const topH = useRef(new Animated.Value(0)).current;
  const botH = useRef(new Animated.Value(0)).current;

  // spotOpacity: fades both spotlight bands in/out — useNativeDriver: true (inner view only).
  const spotOpacity = useRef(new Animated.Value(0)).current;

  // fullAlpha: full-screen dim used for non-spotlight steps (3-5) and final.
  // useNativeDriver: true — lives on its own Animated.View with no layout animation.
  const fullAlpha = useRef(new Animated.Value(0)).current;

  // Script + final text opacities
  const scriptOpacity    = useRef(new Animated.Value(0)).current;
  const finalTextOpacity = useRef(new Animated.Value(0)).current;

  // Step 0 typewriter — character count revealed so far
  const [typewriterChars,   setTypewriterChars]   = useState(0);
  const typewriterInterval = useRef(null);

  // Refs for layout values — avoids stale closures in timeout callbacks
  const streakLayoutRef = useRef(null);
  const resetLayoutRef  = useRef(null);

  const timers      = useRef([]);
  const isMounted   = useRef(true);
  // Prevents duplicate startStep calls (Strict Mode double-fire, race conditions).
  const isAnimating = useRef(false);

  function addTimeout(fn, ms) {
    const id = setTimeout(() => { if (isMounted.current) fn(); }, ms);
    timers.current.push(id);
    return id;
  }

  const onLayoutMeasured = useCallback((key, value) => {
    if (key === 'resetButton')  { setResetLayout(value);  resetLayoutRef.current = value; }
    if (key === 'streakNumber') { setStreakLayout(value);  streakLayoutRef.current = value; }
    if (key === 'badgeIcon')    setBadgeLayout(value);
    if (key === 'settingsIcon') setSettingsLayout(value);
  }, []);

  function startStep(idx) {
    if (!isMounted.current || idx >= STEPS.length) return;
    if (isAnimating.current) return;
    isAnimating.current = true;
    setCurrentStep(idx);
    const step = STEPS[idx];

    if (step.final) {
      // Full-screen dim to 0.92 for final message
      Animated.timing(fullAlpha, { toValue: 0.92, duration: 800, useNativeDriver: true }).start();
    } else if (idx === 0) {
      // No overlay at all — HomeScreen fully visible
      Animated.timing(fullAlpha,   { toValue: 0, duration: 300, useNativeDriver: true }).start();
      Animated.timing(spotOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else if (idx === 1) {
      // Streak spotlight — snap band heights, then fade in
      const sl = streakLayoutRef.current;
      if (sl) {
        topH.setValue(Math.max(0, sl.y - STREAK_PAD));
        botH.setValue(Math.max(0, SCREEN_HEIGHT - (sl.y + sl.height + STREAK_PAD)));
      }
      // 50ms delay lets layout settle before fade begins
      addTimeout(() => {
        Animated.timing(spotOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }, 50);
    } else if (idx === 2) {
      // Reset button spotlight — snap band heights, then fade in
      const rl = resetLayoutRef.current;
      if (rl) {
        topH.setValue(Math.max(0, rl.y - EXPOSE_PAD));
        botH.setValue(Math.max(0, SCREEN_HEIGHT - (rl.y + rl.height + EXPOSE_PAD)));
      }
      // 50ms delay prevents the brief flicker before spotlight appears
      addTimeout(() => {
        Animated.timing(spotOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }, 50);
    } else {
      // Non-spotlight step — fade out spotlight, fade in full-screen dim
      Animated.timing(spotOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      Animated.timing(fullAlpha,   { toValue: 0.8, duration: 400, useNativeDriver: true }).start();
    }

    if (step.script) {
      scriptOpacity.setValue(0);
      addTimeout(() => {
        Animated.timing(scriptOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        if (idx === 0) {
          setTypewriterChars(0);
          clearInterval(typewriterInterval.current);
          const full = STEPS[0].script.length;
          typewriterInterval.current = setInterval(() => {
            setTypewriterChars(prev => {
              const next = prev + 1;
              if (next >= full) clearInterval(typewriterInterval.current);
              return next;
            });
          }, 60);
        }
      }, 200);
    }

    if (step.final) {
      addTimeout(() => {
        Animated.timing(finalTextOpacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      }, 400);
      addTimeout(() => navigation.navigate('Paywall'), step.duration);
      return;
    }

    if (step.userTriggered) return; // waits for onDemoResetComplete

    addTimeout(() => {
      Animated.timing(scriptOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, step.duration - 500);

    // Step 1: fade out spotlight bands, then advance to step 2
    if (idx === 1) {
      addTimeout(() => {
        Animated.timing(spotOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          isAnimating.current = false;
          startStep(2);
        });
      }, step.duration);
      return;
    }

    addTimeout(() => {
      isAnimating.current = false;
      startStep(idx + 1);
    }, step.duration);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    isMounted.current   = true;
    isAnimating.current = false;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    startStep(0);

    return () => {
      isMounted.current   = false;
      isAnimating.current = false;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      clearInterval(typewriterInterval.current);
      [spotOpacity, fullAlpha, scriptOpacity, finalTextOpacity].forEach(v => v.stopAnimation());
    };
  }, []);

  // Fired by HomeScreen when the 3s hold completes in demo mode.
  // Animates topOverlay upward to expose the streak + quote area during reset sequence.
  const onDemoHoldComplete = useCallback(() => {
    if (!isMounted.current) return;
    const sl = streakLayoutRef.current;
    if (!sl) return;
    Animated.timing(topH, {
      toValue: Math.max(0, sl.y - STREAK_PAD),
      duration: 600,
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fired by HomeScreen after quote fades out and streak number shows 0.
  // Fades out spotlight, fades in full dim, then advances to step 3 after 2s pause.
  const onDemoResetComplete = useCallback(() => {
    if (!isMounted.current) return;
    Animated.timing(scriptOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.timing(spotOpacity, { toValue: 0,   duration: 400, useNativeDriver: true }),
      Animated.timing(fullAlpha,   { toValue: 0.8, duration: 400, useNativeDriver: true }),
    ]).start();
    addTimeout(() => {
      isAnimating.current = false;
      startStep(3);
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = STEPS[currentStep];

  // Centers for tap indicators
  const streakCenter   = streakLayout   ? { x: streakLayout.x   + streakLayout.width   / 2, y: streakLayout.y   + streakLayout.height   / 2 } : null;
  const badgeCenter    = badgeLayout    ? { x: badgeLayout.x    + badgeLayout.width    / 2, y: badgeLayout.y    + badgeLayout.height    / 2 } : null;
  const settingsCenter = settingsLayout ? { x: settingsLayout.x + settingsLayout.width / 2, y: settingsLayout.y + settingsLayout.height / 2 } : null;

  return (
    <View style={styles.root}>
      {/* Real HomeScreen — all interactions live */}
      <HomeScreen
        navigation={MOCK_NAV}
        demoMode
        initialStreak={21}
        onLayoutMeasured={onLayoutMeasured}
        onDemoResetComplete={onDemoResetComplete}
        onDemoHoldComplete={onDemoHoldComplete}
      />

      {/* Bottom caption gradient — makes script text readable during step 0 (no overlay dim) */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, pointerEvents: 'none' }}
      />

      {/*
        Spotlight — two opaque bands. The gap between them IS the spotlight.
        Nothing is rendered in the gap so HomeScreen shows through at full brightness.

        Outer Animated.View owns height (non-native driver).
        Inner Animated.View owns opacity (native driver).
        Separated into nested views to avoid mixing driver types on one node.
      */}
      <Animated.View
        pointerEvents="box-only"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topH }}
      >
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', opacity: spotOpacity }} />
        {/* Feather at bottom edge of top band */}
        <Animated.View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, opacity: spotOpacity }}>
          <LinearGradient
            colors={['rgba(0,0,0,0.82)', 'transparent']}
            style={{ flex: 1, pointerEvents: 'none' }}
          />
        </Animated.View>
      </Animated.View>
      <Animated.View
        pointerEvents="box-only"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: botH }}
      >
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', opacity: spotOpacity }} />
        {/* Feather at top edge of bottom band */}
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, opacity: spotOpacity }}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.82)']}
            style={{ flex: 1, pointerEvents: 'none' }}
          />
        </Animated.View>
      </Animated.View>

      {/* Full-screen dim — non-spotlight steps and final */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', opacity: fullAlpha }]}
      />

      {/* Final text — YOUR STREAK STARTS NOW. */}
      {step?.final && (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.finalContainer, { opacity: finalTextOpacity }]}
          pointerEvents="none"
        >
          <Text style={styles.finalText}>YOUR STREAK{'\n'}STARTS NOW.</Text>
        </Animated.View>
      )}

      {/* Tap indicators — steps 3/4/5 (streak, badge, settings) */}
      {currentStep === 3 && streakCenter   && <TapIndicator key="streak"   x={streakCenter.x}   y={streakCenter.y}   />}
      {currentStep === 4 && badgeCenter    && <TapIndicator key="badge"    x={badgeCenter.x}    y={badgeCenter.y}    />}
      {currentStep === 5 && settingsCenter && <TapIndicator key="settings" x={settingsCenter.x} y={settingsCenter.y} />}

      {/* Script bar — full width, 70px tall, fixed above safe area */}
      {step?.script && (
        <Animated.View
          pointerEvents="none"
          style={[styles.scriptBar, { bottom: insets.bottom + 60, opacity: scriptOpacity }]}
        >
          <Text style={styles.scriptText}>
            {currentStep === 0 ? step.script.slice(0, typewriterChars) : step.script}
          </Text>
        </Animated.View>
      )}

      {/* SKIP — always topmost */}
      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + 12 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('Paywall');
        }}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.skipText}>SKIP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  finalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalText: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.white,
    letterSpacing: 5,
    textAlign: 'center',
    lineHeight: 48,
  },
  tapDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  tapRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  scriptBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scriptText: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.white,
    letterSpacing: 2,
    textAlign: 'center',
  },
  skipButton: {
    position: 'absolute',
    right: 24,
  },
  skipText: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.white,
    opacity: 0.4,
    letterSpacing: 2,
  },
});
