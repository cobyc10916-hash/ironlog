import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function CalendarGrid({ days = [] }) {
  return (
    <View style={styles.grid}>
      {days.map((day, index) => (
        <View key={index} style={[styles.cell, day.logged && styles.logged]} />
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
    width: 40,
    height: 40,
    margin: 2,
    borderRadius: 4,
    backgroundColor: '#eee',
  },
  logged: {
    backgroundColor: '#4CAF50',
  },
});
