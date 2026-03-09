import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CalendarScreen from './src/screens/CalendarScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    OCRA: require('./assets/fonts/OCRA.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <CalendarScreen onBack={() => {}} />
    </SafeAreaProvider>
  );
}
