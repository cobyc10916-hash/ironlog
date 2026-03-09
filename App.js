import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import AppNavigator from './src/navigation/AppNavigator';

const BLACK = { flex: 1, backgroundColor: '#0a0a0a' };

// ─── AppContent ───────────────────────────────────────────────────────────────
// Separate component so it can read isReady from SettingsContext.
function AppContent({ fontsLoaded }) {
  const { isReady } = useSettings();

  if (!fontsLoaded || !isReady) return <View style={BLACK} />;

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
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
