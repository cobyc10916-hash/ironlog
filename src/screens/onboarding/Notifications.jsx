import { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

const ITEM_HEIGHT = 44;
const PICKER_HEIGHT = ITEM_HEIGHT * 3;

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const PERIODS = ['AM', 'PM'];

function WheelPicker({ items, initialIndex = 0, onChange, width = 48 }) {
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
      {/* selection band */}
      <View
        pointerEvents="none"
        style={[styles.selectionBand, { top: ITEM_HEIGHT }]}
      />
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
            <Text
              style={[
                styles.wheelText,
                { opacity: i === activeIndex ? 1 : 0.22 },
              ]}
            >
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function TimePicker({ initialHour = 5, initialMinute = 0, initialPeriod = 0 }) {
  return (
    <View style={styles.timePicker}>
      <WheelPicker items={HOURS} initialIndex={initialHour} width={48} />
      <WheelPicker items={MINUTES} initialIndex={initialMinute} width={48} />
      <WheelPicker items={PERIODS} initialIndex={initialPeriod} width={40} />
    </View>
  );
}

export default function Notifications({ navigation }) {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const [notifShown, setNotifShown] = useState(false);

  const handleContinue = () => {
    if (notifShown) return;
    setNotifShown(true);
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotifShown(false);
      navigation?.navigate('Dashboard');
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Content */}
      <View style={styles.content}>
        {/* Section 1 — Morning notification */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            WHEN DO YOU WANT YOUR{'\n'}MORNING NOTIFICATION?
          </Text>
          <TimePicker initialHour={5} initialMinute={6} initialPeriod={0} />
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
              <TimePicker initialHour={2} initialMinute={0} initialPeriod={1} />
            </View>
            <View style={styles.dangerGroup}>
              <Text style={styles.dangerLabel}>TO</Text>
              <TimePicker initialHour={9} initialMinute={0} initialPeriod={1} />
            </View>
          </View>
        </View>
      </View>

      {/* Bottom */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>CONTINUE</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          THIS IS WHAT YOUR DAILY NOTIFICATION LOOKS LIKE
        </Text>
      </View>

      {/* Mock iOS notification — rendered last so it overlays everything */}
      {notifShown && (
        <Animated.View
          style={[styles.notifBanner, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.notifIconBox}>
            <Text style={styles.notifIconText}>I</Text>
          </View>
          <View style={styles.notifTextBox}>
            <Text style={styles.notifTitle}>IRONLOG</Text>
            <Text style={styles.notifMessage}>
              Time to check in. Don't slip today.
            </Text>
          </View>
        </Animated.View>
      )}
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

  /* ── layout ── */
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 40,
  },
  section: {
    alignItems: 'center',
    gap: 20,
  },
  sectionLabel: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.white,
    letterSpacing: 3,
    textAlign: 'center',
    lineHeight: 19,
    opacity: 0.85,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.white,
    opacity: 0.18,
  },

  /* ── wheel picker ── */
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

  /* ── danger period ── */
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

  /* ── bottom ── */
  bottom: {
    alignItems: 'center',
    gap: 16,
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
  hint: {
    fontFamily: fonts.display,
    fontSize: 9,
    color: colors.white,
    opacity: 0.3,
    letterSpacing: 2,
    textAlign: 'center',
  },

  /* ── mock notification ── */
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
