import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
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

function GoogleIcon() {
  return <Text style={[styles.iconText, styles.googleIconText]}>G</Text>;
}

export default function SignInScreen({ navigation }) {
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
      navigation.navigate('Home');
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
      navigation.navigate('Home');
    } catch (e) {
      console.log('GOOGLE_AUTH_ERROR:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation?.goBack(); }}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={26} color={colors.white} />
      </TouchableOpacity>

      {/* Top spacer */}
      <View style={styles.topSpacer} />

      {/* Center — header */}
      <View style={styles.headerSection}>
        <Text style={styles.headline}>WELCOME BACK.</Text>
        <View style={styles.divider} />
      </View>

      {/* Bottom half — auth buttons */}
      <View style={styles.buttonSection}>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={8}
          style={{ width: '100%', height: 50 }}
          onPress={onAppleSignIn}
        />

        <TouchableOpacity style={styles.googleButton} onPress={onGoogleSignIn} activeOpacity={0.8}>
          <GoogleIcon />
          <Text style={styles.googleButtonText}>CONTINUE WITH GOOGLE</Text>
        </TouchableOpacity>
      </View>

      {/* Privacy note */}
      <View style={styles.privacySection}>
        <Text style={styles.privacyText}>YOUR DATA IS PRIVATE AND SECURE.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  backBtn: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
  },

  topSpacer: {
    flex: 2,
  },

  // ── Header ──────────────────────────────────────────────
  headerSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.white,
    opacity: 0.15,
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
    marginRight: 24, // offset to visually center text past icon
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

  // ── Privacy note ─────────────────────────────────────────
  privacySection: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  privacyText: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.white,
    opacity: 0.4,
    textAlign: 'center',
  },
});
