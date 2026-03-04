import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

const STREAK = 21;
const LONGEST_STREAK = 50;

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.root}>
      {/* Top icons */}
      <View style={styles.topBar}>
        <Ionicons name="shield-outline" size={22} color={colors.white} />
        <Ionicons name="settings-outline" size={22} color={colors.white} />
      </View>

      {/* YOU VS YOU — floated halfway between top bar and center block */}
      <View style={styles.youVsYouContainer}>
        <Text style={styles.youVsYou}>YOU VS YOU</Text>
      </View>

      {/* Center content */}
      <View style={styles.center}>
        <Text style={styles.daysClean}>DAYS CLEAN</Text>
        <View style={styles.miniDivider} />
        <Text style={styles.streakNumber}>{STREAK}</Text>

        <TouchableOpacity style={styles.resetButton} activeOpacity={0.8}>
          <Text style={styles.resetText}>RESET</Text>
        </TouchableOpacity>
      </View>

      {/* Balancing spacer so center block is truly centered */}
      <View style={styles.bottomSpacer} />

      {/* Bottom */}
      <View style={styles.bottom}>
        <View style={styles.divider} />
        <Text style={styles.longestStreak}>LONGEST STREAK: {LONGEST_STREAK} DAYS</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  youVsYouContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  youVsYou: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.white,
    opacity: 0.3,
    letterSpacing: 6,
  },
  center: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  miniDivider: {
    width: 60,
    height: 1,
    backgroundColor: colors.white,
    opacity: 0.5,
    marginTop: 4,
  },
  daysClean: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.white,
    letterSpacing: 8,
  },
  streakNumber: {
    fontFamily: fonts.display,
    fontSize: 160,
    color: colors.white,
    lineHeight: 160,
    marginVertical: 48,
  },
  resetButton: {
    borderColor: colors.white,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: colors.background,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginTop: 16,
  },
  resetText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 6,
  },
  bottomSpacer: {
    flex: 1,
  },
  bottom: {
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.white,
  },
  longestStreak: {
    fontFamily: fonts.display,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 3,
  },
});
