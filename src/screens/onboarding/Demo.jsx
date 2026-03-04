import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Demo() {
  return (
    <View style={styles.container}>
      <Text>Demo</Text>
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
