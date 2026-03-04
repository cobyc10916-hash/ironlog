import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function SpotlightOverlay({ visible = false, children }) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
