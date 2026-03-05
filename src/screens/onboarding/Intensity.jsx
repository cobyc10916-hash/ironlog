import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

export default function Intensity({ navigation }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (intensity) => {
    setSelected(intensity);
    navigation?.navigate('Notifications', { intensity });
  };

  return (
    <SafeAreaView style={styles.root}>
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
  button: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: colors.background,
    borderColor: colors.white,
  },
  buttonText: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.background,
    letterSpacing: 6,
  },
  buttonTextSelected: {
    color: colors.white,
  },
});
