import { useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { canCardProtect, getCardLabel } from '../game/cards';
import { Card } from '../game/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export type DropZone = {
  slotIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PlayerHandProps = {
  cards: Card[];
  selectedCardId: string | null;
  dropZones: DropZone[];
  onSelectCard: (cardId: string) => void;
  onDropProtection: (cardId: string, slotIndex: number) => void;
};

export function PlayerHand({
  cards,
  selectedCardId,
  dropZones,
  onSelectCard,
  onDropProtection,
}: PlayerHandProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your cards</Text>
      <View style={styles.row}>
        {cards.map((card) => (
          <HandCard
            key={card.id}
            card={card}
            isSelected={selectedCardId === card.id}
            dropZones={dropZones}
            onSelectCard={onSelectCard}
            onDropProtection={onDropProtection}
          />
        ))}
      </View>
    </View>
  );
}

type HandCardProps = {
  card: Card;
  isSelected: boolean;
  dropZones: DropZone[];
  onSelectCard: (cardId: string) => void;
  onDropProtection: (cardId: string, slotIndex: number) => void;
};

function HandCard({
  card,
  isSelected,
  dropZones,
  onSelectCard,
  onDropProtection,
}: HandCardProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const draggable = canCardProtect(card);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          draggable &&
          (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4),
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gestureState) => {
          const moved =
            Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;

          if (moved && draggable) {
            const dropZone = dropZones.find(
              (zone) =>
                gestureState.moveX >= zone.x &&
                gestureState.moveX <= zone.x + zone.width &&
                gestureState.moveY >= zone.y &&
                gestureState.moveY <= zone.y + zone.height,
            );

            if (dropZone) {
              onDropProtection(card.id, dropZone.slotIndex);
            }
          } else {
            onSelectCard(card.id);
          }

          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        },
      }),
    [card.id, draggable, dropZones, onDropProtection, onSelectCard, pan],
  );

  return (
    <Animated.View
      style={[
        styles.card,
        isSelected && styles.selectedCard,
        draggable && styles.draggableCard,
        { transform: pan.getTranslateTransform() },
      ]}
      {...responder.panHandlers}
    >
      <Text style={styles.label}>{getCardLabel(card)}</Text>
      <Text style={styles.meta}>
        {draggable ? 'Drag to protect' : 'Select to play'}
      </Text>
    </Animated.View>
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
    minHeight: 108,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  selectedCard: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceMuted,
  },
  draggableCard: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
