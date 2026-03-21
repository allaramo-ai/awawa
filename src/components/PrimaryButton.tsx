import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  size?: 'default' | 'compact';
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'solid',
  size = 'default',
}: PrimaryButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === 'compact' && styles.compactButton,
        variant === 'solid' ? styles.solidButton : styles.outlineButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressedButton,
      ]}
    >
      <Text
        style={[
          styles.label,
          size === 'compact' && styles.compactLabel,
          variant === 'solid' ? styles.solidLabel : styles.outlineLabel,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  compactButton: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  solidButton: {
    backgroundColor: colors.accent,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
  },
  compactLabel: {
    fontSize: 14,
  },
  solidLabel: {
    color: colors.background,
  },
  outlineLabel: {
    color: colors.textPrimary,
  },
  disabledLabel: {
    color: colors.textSecondary,
  },
});
