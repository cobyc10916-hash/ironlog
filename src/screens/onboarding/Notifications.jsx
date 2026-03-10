import { useRef, useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { useSettings } from '../../context/SettingsContext';

const ITEM_HEIGHT = 44;
const PICKER_HEIGHT = ITEM_HEIGHT * 3;

const HOURS   = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];
const PERIODS = ['AM','PM'];

const LABEL1 = 'YOUR MORNING\nNOTIFICATION WILL LOOK LIKE THIS.';
const LABEL2 = 'YOUR DANGER PERIOD NOTIFICATION WILL LOOK LIKE THIS.';
const CHAR_DELAY = 60;

function typewriteText(fullText, setter, onComplete) {
  setter('');
  let i = 0;
  const id = setInterval(() => {
    i++;
    setter(fullText.slice(0, i));
    if (i >= fullText.length) {
      clearInterval(id);
      onComplete?.();
    }
  }, CHAR_DELAY);
}

// memo: only re-renders when its own scroll ends, not on parent state changes
const WheelPicker = memo(function WheelPicker({ items, initialIndex = 0, onChange, width = 48 }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const ref = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const onScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(i, items.length - 1));
    setActiveIndex(clamped);
    onChange?.(clamped);
  };

  return (
    <View style={{ width, height: PICKER_HEIGHT, overflow: 'hidden' }}>
      <View style={[styles.selectionBand, { top: ITEM_HEIGHT }, { pointerEvents: 'none' }]} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
      >
        {items.map((item, i) => (
          <View key={i} style={styles.wheelItem}>
            <Text style={[styles.wheelText, { opacity: i === activeIndex ? 1 : 0.22 }]}>
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

// memo + useRef: no stale closures, no cascade re-renders
const TimePicker = memo(function TimePicker({ initialValues, onTimeChange }) {
  // Refs track live values so onChange callbacks never read stale closure data
  const hourRef   = useRef(initialValues.hourIdx);
  const minuteRef = useRef(initialValues.minuteIdx);
  const periodRef = useRef(initialValues.periodIdx);

  const onHour = useCallback((i) => {
    hourRef.current = i;
    onTimeChange?.({ hourIdx: i, minuteIdx: minuteRef.current, periodIdx: periodRef.current });
  }, [onTimeChange]);

  const onMinute = useCallback((i) => {
    minuteRef.current = i;
    onTimeChange?.({ hourIdx: hourRef.current, minuteIdx: i, periodIdx: periodRef.current });
  }, [onTimeChange]);

  const onPeriod = useCallback((i) => {
    periodRef.current = i;
    onTimeChange?.({ hourIdx: hourRef.current, minuteIdx: minuteRef.current, periodIdx: i });
  }, [onTimeChange]);

  return (
    <View style={styles.timePicker}>
      <WheelPicker items={HOURS}   initialIndex={initialValues.hourIdx}   width={48} onChange={onHour}   />
      <WheelPicker items={MINUTES} initialIndex={initialValues.minuteIdx} width={48} onChange={onMinute} />
      <WheelPicker items={PERIODS} initialIndex={initialValues.periodIdx} width={40} onChange={onPeriod} />
    </View>
  );
});

export default function Notifications({ navigation, route }) {
  const isEditing = route?.params?.isEditing === true;
  const { morningTime, setMorningTime, dangerFrom, setDangerFrom, dangerTo, setDangerTo } = useSettings();

  // Local draft state — committed to context on save
  const [draftMorning,    setDraftMorning]    = useState(morningTime);
  const [draftDangerFrom, setDraftDangerFrom] = useState(dangerFrom);
  const [draftDangerTo,   setDraftDangerTo]   = useState(dangerTo);

  // Stable refs — useCallback keeps handler identity stable across renders
  // so memo'd TimePicker children never re-render due to prop identity change
  const onMorningChange    = useCallback((v) => setDraftMorning(v),    []);
  const onDangerFromChange = useCallback((v) => setDraftDangerFrom(v), []);
  const onDangerToChange   = useCallback((v) => setDraftDangerTo(v),   []);

  const insets = useSafeAreaInsets();
  const overlayOpacity  = useRef(new Animated.Value(0)).current;
  const notif1Slide     = useRef(new Animated.Value(-200)).current;
  const notif2Slide     = useRef(new Animated.Value(-200)).current;
  const label1Opacity   = useRef(new Animated.Value(0)).current;
  const label2Opacity   = useRef(new Animated.Value(0)).current;
  const [overlayShown,  setOverlayShown]  = useState(false);
  const [label1Text,    setLabel1Text]    = useState('');
  const [label2Text,    setLabel2Text]    = useState('');

  const saveAndGoBack = () => {
    setMorningTime(draftMorning);
    setDangerFrom(draftDangerFrom);
    setDangerTo(draftDangerTo);
    navigation?.goBack();
  };

  const handleContinue = () => {
    // In editing mode: save and return immediately
    if (isEditing) {
      saveAndGoBack();
      return;
    }

    if (overlayShown) return;
    setOverlayShown(true);

    Animated.timing(overlayOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start(() => {
      label1Opacity.setValue(1);
      typewriteText(LABEL1, setLabel1Text, () => {
        Animated.timing(notif1Slide, { toValue: 0, duration: 380, useNativeDriver: true }).start(() => {
          setTimeout(() => {
            Animated.timing(notif1Slide, { toValue: -200, duration: 380, useNativeDriver: true }).start(() => {
              Animated.timing(label1Opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                setLabel1Text('');
                label2Opacity.setValue(1);
                typewriteText(LABEL2, setLabel2Text, () => {
                  Animated.timing(notif2Slide, { toValue: 0, duration: 380, useNativeDriver: true }).start(() => {
                    setTimeout(() => {
                      Animated.timing(notif2Slide, { toValue: -200, duration: 380, useNativeDriver: true }).start(() => {
                        Animated.timing(label2Opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                          setLabel2Text('');
                          Animated.timing(overlayOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
                            setOverlayShown(false);
                            navigation?.navigate('Dashboard');
                          });
                        });
                      });
                    }, 2500);
                  });
                });
              });
            });
          }, 2500);
        });
      });
    });
  };

  return (
    <SafeAreaView style={styles.root}>

      {isEditing && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
      )}

      <View style={styles.spacer} />

      {/* Content */}
      <View style={styles.content}>
        {/* Section 1 — Morning notification */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            WHEN DO YOU WANT YOUR{'\n'}MORNING NOTIFICATION?
          </Text>
          <TimePicker
            initialValues={draftMorning}
            onTimeChange={onMorningChange}
          />
        </View>

        <View style={styles.divider} />

        {/* Section 2 — Danger period */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            WHEN DOES YOUR{'\n'}GUARD USUALLY DROP?
          </Text>
          <View style={styles.dangerRow}>
            <View style={styles.dangerGroup}>
              <Text style={styles.dangerLabel}>FROM</Text>
              <TimePicker
                initialValues={draftDangerFrom}
                onTimeChange={onDangerFromChange}
              />
            </View>
            <View style={styles.dangerGroup}>
              <Text style={styles.dangerLabel}>TO</Text>
              <TimePicker
                initialValues={draftDangerTo}
                onTimeChange={onDangerToChange}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.spacer} />

      {/* Bottom */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>{isEditing ? 'DONE' : 'CONTINUE'}</Text>
        </TouchableOpacity>
      </View>

      {/* Post-demo overlay (onboarding only) */}
      {overlayShown && (
        <>
          <Animated.View style={[styles.darkOverlay, { opacity: overlayOpacity }]} />

          <Animated.View
            style={[styles.notifBanner, { top: insets.top + 12, transform: [{ translateY: notif1Slide }] }]}
          >
            <View style={styles.notifIconBox}>
              <Text style={styles.notifIconText}>I</Text>
            </View>
            <View style={styles.notifTextBox}>
              <Text style={styles.notifTitle}>IRONLOG</Text>
              <Text style={styles.notifMessage}>CRUSH IT TODAY.</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.labelContainer, { opacity: label1Opacity }]}>
            <Text style={[styles.labelText, { opacity: 0 }]}>{LABEL1}</Text>
            <Text style={[styles.labelText, { position: 'absolute', top: 0, left: 0, right: 0 }]}>{label1Text}</Text>
          </Animated.View>

          <Animated.View
            style={[styles.notifBanner, { top: insets.top + 12, transform: [{ translateY: notif2Slide }] }]}
          >
            <View style={styles.notifIconBox}>
              <Text style={styles.notifIconText}>I</Text>
            </View>
            <View style={styles.notifTextBox}>
              <Text style={styles.notifTitle}>IRONLOG</Text>
              <Text style={styles.notifMessage}>DON'T FALL.</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.labelContainer, { opacity: label2Opacity }]}>
            <Text style={[styles.labelText, { opacity: 0 }]}>{LABEL2}</Text>
            <Text style={[styles.labelText, { position: 'absolute', top: 0, left: 0, right: 0 }]}>{label2Text}</Text>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  // Fixed-height spacer pushes content to vertical center without triggering
  // layout remeasurement on every state change (avoids justifyContent: 'center' thrash)
  spacer: {
    flex: 1,
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
  },
  backArrow: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.white,
  },
  content: {
    gap: 40,
  },
  section: {
    alignItems: 'center',
    gap: 20,
  },
  sectionLabel: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.white,
    letterSpacing: 3,
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.85,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.white,
    opacity: 0.18,
  },
  selectionBand: {
    position: 'absolute',
    height: ITEM_HEIGHT,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    zIndex: 2,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.white,
    letterSpacing: 2,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dangerRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  dangerGroup: {
    alignItems: 'center',
    gap: 10,
  },
  dangerLabel: {
    fontFamily: fonts.display,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 3,
    opacity: 0.45,
  },
  bottom: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  continueButton: {
    borderColor: colors.white,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: colors.background,
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
  },
  continueText: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.white,
    letterSpacing: 8,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 50,
  },
  labelContainer: {
    position: 'absolute',
    top: '60%',
    left: 24,
    right: 24,
    zIndex: 52,
  },
  labelText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
    opacity: 0.9,
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 28,
  },
  notifBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  notifIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    flexShrink: 0,
  },
  notifIconText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 1,
  },
  notifTextBox: {
    flex: 1,
    gap: 3,
  },
  notifTitle: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.white,
    letterSpacing: 2,
  },
  notifMessage: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 18,
  },
});
