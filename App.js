import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BadgeScreen from './src/screens/BadgeScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    OCRA: require('./assets/fonts/OCRA.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <BadgeScreen />
    </SafeAreaProvider>
  );
}
