import { useState } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import SettingsScreen from './src/screens/SettingsScreen';
import Intensity      from './src/screens/onboarding/Intensity';
import Notifications  from './src/screens/onboarding/Notifications';

const BLACK = { flex: 1, backgroundColor: '#0a0a0a' };

// ─── Micro-navigator ──────────────────────────────────────────────────────────
// Pure-JS screen switcher — avoids react-native-screens Fabric components that
// throw "expected dynamic type 'boolean', had type 'string'" in RN 0.81.
function makeNav(setScreen, setParams) {
  return {
    navigate: (name, params = {}) => { setScreen(name); setParams(params); },
    goBack:   ()                   => { setScreen('Settings'); setParams({}); },
  };
}

// ─── AppContent ───────────────────────────────────────────────────────────────
// Separate component so it can read isReady from SettingsContext.
// App renders SettingsProvider first, then AppContent inside it.
function AppContent({ fontsLoaded }) {
  const { isReady } = useSettings();
  const [screen, setScreen] = useState('Settings');
  const [params, setParams] = useState({});

  // Hold on black void until fonts are loaded AND context has settled
  if (!fontsLoaded || !isReady) return <View style={BLACK} />;

  const navigation = makeNav(setScreen, setParams);
  const route      = { params };

  if (screen === 'Intensity')    return <Intensity     navigation={navigation} route={route} />;
  if (screen === 'Notifications') return <Notifications navigation={navigation} route={route} />;
  return <SettingsScreen navigation={navigation} />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [fontsLoaded] = useFonts({ OCRA: require('./assets/fonts/OCRA.ttf') });

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AppContent fontsLoaded={fontsLoaded} />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
