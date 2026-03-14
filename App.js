import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { StreakProvider } from './src/context/StreakContext';
import OnboardingNavigator from './src/navigation/OnboardingNavigator';
import { supabase } from './src/lib/supabase';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

Purchases.setLogLevel(LOG_LEVEL.DEBUG);
console.log('RC KEY:', process.env.EXPO_PUBLIC_REVENUECAT_API_KEY);
Purchases.configure({
  apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
  usesStoreKit2IfAvailable: true
});

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  wordmark: { fontFamily: 'OCRA', fontSize: 28, color: '#FFFFFF', letterSpacing: 4 },
});

// ─── AppContent ───────────────────────────────────────────────────────────────
// Separate component so it can read isReady from SettingsContext.
function AppContent({ fontsLoaded }) {
  const { isReady } = useSettings();
  const [session, setSession] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [hasProAccess, setHasProAccess] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const handleAppReady = useCallback(() => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => setLoading(false));
  }, [overlayOpacity]);

  useEffect(() => {
    let sessionResolved = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      sessionResolved = true;
      console.log('SESSION:', session);
      setSession(session);
      // No logged-in user → onboarding path, HomeScreen never mounts, dismiss immediately
      if (!session) setLoading(false);
      if (session) {
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          setHasProAccess(customerInfo.entitlements.active['pro'] !== undefined);
        } catch (e) {
          console.error('RC entitlement check failed:', e);
          setHasProAccess(false);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!sessionResolved) return;
      setSession(session);
    });

    const purchasesListener = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      setHasProAccess(customerInfo.entitlements.active['pro'] !== undefined);
    });

    return () => {
      subscription.unsubscribe();
      purchasesListener.remove();
    };
  }, []);

  // Block everything until fonts, settings, and session are ready
  if (!fontsLoaded || !isReady || session === undefined) {
    return (
      <View style={styles.loading}>
        <Text style={styles.wordmark}>IRONLOG</Text>
      </View>
    );
  }

  const initialState = session
    ? undefined
    : { index: 0, routes: [{ name: 'Opening' }] };

  return (
    <>
      <NavigationContainer initialState={initialState}>
        <OnboardingNavigator onAppReady={handleAppReady} hasProAccess={hasProAccess} />
      </NavigationContainer>
      {loading && (
        <Animated.View style={[styles.loadingOverlay, { opacity: overlayOpacity }]}>
          <Text style={styles.wordmark}>IRONLOG</Text>
        </Animated.View>
      )}
    </>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [fontsLoaded] = useFonts({ OCRA: require('./assets/fonts/OCRA.ttf') });

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <StreakProvider>
          <AppContent fontsLoaded={fontsLoaded} />
        </StreakProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
