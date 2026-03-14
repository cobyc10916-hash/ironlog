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
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

GoogleSignin.configure({ iosClientId: '16941655300-bbsik1d00uh3ono8hidqadhb6fvs7hkt.apps.googleusercontent.com' });

async function flushOnboardingToProfile(userId) {
  const keys = ['onboarding_intensity', 'onboarding_morning_time', 'onboarding_danger_start', 'onboarding_danger_end'];
  const pairs = await AsyncStorage.multiGet(keys);
  const [intensity, morningTime, dangerStart, dangerEnd] = pairs.map(([, v]) => v);
  if (!intensity && !morningTime) return;
  const update = {};
  if (intensity)   update.intensity                 = intensity;
  if (morningTime) update.morning_notification_time = morningTime;
  if (dangerStart) update.danger_period_start        = dangerStart;
  if (dangerEnd)   update.danger_period_end          = dangerEnd;
  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  if (error) { console.error('PROFILE_UPDATE_ERROR:', error); return; }
  await AsyncStorage.multiRemove(keys);
}

export default function CreateAccountScreen({ navigation, route }) {
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

  const onAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await flushOnboardingToProfile(user.id);
      const params = route.params?.bypassPaywall ? { bypassPaywall: true } : undefined;
      navigation.navigate('Home', params);
    } catch (e) {
      console.log('APPLE_AUTH_ERROR:', e);
    }
  };

  const onGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data.idToken;
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
      if (error) throw error;
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await flushOnboardingToProfile(user.id);
      const params = route.params?.bypassPaywall ? { bypassPaywall: true } : undefined;
      navigation.navigate('Home', params);
    } catch (e) {
      console.log('GOOGLE_AUTH_ERROR:', e);
    }
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
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={8}
          style={{ width: '100%', height: 50 }}
          onPress={onAppleSignIn}
        />

        <TouchableOpacity style={styles.googleButton} onPress={onGoogleSignIn} activeOpacity={0.8}>
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
    width: '100%',
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.white,
    letterSpacing: 2,
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
