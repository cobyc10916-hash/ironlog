import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function ResetButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.label}>Reset</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
  },
});
