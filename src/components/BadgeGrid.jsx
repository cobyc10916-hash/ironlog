import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function BadgeGrid({ badges = [] }) {
  return (
    <View style={styles.grid}>
      {badges.map((badge, index) => (
        <View key={index} style={styles.cell} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  cell: {
    width: 80,
    height: 80,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
});
