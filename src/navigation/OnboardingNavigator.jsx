import { createStackNavigator } from '@react-navigation/stack';
import Opening from '../screens/onboarding/Opening';
import Intensity from '../screens/onboarding/Intensity';
import NotificationPermission from '../screens/onboarding/NotificationPermission';
import Notifications from '../screens/onboarding/Notifications';
import Manifesto from '../screens/onboarding/Manifesto';
import Demo from '../screens/onboarding/Demo';
import Paywall from '../screens/onboarding/Paywall';
import HomeScreen from '../screens/HomeScreen';
import SignInScreen from '../screens/SignInScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';

const Stack = createStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Demo"
      detachInactiveScreens={false}
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="SignIn"                  component={SignInScreen} />
      <Stack.Screen name="Opening"                component={Opening} />
      <Stack.Screen name="Manifesto"              component={Manifesto} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Intensity"              component={Intensity} />
      <Stack.Screen name="NotificationPermission" component={NotificationPermission} />
      <Stack.Screen name="Notifications"          component={Notifications} />
      <Stack.Screen name="Demo"                   component={Demo} />
      <Stack.Screen name="Paywall"                component={Paywall} options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="CreateAccount"          component={CreateAccountScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Home"                   component={HomeScreen} />
    </Stack.Navigator>
  );
}
