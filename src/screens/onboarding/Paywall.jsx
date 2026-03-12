import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import OnboardingProgress from '../../components/OnboardingProgress';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TIMELINE = [
  { day: 'TODAY', desc: 'FULL ACCESS UNLOCKED.' },
  { day: 'DAY 5', desc: 'TRIAL REMINDER SENT.' },
  { day: 'DAY 7', desc: 'SUBSCRIPTION BEGINS. CANCEL ANYTIME.' },
];

export default function Paywall({ navigation }) {
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  const line1Opacity = useRef(new Animated.Value(0)).current;
  const line2Opacity = useRef(new Animated.Value(0)).current;
  const line3Opacity = useRef(new Animated.Value(0)).current;
  const paywallY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(line1Opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(line2Opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(line3Opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(paywallY, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* Phase 1: centered text */}
      <View style={[styles.textPhase, { pointerEvents: 'none' }]}>
        <Animated.Text style={[styles.headline, { opacity: line1Opacity }]}>
          NO HAND HOLDING.
        </Animated.Text>
        <Animated.Text style={[styles.headline, { opacity: line2Opacity }]}>
          NO STREAKS GIVEN.
        </Animated.Text>
        <Animated.Text style={[styles.headline, { opacity: line3Opacity }]}>
          JUST YOU VS YOU.
        </Animated.Text>
      </View>

      <OnboardingProgress currentStep={5} />

      {/* Phase 2: paywall panel */}
      <Animated.View style={[styles.paywallPanel, { transform: [{ translateY: paywallY }] }]}>
        <SafeAreaView style={styles.paywallSafe}>

          {/* Upper section — timeline centered vertically within this flex region */}
          <View style={styles.upperSection}>
            <View style={styles.timeline}>
              {TIMELINE.map((item, index) => {
                const isLast = index === TIMELINE.length - 1;
                return (
                  <View key={item.day} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineCircle, index === 0 && styles.timelineCircleFilled]} />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={[styles.timelineRight, !isLast && styles.timelineRightSpaced]}>
                      <Text style={styles.timelineDay}>{item.day}</Text>
                      <Text style={styles.timelineDesc}>{item.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Bottom group — divider + pricing + CTA + footer anchored to bottom */}
          <View style={styles.bottomGroup}>
            <View style={styles.divider} />

            <View style={styles.pricing}>
              <TouchableOpacity
                style={[styles.priceRow, selectedPlan !== 'monthly' && styles.priceRowDimmed]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPlan('monthly'); }}
                activeOpacity={0.8}
              >
                <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioFilled]} />
                <Text style={styles.planLabel}>MONTHLY</Text>
                <Text style={styles.planPrice}>$4.99/MONTH</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.priceRow, selectedPlan !== 'yearly' && styles.priceRowDimmed]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPlan('yearly'); }}
                activeOpacity={0.8}
              >
                <View style={[styles.radio, selectedPlan === 'yearly' && styles.radioFilled]} />
                <View style={styles.yearlyContent}>
                  <View style={styles.yearlyTopRow}>
                    <Text style={styles.planLabel}>YEARLY</Text>
                    <Text style={styles.planPrice}>$29.99/YEAR</Text>
                  </View>
                  <Text style={styles.yearlyTag}>LESS THAN $2.50 A MONTH</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.ctaButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation?.navigate('CreateAccount'); }} activeOpacity={0.8}>
              <Text style={styles.ctaText}>START YOUR 7 DAYS</Text>
            </TouchableOpacity>
            <Text style={styles.footer}>ALL PLANS INCLUDE A 7-DAY TRIAL</Text>
          </View>

        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Phase 1
  textPhase: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.white,
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 34,
  },

  // Paywall panel
  paywallPanel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  paywallSafe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

  // Upper section: takes all remaining space, centers timeline within it
  upperSection: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 48,
  },

  // Bottom group: stacks naturally, anchored to bottom
  bottomGroup: {},

  // Timeline
  timeline: {},
  timelineRow: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 20,
    alignItems: 'center',
  },
  timelineCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
    marginTop: 7, // align circle center with 18px header text cap-height
  },
  timelineCircleFilled: {
    backgroundColor: colors.white,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: colors.white,
    opacity: 0.25,
    marginTop: -4, // start line from near circle center
    minHeight: 16,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 4,
  },
  timelineRightSpaced: {
    paddingBottom: 44,
  },
  timelineDay: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 1.5,
  },
  timelineDesc: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.white,
    opacity: 0.5,
    marginTop: 3,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.white,
    opacity: 0.2,
    marginBottom: 12,
  },

  // Pricing
  pricing: {
    gap: 12,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  priceRowDimmed: {
    opacity: 0.35,
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.white,
    marginRight: 14,
    marginTop: 1,
  },
  radioFilled: {
    backgroundColor: colors.white,
  },
  planLabel: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.white,
    letterSpacing: 2,
    flex: 1,
  },
  yearlyContent: {
    flex: 1,
  },
  yearlyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearlyTag: {
    fontFamily: fonts.display,
    fontSize: 8,
    color: colors.white,
    opacity: 0.5,
    marginTop: 4,
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
  },
  planPrice: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.white,
    letterSpacing: 1,
  },

  // CTA button
  ctaButton: {
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.background,
    letterSpacing: 4,
  },

  // Footer
  footer: {
    fontFamily: fonts.display,
    fontSize: 10,
    color: colors.white,
    opacity: 0.4,
    textAlign: 'center',
    letterSpacing: 2,
  },
});
