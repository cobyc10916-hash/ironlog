import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

function AppleIcon() {
  return <Text style={styles.iconText}></Text>;
}

function GoogleIcon() {
  return <Text style={[styles.iconText, styles.googleIconText]}>G</Text>;
}

export default function CreateAccountScreen() {
  const line1 = useRef(new Animated.Value(0)).current;
  const line2 = useRef(new Animated.Value(0)).current;
  const line3 = useRef(new Animated.Value(0)).current;
  const buttons = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(line1, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(line2, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(3000),
        Animated.timing(line3, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(4800),
        Animated.timing(buttons, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const onAppleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('onAppleSignIn');
  };

  const onGoogleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('onGoogleSignIn');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top spacer */}
      <View style={styles.topSpacer} />

      {/* Header */}
      <View style={styles.headerSection}>
        <Animated.Text style={[styles.headline, { opacity: line1, marginBottom: 8 }]}>YOUR STREAK</Animated.Text>
        <Animated.Text style={[styles.headline, styles.headlineMd, { opacity: line2 }]}>STARTS</Animated.Text>
        <Animated.View style={[styles.nowRow, { opacity: line3 }]}>
          <Text style={[styles.headline, styles.headlineLg]}>NOW</Text>
          <Text style={[styles.headline, styles.headlineLg, styles.nowPeriod]}>.</Text>
        </Animated.View>
      </View>

      {/* Bottom half — auth buttons */}
      <Animated.View style={[styles.buttonSection, { opacity: buttons }]}>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.appleButton} onPress={onAppleSignIn} activeOpacity={0.8}>
          <AppleIcon />
          <Text style={styles.appleButtonText}>CONTINUE WITH APPLE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.googleButton} onPress={onGoogleSignIn} activeOpacity={0.8}>
          <GoogleIcon />
          <Text style={styles.googleButtonText}>CONTINUE WITH GOOGLE</Text>
        </TouchableOpacity>

        <Text style={styles.privacyText}>YOUR DATA IS PRIVATE AND SECURE.</Text>
      </Animated.View>

      {/* Bottom spacer */}
      <View style={styles.bottomSpacer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  topSpacer: {
    flex: 2,
  },

  // ── Header ──────────────────────────────────────────────
  headerSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 8,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.white,
    textAlign: 'center',
  },
  headlineMd: {
    fontSize: 66,
    lineHeight: 72,
  },
  headlineLg: {
    fontSize: 115,
    lineHeight: 125,
    textAlign: 'center',
  },
  nowRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 20,
  },
  nowPeriod: {
    marginLeft: -20,
    marginBottom: -14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.white,
    opacity: 0.15,
    marginTop: 20,
  },

  // ── Buttons ─────────────────────────────────────────────
  buttonSection: {
    flex: 2,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  appleButtonText: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.background,
    textAlign: 'center',
    marginRight: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  googleButtonText: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.white,
    textAlign: 'center',
    marginRight: 24,
  },
  iconText: {
    width: 24,
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.background,
    textAlign: 'center',
  },
  googleIconText: {
    color: colors.white,
  },
  privacyText: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.white,
    opacity: 0.4,
    textAlign: 'center',
    marginTop: 4,
  },

  bottomSpacer: {
    flex: 0.5,
  },
});
