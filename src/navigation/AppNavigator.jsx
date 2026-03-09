import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import BadgeScreen from '../screens/BadgeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LogHistoricalResetScreen from '../screens/LogHistoricalResetScreen';
import Intensity from '../screens/onboarding/Intensity';
import Notifications from '../screens/onboarding/Notifications';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      detachInactiveScreens={false}
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Home"                 component={HomeScreen} />
      <Stack.Screen name="Calendar"             component={CalendarScreen} />
      <Stack.Screen name="Badge"                component={BadgeScreen} />
      <Stack.Screen name="Settings"             component={SettingsScreen} />
      <Stack.Screen name="LogHistoricalReset"   component={LogHistoricalResetScreen} />
      <Stack.Screen name="Intensity"            component={Intensity} />
      <Stack.Screen name="Notifications"        component={Notifications} />
    </Stack.Navigator>
  );
}
