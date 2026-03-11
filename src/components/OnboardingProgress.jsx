import { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOTAL = 6;
const SEG_WIDTH = 20;
const SEG_HEIGHT = 4;
const SEG_HEIGHT_CURRENT = 6;
const SEG_RADIUS = 2;
const GAP = 4;

export default function OnboardingProgress({ currentStep }) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { top: insets.top, opacity: fadeAnim }]}
    >
      {Array.from({ length: TOTAL }, (_, i) => {
        const step = i + 1;
        const isCurrent = step === currentStep;
        const isCompleted = step < currentStep;
        const opacity = isCompleted || isCurrent ? 1 : 0.2;
        const height = isCurrent ? SEG_HEIGHT_CURRENT : SEG_HEIGHT;
        return (
          <View
            key={i}
            style={[styles.segment, { opacity, height }]}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: GAP,
    zIndex: 200,
  },
  segment: {
    width: SEG_WIDTH,
    height: SEG_HEIGHT,
    borderRadius: SEG_RADIUS,
    backgroundColor: '#FFFFFF',
  },
});
