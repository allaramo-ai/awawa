import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { PlayerCountSlider } from '../components/PlayerCountSlider';
import { PLAYER_COUNT } from '../constants/game';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function SetupScreen() {
  const [playerCount, setPlayerCount] = useState<number>(
    PLAYER_COUNT.defaultValue,
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Awawa</Text>
          <Text style={styles.title}>Set up your next card game</Text>
          <Text style={styles.subtitle}>
            Choose the number of players before the rest of the game flow is
            added.
          </Text>
        </View>

        <PlayerCountSlider
          value={playerCount}
          onValueChange={setPlayerCount}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
});
