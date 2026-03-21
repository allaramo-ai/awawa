import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type DeckIndicatorProps = {
  cardsLeft: number;
};

export function DeckIndicator({ cardsLeft }: DeckIndicatorProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.counter}>{cardsLeft} cards left</Text>
      <View style={styles.deck}>
        <View style={[styles.card, styles.backCard]} />
        <View style={[styles.card, styles.middleCard]} />
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Deck</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  counter: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  deck: {
    width: 84,
    height: 112,
  },
  card: {
    position: 'absolute',
    right: 0,
    width: 76,
    height: 104,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.textPrimary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backCard: {
    top: 8,
    right: 8,
    opacity: 0.3,
  },
  middleCard: {
    top: 4,
    right: 4,
    opacity: 0.6,
  },
  cardLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
});
