import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AwawaSlots } from '../components/AwawaSlots';
import { DeckIndicator } from '../components/DeckIndicator';
import { PlayerHand } from '../components/PlayerHand';
import { PrimaryButton } from '../components/PrimaryButton';
import { GAME_CONFIG } from '../constants/game';
import { Card } from '../game/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type GameScreenProps = {
  playerCount: number;
  currentPlayer: number;
  cardsLeft: number;
  currentHand: Card[];
  canDraw: boolean;
  gameOver: boolean;
  onDrawCard: () => void;
  onFinishTurn: () => void;
  onRestart: () => void;
};

export function GameScreen({
  playerCount,
  currentPlayer,
  cardsLeft,
  currentHand,
  canDraw,
  gameOver,
  onDrawCard,
  onFinishTurn,
  onRestart,
}: GameScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.turnBlock}>
            <Text style={styles.turnLabel}>Turn of Player {currentPlayer}</Text>
            <Text style={styles.turnMeta}>{playerCount} players in this game</Text>
          </View>
          <DeckIndicator cardsLeft={cardsLeft} />
        </View>

        <View style={styles.centerContent}>
          {gameOver ? (
            <View style={styles.gameOverCard}>
              <Text style={styles.gameOverTitle}>Game Over</Text>
              <Text style={styles.gameOverText}>
                The deck has run out of cards.
              </Text>
              <View style={styles.restartWrap}>
                <PrimaryButton label="Start Over" onPress={onRestart} />
              </View>
            </View>
          ) : (
            <View style={styles.playArea}>
              <PlayerHand cards={currentHand} />
              <AwawaSlots slots={GAME_CONFIG.awawaSlots} />
            </View>
          )}
        </View>

        <View style={styles.bottomContent}>
          <View style={styles.buttonRow}>
            <View style={styles.buttonWrap}>
              <PrimaryButton
                label="Draw 1 card"
                onPress={onDrawCard}
                disabled={gameOver || !canDraw}
              />
            </View>
            <View style={styles.buttonWrap}>
              <PrimaryButton
                label="Finish Turn"
                onPress={onFinishTurn}
                disabled={gameOver}
                variant="outline"
              />
            </View>
          </View>
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  turnBlock: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  turnLabel: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  turnMeta: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  playArea: {
    width: '100%',
    gap: spacing.xl,
  },
  gameOverCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  gameOverTitle: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
  },
  gameOverText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  restartWrap: {
    width: '100%',
    marginTop: spacing.sm,
  },
  bottomContent: {
    gap: spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  buttonWrap: {
    flex: 1,
  },
});
