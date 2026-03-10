import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

// ─── Constants ─────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 20;

const ITEM_H        = 56;
const VISIBLE       = 5;
const PAD           = 2;
const PICKER_H      = ITEM_H * VISIBLE; // 280
const GAP           = 4;
const STROKE        = 4;
const HOLD_DURATION = 3000;
const BUTTON_RADIUS = 8;
const BADGE_THRESHOLDS = [7, 14, 30, 60, 100, 365];

const MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTH_FULL  = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Helpers ───────────────────────────────────────────────────────────────────
function calcDaysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function toDateStr(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function computeValidMonths(y, minDate, yesterday) {
  const minM = y === minDate.getFullYear() ? minDate.getMonth() + 1 : 1;
  const maxM = y === yesterday.getFullYear() ? yesterday.getMonth() + 1 : 12;
  return Array.from({ length: maxM - minM + 1 }, (_, i) => minM + i);
}

function computeValidDays(y, m, minDate, yesterday) {
  let minD = (y === minDate.getFullYear() && m === minDate.getMonth() + 1)
    ? minDate.getDate() : 1;
  let maxD = calcDaysInMonth(y, m);
  if (y === yesterday.getFullYear() && m === yesterday.getMonth() + 1) {
    maxD = Math.min(maxD, yesterday.getDate());
  }
  if (minD > maxD) minD = maxD;
  return Array.from({ length: maxD - minD + 1 }, (_, i) => minD + i);
}

function getRingMetrics(bw, bh) {
  const pw  = bw + 2 * GAP + STROKE;
  const ph  = bh + 2 * GAP + STROKE;
  const prx = BUTTON_RADIUS + GAP + STROKE / 2;
  const svgW = bw + 2 * (GAP + STROKE);
  const svgH = bh + 2 * (GAP + STROKE);
  const ox  = STROKE / 2;
  const oy  = STROKE / 2;
  const cx  = ox + pw / 2;

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

function calculateResetData(relapseDate, cleanDays, prevRelapseDays) {
  const newRelapseDays = new Set([...(prevRelapseDays || []), relapseDate]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let currentStreak = 0;
  const cursor = new Date(today);
  while (true) {
    const ds = toDateStr(cursor);
    if (newRelapseDays.has(ds)) break;
    if (!cleanDays?.has(ds)) break;
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const allClean = [...(cleanDays || [])]
    .filter(ds => !newRelapseDays.has(ds))
    .sort();

  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < allClean.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const diff = Math.round(
        (new Date(allClean[i]) - new Date(allClean[i - 1])) / 86400000,
      );
      run = diff === 1 ? run + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, run);
  }

  const unearnedBadges = BADGE_THRESHOLDS.filter(t => t > longestStreak);
  return { currentStreak, longestStreak, unearnedBadges };
}

// ─── Scroll Picker Column ──────────────────────────────────────────────────────
// Centering fix: onScrollEndDrag fires BEFORE snapToInterval finishes animating,
// so reading contentOffset there gives a pre-snap position → wrong index + jerk.
// Fix: track live scroll position via onScroll + a ref. For slow drags (no
// momentum), wait 150ms after onScrollEndDrag so the snap settles, then read
// the ref. For fast flings, onMomentumScrollEnd fires with the final position.
const ScrollPickerColumn = React.memo(function ScrollPickerColumn({
  items, selectedIndex, onIndexChange, width,
}) {
  const ref            = useRef(null);
  const busy           = useRef(false);
  const momentumActive = useRef(false);
  const liveY          = useRef(selectedIndex * ITEM_H); // tracks current scroll pos

  // Programmatic scroll — only while user is not touching the column
  useEffect(() => {
    if (!busy.current) {
      const target = selectedIndex * ITEM_H;
      liveY.current = target;
      ref.current?.scrollTo({ y: target, animated: false });
    }
  }, [selectedIndex, items]);

  const trackScroll = useCallback((e) => {
    liveY.current = e.nativeEvent.contentOffset.y;
  }, []);

  const commit = useCallback(() => {
    busy.current = false;
    const idx = Math.max(0, Math.min(Math.round(liveY.current / ITEM_H), items.length - 1));
    onIndexChange(idx);
  }, [items.length, onIndexChange]);

  // Slow drag — no momentum. Wait for snapToInterval to finish, then read liveY.
  const handleScrollEndDrag = useCallback(() => {
    momentumActive.current = false;
    setTimeout(() => {
      if (!momentumActive.current) commit();
    }, 150);
  }, [commit]);

  const handleMomentumScrollBegin = useCallback(() => {
    momentumActive.current = true;
  }, []);

  // Fast fling — momentum did the work; snap is settled when this fires.
  const handleMomentumScrollEnd = useCallback(() => {
    momentumActive.current = false;
    commit();
  }, [commit]);

  const padded = useMemo(
    () => [...Array(PAD).fill(null), ...items, ...Array(PAD).fill(null)],
    [items],
  );

  return (
    <View style={{ width, height: PICKER_H, overflow: 'hidden' }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: selectedIndex * ITEM_H }}
        onScrollBeginDrag={() => { busy.current = true; }}
        onScroll={trackScroll}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollBegin={handleMomentumScrollBegin}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {padded.map((item, i) => {
          const ri  = i - PAD;
          const sel = ri === selectedIndex;
          return (
            <View key={i} style={styles.pickerCell}>
              {item != null && (
                <Text style={[styles.pickerText, !sel && styles.pickerTextDim]}>
                  {item}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function LogHistoricalResetScreen({
  navigation,
  onBack,
  onConfirmReset,
  installDate,
  todayOverride,
  cleanDays   = new Set(),
  relapseDays = new Set(),
}) {
  const goBack = () => { navigation?.goBack(); onBack?.(); };

  // ── Date bounds ──────────────────────────────────────────────────────────────
  const { minDate, yesterday, noDatesAvailable } = useMemo(() => {
    let today;
    if (todayOverride) {
      const [ty, tm, td] = todayOverride.split('-').map(Number);
      today = new Date(ty, tm - 1, td, 0, 0, 0, 0);
    } else {
      today = new Date();
      today.setHours(0, 0, 0, 0);
    }

    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);

    let min;
    if (installDate) {
      const [iy, im, id] = installDate.split('-').map(Number);
      min = new Date(iy, im - 1, id, 0, 0, 0, 0);
    } else {
      min = new Date(today);
      min.setDate(min.getDate() - 90);
    }

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const noData = min >= twoDaysAgo;

    return { minDate: min, yesterday: yest, noDatesAvailable: noData };
  }, [installDate, todayOverride]);

  // ── Picker state ─────────────────────────────────────────────────────────────
  const [year,  setYear]  = useState(yesterday.getFullYear());
  const [month, setMonth] = useState(yesterday.getMonth() + 1);
  const [day,   setDay]   = useState(yesterday.getDate());

  const [showModal,       setShowModal]       = useState(false);
  const [disclaimerShown, setDisclaimerShown] = useState(false);

  // ── Valid arrays ──────────────────────────────────────────────────────────────
  const validYears = useMemo(() => {
    const min = minDate.getFullYear();
    const max = yesterday.getFullYear();
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [minDate, yesterday]);

  const validMonths = useMemo(
    () => computeValidMonths(year, minDate, yesterday),
    [year, minDate, yesterday],
  );

  const validDays = useMemo(
    () => computeValidDays(year, month, minDate, yesterday),
    [year, month, minDate, yesterday],
  );

  // ── Column items ──────────────────────────────────────────────────────────────
  const dayItems   = useMemo(() => validDays.map(String),                    [validDays]);
  const monthItems = useMemo(() => validMonths.map(m => MONTH_SHORT[m - 1]), [validMonths]);
  const yearItems  = useMemo(() => validYears.map(String),                   [validYears]);

  const dayIdx   = validDays.indexOf(day);
  const monthIdx = validMonths.indexOf(month);
  const yearIdx  = validYears.indexOf(year);

  // ── Handlers — inline clamp so all three states update in ONE render ──────────
  const handleDayChange = useCallback((i) => {
    setDay(validDays[i]);
  }, [validDays]);

  const handleMonthChange = useCallback((i) => {
    const newMonth = validMonths[i];
    const newDays  = computeValidDays(year, newMonth, minDate, yesterday);
    const clampedDay = newDays.includes(day) ? day : newDays[newDays.length - 1];
    setMonth(newMonth);
    setDay(clampedDay);
  }, [validMonths, year, day, minDate, yesterday]);

  const handleYearChange = useCallback((i) => {
    const newYear      = validYears[i];
    const newMonths    = computeValidMonths(newYear, minDate, yesterday);
    const clampedMonth = newMonths.includes(month) ? month : newMonths[newMonths.length - 1];
    const newDays      = computeValidDays(newYear, clampedMonth, minDate, yesterday);
    const clampedDay   = newDays.includes(day) ? day : newDays[newDays.length - 1];
    setYear(newYear);
    setMonth(clampedMonth);
    setDay(clampedDay);
  }, [validYears, month, day, minDate, yesterday]);

  // ── Display values ────────────────────────────────────────────────────────────
  const displayDate     = `${MONTH_FULL[month - 1]} ${String(day).padStart(2, '0')} ${year}`;
  const dateString      = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isAlreadyLogged = relapseDays.has(dateString);
  const isDisabled      = noDatesAvailable || isAlreadyLogged;

  // ── Hold-to-confirm mechanic ──────────────────────────────────────────────────
  const [buttonLayout, setButtonLayout] = useState({ width: 0, height: 0 });
  const progress     = useRef(new Animated.Value(0)).current;
  const holdAnim     = useRef(null);
  const hapticTimers = useRef([]);
  const isComplete   = useRef(false);

  const clearHapticTimers = () => {
    hapticTimers.current.forEach(clearTimeout);
    hapticTimers.current = [];
  };

  const handlePressIn = () => {
    if (isDisabled || isComplete.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    hapticTimers.current = [
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 1000),
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),  2000),
    ];
    progress.setValue(0);
    holdAnim.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    holdAnim.current.start(({ finished }) => {
      if (finished) {
        isComplete.current = true;
        clearHapticTimers();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDisclaimerShown(true);
        setShowModal(true);
      }
    });
  };

  const handlePressOut = () => {
    if (isComplete.current) return;
    holdAnim.current?.stop();
    clearHapticTimers();
    Animated.timing(progress, {
      toValue: 0,
      duration: 150,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  // ── Ring SVG ──────────────────────────────────────────────────────────────────
  const { svgW, svgH, d: ringPath, perimeter } = getRingMetrics(
    buttonLayout.width,
    buttonLayout.height,
  );
  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [perimeter, 0],
    extrapolate: 'clamp',
  });

  // ── Modal handlers ────────────────────────────────────────────────────────────
  const handleYes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowModal(false);
    isComplete.current = false;
    progress.setValue(0);
    const payload = calculateResetData(dateString, cleanDays, relapseDays);
    onConfirmReset?.(dateString, payload);
    goBack();
  };

  const handleNo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowModal(false);
    isComplete.current = false;
    Animated.timing(progress, {
      toValue: 0,
      duration: 150,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  return (
    <SafeAreaView style={styles.root}>

      {/* ── Back button — absolutely pinned ── */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={goBack}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={26} color={colors.white} />
      </TouchableOpacity>

      {/* ── Header block — label + glowing divider ── */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>LOG PAST RELAPSE</Text>
        <View style={styles.headerDivider} />
      </View>

      {/* ── Picker area — instruction sits directly above picker ── */}
      <View style={styles.pickerArea}>
        {noDatesAvailable ? (
          <Text style={styles.noDatesText}>NO HISTORICAL DATES AVAILABLE</Text>
        ) : (
          <View style={styles.pickerGroup}>
            <Text style={styles.instruction}>SELECT THE DATE YOU RELAPSED</Text>
            <View style={styles.pickerRow}>
              <View style={[styles.selLine, { top: ITEM_H * PAD },       { pointerEvents: 'none' }]} />
              <View style={[styles.selLine, { top: ITEM_H * (PAD + 1) }, { pointerEvents: 'none' }]} />

              <ScrollPickerColumn
                key={`d-${validDays[0]}-${validDays[validDays.length - 1]}`}
                items={dayItems}
                selectedIndex={Math.max(0, dayIdx)}
                onIndexChange={handleDayChange}
                width={72}
              />
              <View style={styles.colGap} />
              <ScrollPickerColumn
                key={`m-${validMonths[0]}-${validMonths[validMonths.length - 1]}`}
                items={monthItems}
                selectedIndex={Math.max(0, monthIdx)}
                onIndexChange={handleMonthChange}
                width={108}
              />
              <View style={styles.colGap} />
              <ScrollPickerColumn
                key={`y-${yearItems.length}`}
                items={yearItems}
                selectedIndex={Math.max(0, yearIdx)}
                onIndexChange={handleYearChange}
                width={84}
              />
            </View>
          </View>
        )}
      </View>

      {/* ── Bottom ── */}
      <View style={styles.bottom}>
        {isAlreadyLogged && (
          <Text style={styles.alreadyLoggedText}>ALREADY LOGGED AS A RELAPSE</Text>
        )}

        {/* Fixed-height row keeps "LOG RELAPSE FOR:" bolted in place */}
        <View style={styles.displayDateRow}>
          <Text style={styles.displayDateLabel} numberOfLines={1}>{'LOG RELAPSE FOR:  '}</Text>
          <Text style={styles.displayDateValue} numberOfLines={1}>{displayDate}</Text>
        </View>

        {/* Hold-to-confirm button */}
        <View style={[styles.holdWrapper, isDisabled && styles.holdWrapperDisabled]}>
          {buttonLayout.width > 0 && (
            <Svg
              width={svgW}
              height={svgH}
              style={[
                styles.progressRingSvg,
                { top: -(GAP + STROKE), left: -(GAP + STROKE) },
                { pointerEvents: 'none' },
              ]}
            >
              <AnimatedPath
                d={ringPath}
                stroke={colors.white}
                strokeWidth={STROKE}
                strokeDasharray={[perimeter]}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          )}
          <TouchableOpacity
            style={styles.confirmBtn}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            disabled={isDisabled}
            onLayout={e => setButtonLayout({
              width:  e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })}
          >
            <Text style={styles.confirmBtnText}>HOLD TO CONFIRM</Text>
          </TouchableOpacity>
        </View>

        {/* Fixed-height slot keeps layout stable; text appears after hold completes */}
        <View style={styles.disclaimerSlot}>
          {disclaimerShown && (
            <Text style={styles.disclaimer}>
              THIS MAY AFFECT YOUR BADGES AND LONGEST STREAK
            </Text>
          )}
        </View>
      </View>

      {/* ── Confirmation Modal ── */}
      {showModal && (
        <View style={styles.modalOverlay}>
          <Text style={styles.modalTitle}>ARE YOU SURE?</Text>
          <Text style={styles.modalDate}>{displayDate}</Text>
          <View style={styles.modalBtns}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnYes]}
              onPress={handleYes}
              activeOpacity={0.7}
            >
              <Text style={styles.modalBtnText}>YES</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={handleNo}
              activeOpacity={0.7}
            >
              <Text style={styles.modalBtnText}>NO</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalWarning}>
            THIS MAY AFFECT YOUR STREAKS AND BADGES
          </Text>
        </View>
      )}

    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
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
  headerDivider: {
    width: SCREEN_WIDTH - H_PADDING * 2,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },

  // Picker area — centers [instruction + picker] as a unit
  pickerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerGroup: {
    alignItems: 'center',
  },
  instruction: {
    fontFamily: fonts.display,
    fontSize: 10,
    color: colors.white,
    opacity: 0.5,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 20,
  },
  noDatesText: {
    fontFamily: fonts.display,
    fontSize: 10,
    color: colors.white,
    opacity: 0.5,
    letterSpacing: 4,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  selLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    zIndex: 10,
  },
  colGap: {
    width: 12,
  },
  pickerCell: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.white,
    letterSpacing: 1,
  },
  pickerTextDim: {
    opacity: 0.25,
  },

  // Bottom section
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 72,
    alignItems: 'center',
    gap: 12,
  },
  alreadyLoggedText: {
    fontFamily: fonts.display,
    fontSize: 9,
    color: colors.white,
    letterSpacing: 3,
    textAlign: 'center',
  },
  // Fixed height keeps "LOG RELAPSE FOR:" pinned regardless of date string length
  displayDateRow: {
    height: 18,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayDateLabel: {
    fontFamily: fonts.display,
    fontSize: 8,
    color: colors.white,
    letterSpacing: 2,
  },
  // Fixed width so combined label+date total never changes → no movement
  displayDateValue: {
    fontFamily: fonts.display,
    fontSize: 8,
    color: colors.white,
    letterSpacing: 2,
    width: 128,
  },

  // Hold button + ring
  holdWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 44,
  },
  holdWrapperDisabled: {
    opacity: 0.4,
  },
  progressRingSvg: {
    position: 'absolute',
  },
  confirmBtn: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: BUTTON_RADIUS,
    paddingVertical: 18,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.background,
    letterSpacing: 4,
  },

  // Fixed-height slot below button — stable layout whether text is shown or not
  disclaimerSlot: {
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimer: {
    fontFamily: fonts.display,
    fontSize: 8,
    color: colors.white,
    opacity: 0.4,
    letterSpacing: 2,
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 100,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.white,
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDate: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.white,
    opacity: 0.6,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalWarning: {
    fontFamily: fonts.display,
    fontSize: 8,
    color: colors.white,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 24,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 20,
  },
  modalBtn: {
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  modalBtnYes: {
    borderColor: 'rgba(255,60,60,0.6)',
    backgroundColor: 'rgba(255,60,60,0.08)',
  },
  modalBtnText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.white,
    letterSpacing: 4,
  },
});
