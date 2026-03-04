import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

export default function NotificationPermission({ navigation }) {
  const [denied, setDenied] = useState(false);

  const handleEnable = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      navigation?.navigate('Notifications');
    } else {
      setDenied(true);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
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

        {denied && (
          <TouchableOpacity onPress={() => Linking.openSettings()} activeOpacity={0.7}>
            <Text style={styles.settingsHint}>OPEN SETTINGS TO ENABLE NOTIFICATIONS</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
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
  buttonText: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.white,
    letterSpacing: 8,
  },
  settingsHint: {
    fontFamily: fonts.display,
    fontSize: 9,
    color: colors.white,
    opacity: 0.4,
    letterSpacing: 2,
    textAlign: 'center',
  },
});
