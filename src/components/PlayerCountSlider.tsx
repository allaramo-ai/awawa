import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';

import { PLAYER_COUNT } from '../constants/game';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type PlayerCountSliderProps = {
  value: number;
  onValueChange: (value: number) => void;
};

export function PlayerCountSlider({
  value,
  onValueChange,
}: PlayerCountSliderProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>How many players?</Text>
      <Text style={styles.value}>{value}</Text>
      <Slider
        minimumValue={PLAYER_COUNT.min}
        maximumValue={PLAYER_COUNT.max}
        step={1}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.surfaceMuted}
        thumbTintColor={colors.accent}
        value={value}
        onValueChange={onValueChange}
      />
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>{PLAYER_COUNT.min} player</Text>
        <Text style={styles.rangeText}>{PLAYER_COUNT.max} players</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  value: {
    color: colors.textPrimary,
    fontSize: 56,
    fontWeight: '800',
    textAlign: 'center',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
