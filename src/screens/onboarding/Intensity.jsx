import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { useSettings } from '../../context/SettingsContext';

export default function Intensity({ navigation, route }) {
  const isEditing = route?.params?.isEditing === true;
  const { intensity: savedIntensity, setIntensity } = useSettings();

  const [selected, setSelected] = useState(savedIntensity);

  const handleSelect = (option) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(option);
    setIntensity(option);
    // Stay on screen — user must press ← to commit and return
  };

  return (
    <SafeAreaView style={styles.root}>

      {isEditing && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
      )}

      <View style={styles.group}>
        <Text style={styles.heading}>CHOOSE YOUR{'\n'}INTENSITY</Text>

        <View style={styles.buttons}>
          {['normal', 'extreme'].map((option) => {
            const isSelected = selected === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.button, isSelected && styles.buttonSelected]}
                onPress={() => handleSelect(option)}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>
                  {option.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
  },
  backArrow: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.white,
  },
  group: {
    alignItems: 'center',
    width: '100%',
    gap: 48,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.white,
    letterSpacing: 6,
    textAlign: 'center',
    lineHeight: 54,
  },
  buttons: {
    width: '100%',
    gap: 16,
  },
  // Default: hollow (dark bg, white border, white text)
  button: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
    paddingVertical: 18,
    alignItems: 'center',
  },
  // Selected: solid white fill, dark text
  buttonSelected: {
    backgroundColor: colors.white,
  },
  buttonText: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.white,
    letterSpacing: 6,
  },
  buttonTextSelected: {
    color: colors.background,
  },
});
