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
import OnboardingProgress from '../../components/OnboardingProgress';

// Extra padding around reset button so the SVG progress ring is fully visible
const EXPOSE_PAD = 40;
// Tight padding for streak number spotlight — just enough to show the number itself
const STREAK_PAD = 16;
// Shifts the streak spotlight gap downward so it sits more centered on the number visually
const STREAK_OFFSET = 10;
// Screen height used to compute bottomOverlay height
const SCREEN_HEIGHT = Dimensions.get('window').height;
// Extra time to let text sit after the typewriter finishes before advancing
const DWELL_MS = 1500;

// 0-indexed. duration=null means user-triggered (no auto-advance).
const STEPS = [
  { duration: 4000, script: 'THIS IS YOUR HOME BASE.', dwell: 2700 },
  { duration: 4000, script: 'THE NUMBER IN THE CENTER IS YOUR DAYS CLEAN.', dwell: 3500 },
  { duration: null,  script: 'HOLD THE RESET BUTTON.', userTriggered: true },
  { duration: 4000, script: 'YOUR STREAK LINKS TO YOUR FULL CALENDAR HISTORY.', dwell: 5000 },
  { duration: 4000, script: 'EARN BADGES AS YOUR STREAK GROWS.', dwell: 5000 },
  { duration: 4000, script: 'ADJUST YOUR SETTINGS HERE.', dwell: 5000 },
  { duration: 3000, script: null, final: true },
];

// Type char-by-char but replace spaces at measured line-break positions with \n,
// so words that wrap always start on their correct line from the first character.
function buildDisplayText(text, chars, lineBreaks) {
  if (!lineBreaks || lineBreaks.size === 0) return text.slice(0, chars);
  let result = '';
  for (let i = 0; i < chars && i < text.length; i++) {
    result += lineBreaks.has(i) ? '\n' : text[i];
  }
  return result;
}

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

// Bouncing arrow — true sine-wave oscillation via four segments with sinusoidal easing.
// Each quarter-cycle uses easeOut or easeIn sin so velocity is continuous at every junction,
// including the loop boundary (ends at 0, restarts at 0 → no jump).
function StreakArrow({ x, y, opacity, label = '→' }) {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(offset, { toValue: 10,  duration: 500, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(offset, { toValue: 0,   duration: 500, easing: Easing.in(Easing.sin),  useNativeDriver: true }),
        Animated.timing(offset, { toValue: -10, duration: 500, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(offset, { toValue: 0,   duration: 500, easing: Easing.in(Easing.sin),  useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y - 22,
        opacity,
        transform: [{ translateX: offset }],
        pointerEvents: 'none',
      }}
    >
      <Text style={styles.streakArrow}>{label}</Text>
    </Animated.View>
  );
}

// 8px dot + pulsing ring expanding to 44px, loops every 1.2s
function TapIndicator({ x, y, showDot = true }) {
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
    <View pointerEvents="none" style={{ position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60 }}>
      {showDot && <View style={[styles.tapDot, { left: 26, top: 26 }]} />}
      <Animated.View style={[styles.tapRing, { left: 26, top: 26, transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
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

  // Hide reset tap indicator once the hold completes
  const [resetHoldDone, setResetHoldDone] = useState(false);

  // Spotlight overlay — two bands (top + bottom) whose gap IS the spotlight.
  // topH: height of topOverlay (everything above the spotlight).
  // botH: height of bottomOverlay (everything below the spotlight).
  // Both start at 0 so they occupy no space when spotlight is off.
  // useNativeDriver: false required for height; opacity lives in inner nested View.
  const topH = useRef(new Animated.Value(0)).current;
  const botH = useRef(new Animated.Value(0)).current;

  // spotOpacity: fades counter/streak/badge/settings spotlight bands — useNativeDriver: true (inner view only).
  const spotOpacity = useRef(new Animated.Value(0)).current;

  // resetSpotOpacity: fades the dedicated reset button spotlight bands — crossfades with spotOpacity.
  const resetSpotOpacity = useRef(new Animated.Value(0)).current;

  // resetTopH / resetBotH: heights for reset spotlight bands — fixed from first layout measurement.
  // useNativeDriver: false required for height.
  const resetTopH = useRef(new Animated.Value(0)).current;
  const resetBotH = useRef(new Animated.Value(0)).current;

  // fullAlpha: full-screen dim used for non-spotlight steps (3-5) and final.
  // useNativeDriver: true — lives on its own Animated.View with no layout animation.
  const fullAlpha = useRef(new Animated.Value(0)).current;

  // Script + final text opacities
  const scriptOpacity      = useRef(new Animated.Value(0)).current;
  const finalTextOpacity   = useRef(new Animated.Value(0)).current;
  // Shown during the quote animation that plays after reset hold completes
  const quoteScriptOpacity = useRef(new Animated.Value(0)).current;
  // Arrow indicator opacity for the calendar explanation step
  const arrowOpacity         = useRef(new Animated.Value(0)).current;
  // Arrow indicators for badge (step 4) and settings (step 5)
  const badgeArrowOpacity    = useRef(new Animated.Value(0)).current;
  const settingsArrowOpacity = useRef(new Animated.Value(0)).current;

  // Measured line-break char positions for current step — populated by hidden Text onTextLayout
  const [stepBreaks, setStepBreaks] = useState(new Set());
  // Step 0 typewriter — character count revealed so far
  const [typewriterChars,      setTypewriterChars]      = useState(0);
  const typewriterInterval     = useRef(null);
  // Quote script typewriter — two-line, shown after reset hold
  const [quoteLine1Chars, setQuoteLine1Chars] = useState(0);
  const [quoteLine2Chars, setQuoteLine2Chars] = useState(0);
  const quoteTypewriterInterval = useRef(null);

  // Refs for layout values — avoids stale closures in timeout callbacks
  const streakLayoutRef   = useRef(null);
  const resetLayoutRef    = useRef(null);
  const badgeLayoutRef    = useRef(null);
  const settingsLayoutRef = useRef(null);

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
    if (key === 'resetButton')  {
      setResetLayout(value);
      resetLayoutRef.current = value;
      resetTopH.setValue(Math.max(0, value.y - EXPOSE_PAD));
      resetBotH.setValue(Math.max(0, SCREEN_HEIGHT - (value.y + value.height + EXPOSE_PAD)));
    }
    if (key === 'streakNumber') { setStreakLayout(value);  streakLayoutRef.current = value; }
    if (key === 'badgeIcon')    { setBadgeLayout(value);    badgeLayoutRef.current = value; }
    if (key === 'settingsIcon') { setSettingsLayout(value); settingsLayoutRef.current = value; }
  }, []);

  function startStep(idx) {
    if (!isMounted.current || idx >= STEPS.length) return;
    if (isAnimating.current) return;
    isAnimating.current = true;
    setCurrentStep(idx);
    const step = STEPS[idx];
    // For scripted steps, wait until the typewriter finishes then dwell before advancing.
    // For non-scripted/final steps, use the fixed duration from STEPS.
    const effectiveDuration = step.script
      ? 200 + step.script.length * 60 + (step.dwell ?? DWELL_MS)
      : step.duration;

    if (step.final) {
      // Full-screen dim to 0.92 for final message
      Animated.timing(fullAlpha, { toValue: 0.92, duration: 1200, useNativeDriver: true }).start();
    } else if (idx === 0) {
      // No overlay at all — HomeScreen fully visible
      Animated.timing(fullAlpha,   { toValue: 0, duration: 600, useNativeDriver: true }).start();
      Animated.timing(spotOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
    } else if (idx === 1) {
      // Streak spotlight — snap band heights, then fade in
      const sl = streakLayoutRef.current;
      if (sl) {
        topH.setValue(Math.max(0, sl.y - STREAK_PAD + STREAK_OFFSET));
        botH.setValue(Math.max(0, SCREEN_HEIGHT - (sl.y + sl.height + STREAK_PAD + STREAK_OFFSET)));
      }
      // 50ms delay lets layout settle before fade begins
      addTimeout(() => {
        Animated.timing(spotOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
      }, 50);
    } else if (idx === 2) {
      // Reset spotlight already showing via resetSpotOpacity crossfade from step 1 — nothing to do here.
    } else if (idx === 3) {
      // Transition from reset spotlight back to streak spotlight (topH/botH still at streak position).
      Animated.timing(resetSpotOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
      Animated.timing(spotOpacity,      { toValue: 1, duration: 700, useNativeDriver: true }).start();
    } else if (idx === 4 || idx === 5) {
      // Badge / settings spotlight — called after slide, so bands already positioned.
      // Snap heights as a fallback in case we arrive here without a prior slide.
      const layout = idx === 4 ? badgeLayoutRef.current : settingsLayoutRef.current;
      if (layout) {
        topH.setValue(Math.max(0, layout.y - EXPOSE_PAD));
        botH.setValue(Math.max(0, SCREEN_HEIGHT - (layout.y + layout.height + EXPOSE_PAD)));
      }
      Animated.timing(fullAlpha, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      addTimeout(() => {
        Animated.timing(spotOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
      }, 50);
    } else {
      // Non-spotlight step — fade out spotlight, fade in full-screen dim
      Animated.timing(spotOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
      Animated.timing(fullAlpha,   { toValue: 0.8, duration: 700, useNativeDriver: true }).start();
    }

    if (step.script) {
      scriptOpacity.setValue(0);
      addTimeout(() => {
        Animated.timing(scriptOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        setTypewriterChars(0);
        clearInterval(typewriterInterval.current);
        const full = step.script.length;
        typewriterInterval.current = setInterval(() => {
          setTypewriterChars(prev => {
            const next = prev + 1;
            if (next >= full) clearInterval(typewriterInterval.current);
            return next;
          });
        }, 60);
      }, 200);
    }

    if (step.final) {
      addTimeout(() => {
        Animated.timing(finalTextOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }).start();
      }, 400);
      addTimeout(() => navigation.navigate('Paywall'), effectiveDuration);
      return;
    }

    if (step.userTriggered) return; // waits for onDemoResetComplete

    addTimeout(() => {
      Animated.timing(scriptOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
      if (idx === 3) Animated.timing(arrowOpacity,         { toValue: 0, duration: 600, useNativeDriver: true }).start();
      if (idx === 4) Animated.timing(badgeArrowOpacity,    { toValue: 0, duration: 600, useNativeDriver: true }).start();
      if (idx === 5) Animated.timing(settingsArrowOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
    }, effectiveDuration - 500);

    if (idx === 3) {
      arrowOpacity.setValue(0);
      addTimeout(() => {
        Animated.timing(arrowOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
      }, 200);
    }
    if (idx === 4) {
      badgeArrowOpacity.setValue(0);
      addTimeout(() => {
        Animated.timing(badgeArrowOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
      }, 200);
    }
    if (idx === 5) {
      settingsArrowOpacity.setValue(0);
      addTimeout(() => {
        Animated.timing(settingsArrowOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
      }, 200);
    }

    // Step 1 → 2: crossfade counter spotlight out and reset spotlight in simultaneously.
    // Pure opacity crossfade — both use useNativeDriver: true, no height changes needed.
    if (idx === 1) {
      addTimeout(() => {
        Animated.timing(spotOpacity, { toValue: 0, duration: 700, useNativeDriver: true }).start(() => {
          if (!isMounted.current) return;
          const rl = resetLayoutRef.current;
          if (rl) {
            topH.setValue(Math.max(0, rl.y - EXPOSE_PAD));
            botH.setValue(Math.max(0, SCREEN_HEIGHT - (rl.y + rl.height + EXPOSE_PAD)));
          }
          Animated.timing(spotOpacity, { toValue: 1, duration: 900, useNativeDriver: true }).start(() => {
            if (!isMounted.current) return;
            isAnimating.current = false;
            startStep(2);
          });
        });
      }, effectiveDuration);
      return;
    }

    // Step 3: fade out current spotlight, snap to badge icon, fade back in, then advance to step 4
    if (idx === 3) {
      addTimeout(() => {
        Animated.timing(spotOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => {
          const bl = badgeLayoutRef.current;
          if (bl) {
            topH.setValue(Math.max(0, bl.y - EXPOSE_PAD));
            botH.setValue(Math.max(0, SCREEN_HEIGHT - (bl.y + bl.height + EXPOSE_PAD)));
          }
          Animated.timing(spotOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start(() => {
            isAnimating.current = false;
            startStep(4);
          });
        });
      }, effectiveDuration);
      return;
    }

    addTimeout(() => {
      isAnimating.current = false;
      startStep(idx + 1);
    }, effectiveDuration);
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
      clearInterval(quoteTypewriterInterval.current);
      [spotOpacity, resetSpotOpacity, fullAlpha, scriptOpacity, finalTextOpacity, quoteScriptOpacity, arrowOpacity, badgeArrowOpacity, settingsArrowOpacity].forEach(v => v.stopAnimation());
    };
  }, []);

  // Fired by HomeScreen when the 3s hold completes in demo mode.
  // Animates topOverlay upward to expose the streak + quote area during reset sequence.
  const onDemoHoldComplete = useCallback(() => {
    if (!isMounted.current) return;
    setResetHoldDone(true);
    // Fade out the "HOLD THE RESET BUTTON" script immediately
    Animated.timing(scriptOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
    const sl = streakLayoutRef.current;
    if (!sl) return;
    Animated.timing(topH, {
      toValue: Math.max(0, sl.y - STREAK_PAD),
      duration: 900,
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fired by HomeScreen after quote fades out and streak number shows 0.
  // Spotlight stays on the 0 for 2s, then startStep(3) handles the dim transition.
  const onDemoResetComplete = useCallback(() => {
    if (!isMounted.current) return;
    // Two-line typewriter: "IF YOU RELAPSE..." pause, then "YOU'LL SEE A QUOTE."
    const LINE1 = "IF YOU RELAPSE...";
    const LINE2 = "YOU'LL SEE A QUOTE.";
    const CHAR_SPEED = 60;
    const PAUSE = 900;
    quoteScriptOpacity.setValue(0);
    Animated.timing(quoteScriptOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    setQuoteLine1Chars(0);
    setQuoteLine2Chars(0);
    clearInterval(quoteTypewriterInterval.current);
    quoteTypewriterInterval.current = setInterval(() => {
      setQuoteLine1Chars(prev => {
        const next = prev + 1;
        if (next >= LINE1.length) {
          clearInterval(quoteTypewriterInterval.current);
          // Dramatic pause, then typewriter line 2
          addTimeout(() => {
            if (!isMounted.current) return;
            quoteTypewriterInterval.current = setInterval(() => {
              setQuoteLine2Chars(prev2 => {
                const next2 = prev2 + 1;
                if (next2 >= LINE2.length) clearInterval(quoteTypewriterInterval.current);
                return next2;
              });
            }, CHAR_SPEED);
          }, PAUSE);
        }
        return next;
      });
    }, CHAR_SPEED);
    // line1: 17*60=1020ms + pause 900ms + line2: 19*60=1140ms + dwell 3500ms
    const totalDuration = LINE1.length * CHAR_SPEED + PAUSE + LINE2.length * CHAR_SPEED + 3500;
    addTimeout(() => {
      Animated.timing(quoteScriptOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
    }, totalDuration - 600);
    addTimeout(() => {
      isAnimating.current = false;
      startStep(3);
    }, totalDuration);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = STEPS[currentStep];

  // Centers for tap indicators
  const resetCenter = resetLayout ? { x: resetLayout.x + resetLayout.width / 2, y: resetLayout.y + resetLayout.height / 2 } : null;

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
        resetDisabled={currentStep !== 2 || resetHoldDone}
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

      {/* Reset spotlight — dedicated bands, always mounted, fixed at reset button position.
          Crossfades with the counter spotlight during step 1→2 transition. */}
      <Animated.View
        pointerEvents="box-only"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: resetTopH }}
      >
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', opacity: resetSpotOpacity }} />
        <Animated.View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, opacity: resetSpotOpacity }}>
          <LinearGradient
            colors={['rgba(0,0,0,0.82)', 'transparent']}
            style={{ flex: 1, pointerEvents: 'none' }}
          />
        </Animated.View>
      </Animated.View>
      <Animated.View
        pointerEvents="box-only"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: resetBotH }}
      >
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', opacity: resetSpotOpacity }} />
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, opacity: resetSpotOpacity }}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.82)']}
            style={{ flex: 1, pointerEvents: 'none' }}
          />
        </Animated.View>
      </Animated.View>

      {/* Full-screen dim — non-spotlight steps and final */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.82)', opacity: fullAlpha }]}
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

      {/* Tap indicators — steps 2/3/4/5 (reset, streak, badge, settings) */}
      {currentStep === 2 && !resetHoldDone && resetCenter && <TapIndicator key="reset" x={resetCenter.x} y={resetCenter.y} showDot={false} />}
      {currentStep === 3 && streakLayout && (
        <StreakArrow x={streakLayout.x + streakLayout.width / 2 - 96} y={streakLayout.y + streakLayout.height / 2} opacity={arrowOpacity} />
      )}
      {currentStep === 4 && badgeLayout && (
        <StreakArrow x={badgeLayout.x + badgeLayout.width + 28} y={badgeLayout.y + badgeLayout.height / 2 - 5} opacity={badgeArrowOpacity} label="←" />
      )}
      {currentStep === 5 && settingsLayout && (
        <StreakArrow x={settingsLayout.x - 52} y={settingsLayout.y + settingsLayout.height / 2 - 5} opacity={settingsArrowOpacity} label="→" />
      )}

      {/* Quote script — two lines with dramatic pause between them */}
      <Animated.View
        pointerEvents="none"
        style={[styles.scriptBar, { bottom: insets.bottom + 60, opacity: quoteScriptOpacity }]}
      >
        <View style={{ height: 44, justifyContent: 'flex-start' }}>
          <Text style={styles.scriptText}>{"IF YOU RELAPSE...".slice(0, quoteLine1Chars)}</Text>
          <Text style={styles.scriptText}>{"YOU'LL SEE A QUOTE.".slice(0, quoteLine2Chars)}</Text>
        </View>
      </Animated.View>

      {/* Hidden measurement text — same font/width as scriptBar content, off-screen.
          onTextLayout fires with actual line breaks so we can insert \n in the typewriter. */}
      {step?.script && (
        <Text
          style={[styles.scriptText, styles.measureText]}
          onTextLayout={(e) => {
            const lines = e.nativeEvent.lines;
            if (lines.length <= 1) { setStepBreaks(new Set()); return; }
            const lb = new Set();
            let pos = 0;
            lines.slice(0, -1).forEach(line => {
              pos += line.text.length;
              if (line.text.endsWith(' ')) lb.add(pos - 1);
            });
            setStepBreaks(lb);
          }}
        >
          {step.script}
        </Text>
      )}

      {/* Script bar — full width, 70px tall, fixed above safe area */}
      {step?.script && (
        <Animated.View
          pointerEvents="none"
          style={[styles.scriptBar, { bottom: insets.bottom + 60, opacity: scriptOpacity }]}
        >
          <View style={{ height: 44, justifyContent: stepBreaks.size > 0 ? 'flex-start' : 'center' }}>
            <Text style={styles.scriptText}>
              {buildDisplayText(step.script, typewriterChars, stepBreaks)}
            </Text>
          </View>
        </Animated.View>
      )}

      <OnboardingProgress currentStep={4} />

      {/* SKIP — always topmost */}
      <TouchableOpacity
        style={[styles.skipButton, { bottom: insets.bottom + 24 }]}
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
    lineHeight: 22,
  },
  measureText: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: -200,
    opacity: 0,
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
  streakArrow: {
    fontSize: 44,
    color: colors.white,
  },
});
