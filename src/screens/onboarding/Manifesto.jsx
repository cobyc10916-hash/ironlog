import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../constants/colors';

const HEADER_WORDS = ['BREAKING', 'FREE', 'FROM'];
const SLOT_WORDS = [
  'PORNOGRAPHY',
  'LUST',
  'ALCOHOL',
  'NICOTINE',
  'WEED',
  'GAMBLING',
  'SOCIAL MEDIA',
  'DRUGS',
  'VAPING',
  'GAMING',
  'FAST FOOD',
  'SELF-DOUBT',
];

const BREAKING_FADE_MS = 700;
const FREE_FROM_FADE_MS = 1100;
const HEADER_STAGGER_MS = 300;
const SLOT_SLIDE_DISTANCE = 56;
const SLOT_SLIDE_IN_START = 220;
const SLOT_SLIDE_IN_END   = 120;
const SLOT_HOLD_START = 500;
const SLOT_HOLD_END   = 180;
const SLOT_SLIDE_OUT_START = 130;
const SLOT_SLIDE_OUT_END   = 75;

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

export default function Manifesto({ navigation }) {
  const [slotIndex, setSlotIndex] = useState(0);
  const [slotActive, setSlotActive] = useState(false);

  const breakingOpacity = useRef(new Animated.Value(0)).current;
  const freeOpacity     = useRef(new Animated.Value(0)).current;
  const fromOpacity     = useRef(new Animated.Value(0)).current;
  const headerGroupOpacity = useRef(new Animated.Value(1)).current;

  const slotTranslateY = useRef(new Animated.Value(SLOT_SLIDE_DISTANCE)).current;
  const slotOpacity    = useRef(new Animated.Value(1)).current;

  const [startsVisible, setStartsVisible] = useState(false);
  const [nowVisible, setNowVisible] = useState(false);

  useEffect(() => {
    const animateSlotWord = (index) => {
      if (index >= SLOT_WORDS.length) {
        // All slot words done — fade out header group, then show STARTS NOW
        Animated.sequence([
          Animated.timing(headerGroupOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.delay(200),
        ]).start(() => {
          setStartsVisible(true);
          setTimeout(() => setNowVisible(true), 700);
          setTimeout(() => navigation.navigate('Intensity'), 2400);
        });
        return;
      }

      const isLast = index === SLOT_WORDS.length - 1;
      const t = SLOT_WORDS.length > 1 ? Math.pow(index / (SLOT_WORDS.length - 1), 0.35) : 0;
      const slideIn  = lerp(SLOT_SLIDE_IN_START,  SLOT_SLIDE_IN_END,  t);
      const hold     = isLast ? 1000 : lerp(SLOT_HOLD_START, SLOT_HOLD_END, t);
      const slideOut = lerp(SLOT_SLIDE_OUT_START, SLOT_SLIDE_OUT_END, t);

      setSlotIndex(index);
      setSlotActive(true);
      slotTranslateY.setValue(SLOT_SLIDE_DISTANCE);

      if (isLast) {
        Animated.timing(slotTranslateY, { toValue: 0, duration: slideIn, useNativeDriver: true })
          .start(({ finished }) => {
            if (finished) setTimeout(() => animateSlotWord(index + 1), hold);
          });
      } else {
        Animated.sequence([
          Animated.timing(slotTranslateY, { toValue: 0, duration: slideIn, useNativeDriver: true }),
          Animated.delay(hold),
          Animated.timing(slotTranslateY, { toValue: -SLOT_SLIDE_DISTANCE, duration: slideOut, useNativeDriver: true }),
        ]).start(({ finished }) => {
          if (finished) animateSlotWord(index + 1);
        });
      }
    };

    // Stagger-fade in each header word, then start slot
    Animated.sequence([
      Animated.timing(breakingOpacity, { toValue: 1, duration: BREAKING_FADE_MS, useNativeDriver: true }),
      Animated.delay(HEADER_STAGGER_MS),
      Animated.timing(freeOpacity,     { toValue: 1, duration: FREE_FROM_FADE_MS, useNativeDriver: true }),
      Animated.delay(HEADER_STAGGER_MS),
      Animated.timing(fromOpacity,     { toValue: 1, duration: FREE_FROM_FADE_MS, useNativeDriver: true }),
      Animated.delay(600),
    ]).start(() => animateSlotWord(0));
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.headerGroup, { opacity: headerGroupOpacity }]}>
        <Animated.Text style={[styles.headerWord, { opacity: breakingOpacity }]}>BREAKING</Animated.Text>
        <Animated.Text style={[styles.headerWord, styles.headerWordFree, { opacity: freeOpacity }]}>FREE</Animated.Text>
        <Animated.Text style={[styles.headerWord, { opacity: fromOpacity }]}>FROM:</Animated.Text>

        <View style={styles.slotClip}>
          {slotActive && (
            <Animated.Text
              style={[styles.slotWord, { transform: [{ translateY: slotTranslateY }] }]}
            >
              {SLOT_WORDS[slotIndex]}
            </Animated.Text>
          )}
        </View>
      </Animated.View>

      <View style={[styles.startsNow, { opacity: startsVisible || nowVisible ? 1 : 0 }]}>
        <Text style={[styles.startsNowText, { opacity: startsVisible ? 1 : 0 }]}>STARTS</Text>
        <Text style={[styles.startsNowText, styles.nowText, { opacity: nowVisible ? 1 : 0 }]}>NOW</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGroup: {
    alignItems: 'center',
  },
  headerWord: {
    fontFamily: 'OCRA',
    fontSize: 28,
    color: colors.white,
    letterSpacing: 6,
    textAlign: 'center',
    lineHeight: 42,
  },
  headerWordFree: {
    fontSize: 66,
    lineHeight: 82,
  },
  slotClip: {
    height: 52,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 28,
  },
  slotWord: {
    fontFamily: 'OCRA',
    fontSize: 28,
    color: colors.white,
    letterSpacing: 4,
    textAlign: 'center',
    opacity: 0.6,
  },
  startsNow: {
    position: 'absolute',
    alignItems: 'center',
  },
  startsNowText: {
    fontFamily: 'OCRA',
    fontSize: 56,
    color: colors.white,
    letterSpacing: 6,
    textAlign: 'center',
    lineHeight: 68,
  },
  nowText: {
    fontSize: 110,
    lineHeight: 128,
  },
});
