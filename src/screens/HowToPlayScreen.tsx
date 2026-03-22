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
  'On your turn you can draw once if your hand has fewer than 3 cards, throw one selected card, play one playable card, place one protection card, and then finish your turn.',
  'Protection cards can be dragged onto your protection row above each Awawa slot.',
  'Aguila attacks to the right. It prefers an Awawa marked by Solcito, otherwise an unprotected Awawa, and it can skip fully protected players until it finds a valid target. After choosing Aguila, you must pick a valid Awawa on that player board and confirm with Eat or cancel the action.',
  'Bebe restores one missing Awawa if you have space and Colonia still has stock.',
  'Solcito uses a two-step action. Choose an empty protection slot on the next eligible player, then confirm with Send to Rest or cancel. It marks that Awawa as a priority target and lasts until that player has started 2 turns.',
  'Correr is a temporary protection card. It blocks Aguila for 2 turns of the protected player and then disappears.',
  'Elefante covers all of your alive protection slots, replaces any card already there, and blocks Aguila for 2 turns of that player.',
  'Toilet is a temporary protection card that lasts 2 turns, like Correr, but only one player can have any Toilet protections on the board at a time.',
  'Gritar uses a two-step action. Choose a removable protection from the closest eligible player to your left, then confirm with Scare or cancel. It cannot remove Elefante or Solcito.',
  'Rey can be played only if you have fewer than 5 Awawas. It uses a two-step action: choose one Awawa from the player with the most Awawas, breaking ties by the closest player to your right, then confirm with Stole or cancel.',
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
