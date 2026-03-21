import { createRef, RefObject, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AwawaSlots } from '../components/AwawaSlots';
import { DeckIndicator } from '../components/DeckIndicator';
import { DropZone, PlayerHand } from '../components/PlayerHand';
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
  protections: Array<Card | null>;
  awawas: boolean[];
  selectedCardId: string | null;
  canDraw: boolean;
  canPlay: boolean;
  gameOver: boolean;
  lastActionText: string | null;
  resultText: string | null;
  onDrawCard: () => void;
  onFinishTurn: () => void;
  onRestart: () => void;
  onSelectCard: (cardId: string) => void;
  onPlayCard: () => void;
  onDropProtection: (cardId: string, slotIndex: number) => void;
};

export function GameScreen({
  playerCount,
  currentPlayer,
  cardsLeft,
  currentHand,
  protections,
  awawas,
  selectedCardId,
  canDraw,
  canPlay,
  gameOver,
  lastActionText,
  resultText,
  onDrawCard,
  onFinishTurn,
  onRestart,
  onSelectCard,
  onPlayCard,
  onDropProtection,
}: GameScreenProps) {
  const slotRefs = useMemo(
    () =>
      Array.from({ length: GAME_CONFIG.awawaSlots }, () =>
        createRef<View>() as RefObject<View | null>,
      ),
    [],
  );
  const [dropZones, setDropZones] = useState<DropZone[]>([]);

  const measureSlot = (slotIndex: number) => {
    const slotRef = slotRefs[slotIndex];

    slotRef.current?.measureInWindow((x, y, width, height) => {
      setDropZones((currentZones) => {
        const nextZone = { slotIndex, x, y, width, height };
        const remainingZones = currentZones.filter(
          (zone) => zone.slotIndex !== slotIndex,
        );

        return [...remainingZones, nextZone].sort(
          (left, right) => left.slotIndex - right.slotIndex,
        );
      });
    });
  };

  const handleSlotLayout = (slotIndex: number) => {
    measureSlot(slotIndex);
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      for (let index = 0; index < GAME_CONFIG.awawaSlots; index += 1) {
        measureSlot(index);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [currentPlayer, lastActionText, awawas, protections, slotRefs]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.turnBlock}>
            <Text style={styles.turnLabel}>Turn of Player {currentPlayer}</Text>
            <Text style={styles.turnMeta}>{playerCount} players in this game</Text>
          </View>
          <View style={styles.deckBlock}>
            <DeckIndicator cardsLeft={cardsLeft} />
            <PrimaryButton
              label="Draw"
              onPress={onDrawCard}
              disabled={gameOver || !canDraw}
            />
          </View>
        </View>

        <View style={styles.centerContent}>
          {gameOver ? (
            <View style={styles.gameOverCard}>
              <Text style={styles.gameOverTitle}>Game Over</Text>
              <Text style={styles.gameOverText}>
                {resultText ?? 'The deck has run out of cards.'}
              </Text>
              <View style={styles.restartWrap}>
                <PrimaryButton label="Start Over" onPress={onRestart} />
              </View>
            </View>
          ) : (
            <View style={styles.playArea}>
              <PlayerHand
                cards={currentHand}
                selectedCardId={selectedCardId}
                dropZones={dropZones}
                onSelectCard={onSelectCard}
                onDropProtection={onDropProtection}
              />
              <AwawaSlots
                protections={protections}
                awawas={awawas}
                slotRefs={slotRefs}
                onSlotLayout={handleSlotLayout}
              />
              <Text style={styles.actionText}>
                {lastActionText ??
                  'Select \u00C1guila to play it, or drag another card into a protection slot.'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomContent}>
          <View style={styles.buttonRow}>
            <View style={styles.buttonWrap}>
              <PrimaryButton
                label="Play Card"
                onPress={onPlayCard}
                disabled={gameOver || !canPlay}
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
  deckBlock: {
    width: 120,
    gap: spacing.md,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  playArea: {
    width: '100%',
    gap: spacing.lg,
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    minHeight: 40,
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
