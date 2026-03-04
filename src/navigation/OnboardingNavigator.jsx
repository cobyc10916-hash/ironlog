import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Opening from '../screens/onboarding/Opening';
import Intensity from '../screens/onboarding/Intensity';
import Notifications from '../screens/onboarding/Notifications';
import Demo from '../screens/onboarding/Demo';
import Paywall from '../screens/onboarding/Paywall';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Opening" component={Opening} />
      <Stack.Screen name="Intensity" component={Intensity} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="Demo" component={Demo} />
      <Stack.Screen name="Paywall" component={Paywall} />
    </Stack.Navigator>
  );
}
