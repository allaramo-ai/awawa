import { RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCardLabel } from '../game/cards';
import { Card } from '../game/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type SlotRef = RefObject<View | null>;

type AwawaSlotsProps = {
  protections: Array<Card | null>;
  awawas: boolean[];
  slotRefs: SlotRef[];
  onSlotLayout: (slotIndex: number) => void;
  selectableSlotIndexes?: number[];
  selectedSlotIndex?: number | null;
  onPressAwawaSlot?: (slotIndex: number) => void;
};

export function AwawaSlots({
  protections,
  awawas,
  slotRefs,
  onSlotLayout,
  selectableSlotIndexes = [],
  selectedSlotIndex = null,
  onPressAwawaSlot,
}: AwawaSlotsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {protections.map((card, index) => (
          <View
            key={`protection-${index}`}
            ref={slotRefs[index]}
            onLayout={() => onSlotLayout(index)}
            style={[styles.slot, !awawas[index] && styles.hiddenSlot]}
          >
            <Text style={styles.label}>
              {awawas[index] && card ? getCardLabel(card) : ''}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.row}>
        {awawas.map((alive, index) => (
          <Pressable
            key={`awawa-${index}`}
            disabled={!selectableSlotIndexes.includes(index)}
            onPress={() => onPressAwawaSlot?.(index)}
            style={[
              styles.slot,
              !alive && styles.hiddenSlot,
              selectableSlotIndexes.includes(index) && styles.selectableSlot,
              selectedSlotIndex === index && styles.selectedSlot,
            ]}
          >
            <Text style={styles.label}>{alive ? 'Awawa' : ''}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  slot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  hiddenSlot: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  selectableSlot: {
    borderColor: colors.accent,
  },
  selectedSlot: {
    backgroundColor: colors.surfaceMuted,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
