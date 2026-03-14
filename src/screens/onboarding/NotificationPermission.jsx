import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import OnboardingProgress from '../../components/OnboardingProgress';

export default function NotificationPermission({ navigation }) {
  const handleEnable = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation?.navigate('Notifications');
  };

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingProgress currentStep={2} />
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation?.goBack(); }}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={26} color={colors.white} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.headline}>
          NOTIFICATIONS{'\n'}ARE THE CORE{'\n'}OF THIS APP.
        </Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleEnable}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>ENABLE</Text>
        </TouchableOpacity>

      </View>

      {__DEV__ && (
        <TouchableOpacity
          style={styles.devSkip}
          onPress={() => navigation?.navigate('Notifications')}
          activeOpacity={0.7}
        >
          <Text style={styles.devSkipText}>DEV SKIP</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  content: {
    alignItems: 'center',
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.white,
    letterSpacing: 4,
    textAlign: 'center',
    lineHeight: 42,
  },
  bottom: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 20,
  },
  button: {
    borderColor: colors.white,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: colors.background,
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
  },
  buttonText: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.white,
    letterSpacing: 8,
  },
  devSkip: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -16 }],
    backgroundColor: 'red',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    zIndex: 9999,
  },
  devSkipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
