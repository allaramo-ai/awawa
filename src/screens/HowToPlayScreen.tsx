import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type HowToPlayScreenProps = {
  onBack: () => void;
};

const rules = [
  'Pick 1 to 4 players, then start the game.',
  'Each player begins with 5 Awawa slots, 3 cards in hand, and shared access to the deck and Colonia.',
  'On your turn you can draw once if your hand has fewer than 3 cards, play one playable card, place one protection card, and then finish your turn.',
  'Protection cards can be dragged onto your protection row above each Awawa slot.',
  'Aguila attacks only the player to your right. It prefers an Awawa marked by Solcito. If it kills an unprotected Awawa, the rest of that player protections are removed.',
  'Bebe restores one missing Awawa if you have space and Colonia still has stock.',
  'Solcito lands on the next player board with an empty protection slot and marks that Awawa as a priority target.',
  'Elefante covers all of your alive protection slots, replaces any card already there, and blocks Aguila until your next turn starts.',
  'A player with no Awawas left is out. The game ends when one player remains or the deck is exhausted.',
];

export function HowToPlayScreen({ onBack }: HowToPlayScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Awawa</Text>
          <Text style={styles.title}>How To Play</Text>
          <Text style={styles.subtitle}>
            Current rules for the mobile test version.
          </Text>
        </View>

        <View style={styles.rulesCard}>
          {rules.map((rule, index) => (
            <View key={rule} style={styles.ruleRow}>
              <Text style={styles.ruleIndex}>{index + 1}.</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton label="Back To Setup" onPress={onBack} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
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
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  rulesCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  ruleIndex: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 18,
  },
  ruleText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
});
