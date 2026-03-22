import { createRef, RefObject, useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AwawaSlots } from '../components/AwawaSlots';
import { CounterBox } from '../components/CounterBox';
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
  playerBoards: Array<{
    id: number;
    protections: Array<Card | null>;
    awawas: boolean[];
  }>;
  cardsLeft: number;
  colonyCount: number;
  currentHand: Card[];
  selectedCardId: string | null;
  pendingTarget: {
    type: 'aguila' | 'solcito' | 'oloroso' | 'gritar' | 'rey';
    playerId: number;
    protections: Array<Card | null>;
    awawas: boolean[];
    validSlotIndexes: number[];
    selectedSlotIndex: number | null;
  } | null;
  playerLost: boolean;
  canDraw: boolean;
  canThrow: boolean;
  canPlay: boolean;
  gameOver: boolean;
  notificationMessages: string[];
  resultText: string | null;
  onDismissNotification: () => void;
  onDrawCard: () => void;
  onThrowCard: () => void;
  onFinishTurn: () => void;
  onRestart: () => void;
  onSelectCard: (cardId: string) => void;
  onSelectTargetSlot: (slotIndex: number) => void;
  onPlayCard: () => void;
  onConfirmTarget: () => void;
  onCancelTarget: () => void;
  onDropProtection: (cardId: string, slotIndex: number) => void;
};

export function GameScreen({
  playerCount,
  currentPlayer,
  playerBoards,
  cardsLeft,
  colonyCount,
  currentHand,
  selectedCardId,
  pendingTarget,
  playerLost,
  canDraw,
  canThrow,
  canPlay,
  gameOver,
  notificationMessages,
  resultText,
  onDismissNotification,
  onDrawCard,
  onThrowCard,
  onFinishTurn,
  onRestart,
  onSelectCard,
  onSelectTargetSlot,
  onPlayCard,
  onConfirmTarget,
  onCancelTarget,
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
  const [peekPlayerId, setPeekPlayerId] = useState<number | null>(null);
  const defaultMessage = playerLost
    ? 'You lost.'
    : 'Protect your Awawas or play a card.';
  const activeNotification = notificationMessages[0] ?? defaultMessage;
  const hasDismissibleNotification = notificationMessages.length > 0;
  const isChoosingTarget = pendingTarget !== null;
  const visiblePlayerId = isChoosingTarget
    ? pendingTarget.playerId
    : peekPlayerId ?? currentPlayer;
  const peekedPlayer = playerBoards.find((player) => player.id === visiblePlayerId);
  const visibleBoard = isChoosingTarget
    ? pendingTarget
    : peekedPlayer ?? playerBoards[0];
  const isPeeking = !isChoosingTarget && peekPlayerId !== null;
  const targetActionLabel =
    pendingTarget?.type === 'aguila'
      ? 'Eat'
      : pendingTarget?.type === 'solcito'
        ? 'Send to Rest'
        : pendingTarget?.type === 'oloroso'
          ? 'Spread Smell'
        : pendingTarget?.type === 'gritar'
          ? 'Scare'
          : pendingTarget?.type === 'rey'
            ? 'Stole'
            : null;
  const targetPrompt =
    pendingTarget?.type === 'aguila'
      ? `Choose an Awawa from P${pendingTarget.playerId}`
      : pendingTarget?.type === 'solcito'
        ? `Choose where to send Solcito on P${pendingTarget.playerId}`
        : pendingTarget?.type === 'oloroso'
          ? `Choose where to send Oloroso on P${pendingTarget.playerId}`
        : pendingTarget?.type === 'gritar'
          ? `Choose an Awawa to scare on P${pendingTarget.playerId}`
          : pendingTarget?.type === 'rey'
            ? `Choose an Awawa to stole from P${pendingTarget.playerId}`
            : '';

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
  }, [currentPlayer, activeNotification, visibleBoard, slotRefs]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.turnBlock}>
            <Text style={styles.turnLabel}>Turn of Player {currentPlayer}</Text>
            <Text style={styles.turnMeta}>{playerCount} players in this game</Text>
            <View style={styles.peekRow}>
              {playerBoards.map((player) => (
                <Pressable
                  key={player.id}
                  disabled={player.id === currentPlayer}
                  onPressIn={
                    player.id === currentPlayer || isChoosingTarget
                      ? undefined
                      : () => setPeekPlayerId(player.id)
                  }
                  onPressOut={
                    player.id === currentPlayer || isChoosingTarget
                      ? undefined
                      : () => setPeekPlayerId(null)
                  }
                  onPress={() => undefined}
                  testID={`peek-button-p${player.id}`}
                  accessibilityState={{ disabled: player.id === currentPlayer }}
                  style={({ pressed }) => [
                    styles.peekButton,
                    player.id === currentPlayer && styles.peekButtonDisabled,
                    peekPlayerId === player.id && styles.peekButtonActive,
                    pressed &&
                      player.id !== currentPlayer &&
                      styles.peekButtonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.peekLabel,
                      player.id === currentPlayer && styles.peekLabelDisabled,
                    ]}
                  >
                    {`P${player.id}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.sidePanel}>
            <View style={styles.topCounters}>
              <CounterBox title="Colonia" value={colonyCount} />
              <DeckIndicator cardsLeft={cardsLeft} />
            </View>
            <PrimaryButton
              label="Draw"
              onPress={onDrawCard}
              disabled={gameOver || playerLost || !canDraw}
              size="compact"
            />
            <PrimaryButton
              label="Throw Card"
              onPress={onThrowCard}
              disabled={gameOver || playerLost || !canThrow}
              size="compact"
              variant="outline"
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
              {!isPeeking && !isChoosingTarget && !playerLost ? (
                <View style={styles.handArea} testID="current-player-hand">
                  <PlayerHand
                    cards={currentHand}
                    selectedCardId={selectedCardId}
                    dropZones={dropZones}
                    onSelectCard={onSelectCard}
                    onDropProtection={onDropProtection}
                  />
                </View>
              ) : !isChoosingTarget ? (
                <View style={styles.peekHeader} testID="peek-board-header">
                  <Text style={styles.peekTitle}>{`Viewing P${visiblePlayerId}`}</Text>
                </View>
              ) : null}
              {isChoosingTarget ? (
                <View style={styles.peekHeader} testID="target-action-header">
                  <Text style={styles.peekTitle}>{targetPrompt}</Text>
                </View>
              ) : null}
              <AwawaSlots
                protections={visibleBoard.protections}
                awawas={visibleBoard.awawas}
                slotRefs={slotRefs}
                onSlotLayout={handleSlotLayout}
                selectableSlotIndexes={pendingTarget ? pendingTarget.validSlotIndexes : []}
                selectedSlotIndex={pendingTarget?.selectedSlotIndex ?? null}
                onPressAwawaSlot={onSelectTargetSlot}
              />
              {!isPeeking && !isChoosingTarget ? (
                <View style={styles.alertBox} testID="notification-box">
                  <View style={styles.alertMessage}>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={styles.actionText}
                    >
                      {activeNotification}
                    </Text>
                  </View>
                  {hasDismissibleNotification ? (
                    <Pressable
                      onPress={onDismissNotification}
                      style={styles.closeButton}
                    >
                      <Text style={styles.closeLabel}>X</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.bottomContent}>
          <View style={styles.buttonRow}>
            <View style={styles.buttonWrap}>
            <PrimaryButton
              label={isChoosingTarget ? targetActionLabel ?? 'Play Card' : 'Play Card'}
              onPress={isChoosingTarget ? onConfirmTarget : onPlayCard}
              disabled={
                  gameOver ||
                  playerLost ||
                  (isChoosingTarget
                    ? pendingTarget?.selectedSlotIndex === null
                    : !canPlay)
                }
              />
            </View>
            <View style={styles.buttonWrap}>
              <PrimaryButton
                label={isChoosingTarget ? 'Cancel' : 'Finish Turn'}
                onPress={isChoosingTarget ? onCancelTarget : onFinishTurn}
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
    fontSize: 25,
    fontWeight: '800',
  },
  turnMeta: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  peekRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  peekButton: {
    minWidth: 48,
    minHeight: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
  },
  peekButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceMuted,
  },
  peekButtonDisabled: {
    opacity: 0.35,
  },
  peekButtonPressed: {
    opacity: 0.85,
  },
  peekLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  peekLabelDisabled: {
    color: colors.textSecondary,
  },
  sidePanel: {
    width: 188,
    gap: spacing.md,
  },
  topCounters: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
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
  handArea: {
    minHeight: 150,
  },
  peekHeader: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekTitle: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  alertBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
  },
  alertMessage: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 52,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  closeLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
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
