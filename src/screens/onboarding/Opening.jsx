import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Opening() {
  return (
    <View style={styles.container}>
      <Text>Opening</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
