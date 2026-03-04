import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StreakCounter({ count = 0 }) {
  return (
    <View style={styles.container}>
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  count: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
  },
});
