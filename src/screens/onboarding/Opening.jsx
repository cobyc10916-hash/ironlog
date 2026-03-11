import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
export default function Opening({ navigation }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 950,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 950,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.root}>

      {/* Centered group: IRONLOG + divider + tagline + BEGIN */}
      <View style={styles.group}>
        <Text style={styles.brand}>IRONLOG</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>
          THE APP THAT{'\n'}DOESN'T CODDLE YOU
        </Text>
        <Animated.View style={[styles.beginWrapper, { transform: [{ scale: pulse }] }]}>
          <TouchableOpacity
            style={styles.beginButton}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation?.navigate('Intensity'); }}
            activeOpacity={0.8}
          >
            <Text style={styles.beginText}>BEGIN</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Sign in — pinned to bottom independently */}
      <TouchableOpacity
        onPress={() => navigation?.navigate('SignIn')}
        activeOpacity={0.6}
        style={styles.signInHitArea}
      >
        <Text style={styles.signIn}>ALREADY HAVE AN ACCOUNT? SIGN IN</Text>
      </TouchableOpacity>

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

  /* ── centered group ── */
  group: {
    alignItems: 'center',
    width: '100%',
    gap: 0,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 52,
    color: colors.white,
    letterSpacing: 8,
    textAlign: 'center',
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: colors.white,
    opacity: 0.25,
    marginVertical: 16,
  },
  tagline: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.white,
    letterSpacing: 4,
    textAlign: 'center',
    lineHeight: 32,
  },
  beginWrapper: {
    marginTop: 40,
  },
  beginButton: {
    borderColor: colors.white,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: colors.background,
    paddingVertical: 18,
    paddingHorizontal: 72,
  },
  beginText: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.white,
    letterSpacing: 8,
  },

  /* ── sign in ── */
  signInHitArea: {
    position: 'absolute',
    bottom: 48,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  signIn: {
    fontFamily: fonts.display,
    fontSize: 10,
    color: colors.white,
    opacity: 0.5,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
});
