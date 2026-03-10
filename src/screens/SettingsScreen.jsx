import { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 20;

// ─── Hold ring constants ───────────────────────────────────────────────────────
const RING_GAP    = 4;
const RING_STROKE = 4;
const BTN_RADIUS  = 8;
const HOLD_MS     = 3000;

const AnimatedPath = Animated.createAnimatedComponent(Path);

function getRingMetrics(bw, bh) {
  const pw  = bw + 2 * RING_GAP + RING_STROKE;
  const ph  = bh + 2 * RING_GAP + RING_STROKE;
  const prx = BTN_RADIUS + RING_GAP + RING_STROKE / 2;
  const svgW = bw + 2 * (RING_GAP + RING_STROKE);
  const svgH = bh + 2 * (RING_GAP + RING_STROKE);
  const ox = RING_STROKE / 2;
  const oy = RING_STROKE / 2;
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

// ─── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = memo(function SectionHeader({ label }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
});

// ─── Settings Row ──────────────────────────────────────────────────────────────
const SettingsRow = memo(function SettingsRow({ label, onPress, rightLabel, isLast }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.row}
        onPress={handlePress}
        activeOpacity={0.6}
      >
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowArrow}>{rightLabel ?? '→'}</Text>
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </View>
  );
});

// ─── Confirm Modal (pure-JS overlay — avoids native Modal issues in RN 0.81) ──
const ConfirmModal = ({ visible, onYes, onNo }) => {
  if (!visible) return null;
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>ARE YOU SURE?</Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.modalBtn} onPress={onYes} activeOpacity={0.7}>
            <Text style={styles.modalBtnText}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalBtn} onPress={onNo} activeOpacity={0.7}>
            <Text style={styles.modalBtnText}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── Delete Confirm Modal — hold YES for 3s to confirm ────────────────────────
const DeleteConfirmModal = ({ visible, onYes, onNo }) => {
  const progress      = useRef(new Animated.Value(0)).current;
  const holdAnim      = useRef(null);
  const hapticTimers  = useRef([]);
  const isComplete    = useRef(false);
  const [btnLayout, setBtnLayout] = useState({ width: 0, height: 0 });

  const clearHapticTimers = useCallback(() => {
    hapticTimers.current.forEach(clearTimeout);
    hapticTimers.current = [];
  }, []);

  const handlePressIn = useCallback(() => {
    if (isComplete.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    hapticTimers.current = [
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 1000),
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 2000),
    ];
    progress.setValue(0);
    holdAnim.current = Animated.timing(progress, {
      toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false,
    });
    holdAnim.current.start(({ finished }) => {
      if (finished) {
        isComplete.current = true;
        clearHapticTimers();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onYes?.();
      }
    });
  }, [clearHapticTimers, onYes, progress]);

  const handlePressOut = useCallback(() => {
    if (isComplete.current) return;
    holdAnim.current?.stop();
    clearHapticTimers();
    Animated.timing(progress, { toValue: 0, duration: 150, easing: Easing.linear, useNativeDriver: false }).start();
  }, [clearHapticTimers, progress]);

  useEffect(() => {
    if (!visible) {
      holdAnim.current?.stop();
      clearHapticTimers();
      progress.setValue(0);
      isComplete.current = false;
    }
  }, [visible, clearHapticTimers, progress]);

  if (!visible) return null;

  const { svgW, svgH, d, perimeter } = getRingMetrics(btnLayout.width, btnLayout.height);
  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [perimeter, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>ARE YOU SURE?</Text>
        <View style={styles.modalButtons}>
          <View style={styles.holdWrapper}>
            {btnLayout.width > 0 && (
              <Svg
                width={svgW} height={svgH}
                style={[styles.ringSvg, { top: -(RING_GAP + RING_STROKE), left: -(RING_GAP + RING_STROKE) }, { pointerEvents: 'none' }]}
              >
                <AnimatedPath
                  d={d} stroke={colors.white} strokeWidth={RING_STROKE}
                  strokeDasharray={[perimeter]} strokeDashoffset={dashOffset}
                  strokeLinecap="round" fill="none"
                />
              </Svg>
            )}
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnDestructive]}
              onPressIn={handlePressIn} onPressOut={handlePressOut}
              activeOpacity={1}
              onLayout={(e) => setBtnLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
            >
              <Text style={styles.modalBtnText}>YES</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalBtn} onPress={onNo} activeOpacity={0.7}>
            <Text style={styles.modalBtnText}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function SettingsScreen({
  onSignOut,
  onDeleteAccount,
  onRestorePurchases,
  navigation,
}) {
  const [modalType, setModalType] = useState(null); // 'signout' | 'delete' | null
  const [restoreLabel, setRestoreLabel] = useState(null); // null | 'RESTORED'

  const openModal = (type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalType(type);
  };

  const closeModal = () => setModalType(null);

  const handleModalYes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const type = modalType;
    closeModal();
    if (type === 'signout') onSignOut?.();
    if (type === 'delete') onDeleteAccount?.();
  };

  const handleRestore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRestorePurchases?.();
    setRestoreLabel('RESTORED');
    setTimeout(() => setRestoreLabel(null), 2000);
  };

  return (
    <SafeAreaView style={styles.root}>

      {/* Back button — absolutely pinned like BadgeScreen */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation?.goBack()}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={26} color={colors.white} />
      </TouchableOpacity>

      {/* Header block — label + glowing divider */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>SETTINGS</Text>
        <View style={styles.headerDivider} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── ACCOUNT ── */}
        <SectionHeader label="ACCOUNT" />
        <View style={styles.group}>
          <SettingsRow
            label="LOG PAST RELAPSE"
            onPress={() => navigation?.navigate('LogHistoricalReset')}
          />
          <SettingsRow
            label="SIGN OUT"
            onPress={() => openModal('signout')}
          />
          <SettingsRow
            label="DELETE ACCOUNT"
            onPress={() => openModal('delete')}
            isLast
          />
        </View>

        {/* ── TRAINING ── */}
        <SectionHeader label="TRAINING" />
        <View style={styles.group}>
          <SettingsRow
            label="CHANGE INTENSITY"
            onPress={() => navigation?.navigate('Intensity', { isEditing: true })}
          />
          <SettingsRow
            label="NOTIFICATION TIMING"
            onPress={() => navigation?.navigate('Notifications', { isEditing: true })}
          />
          <SettingsRow
            label="NOTIFICATION SETTINGS"
            onPress={() => Linking.openURL('app-settings:')}
            isLast
          />
        </View>

        {/* ── SUBSCRIPTION ── */}
        <SectionHeader label="SUBSCRIPTION" />
        <View style={styles.group}>
          <SettingsRow
            label="MANAGE SUBSCRIPTION"
            onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
          />
          <SettingsRow
            label="RESTORE PURCHASES"
            onPress={handleRestore}
            rightLabel={restoreLabel ?? '→'}
            isLast
          />
        </View>

        {/* Version */}
        <Text style={styles.version}>v1.0.0</Text>

      </ScrollView>

      {/* Sign Out Modal */}
      <ConfirmModal
        visible={modalType === 'signout'}
        onYes={handleModalYes}
        onNo={closeModal}
        destructive={false}
      />

      {/* Delete Account Modal */}
      <DeleteConfirmModal
        visible={modalType === 'delete'}
        onYes={handleModalYes}
        onNo={closeModal}
      />


    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
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

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingBottom: 48,
  },

  // ── Section Header ───────────────────────────────────────────────────────────
  sectionHeader: {
    fontFamily: fonts.display,
    fontSize: 9,
    color: colors.white,
    opacity: 0.4,
    letterSpacing: 3,
    marginTop: 24,
    marginBottom: 6,
    paddingHorizontal: 24,
  },

  // ── Group ────────────────────────────────────────────────────────────────────
  group: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // ── Row ──────────────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  rowLabel: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.white,
    letterSpacing: 2,
  },
  rowArrow: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 24,
  },

  // ── Version ──────────────────────────────────────────────────────────────────
  version: {
    fontFamily: fonts.display,
    fontSize: 10,
    color: colors.white,
    opacity: 0.2,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 40,
  },

  // ── Modal ────────────────────────────────────────────────────────────────────
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
  modalContent: {
    width: '100%',
    alignItems: 'center',
    gap: 40,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.white,
    letterSpacing: 6,
    textAlign: 'center',
  },
  modalButtons: {
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
  modalBtnDestructive: {
    borderColor: 'rgba(255,60,60,0.6)',
    backgroundColor: 'rgba(255,60,60,0.08)',
  },
  holdWrapper: {
    position: 'relative',
  },
  ringSvg: {
    position: 'absolute',
  },
  modalBtnText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.white,
    letterSpacing: 4,
  },
});
