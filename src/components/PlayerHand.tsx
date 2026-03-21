import { StyleSheet, Text, View } from 'react-native';

import { getCardLabel } from '../game/cards';
import { Card } from '../game/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type PlayerHandProps = {
  cards: Card[];
};

export function PlayerHand({ cards }: PlayerHandProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your cards</Text>
      <View style={styles.row}>
        {cards.map((card) => (
          <View key={card.id} style={styles.card}>
            <Text style={styles.label}>{getCardLabel(card)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    minHeight: 92,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
