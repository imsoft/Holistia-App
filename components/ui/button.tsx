import * as React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type PressableProps,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: { backgroundColor: c.primary },
    outline: { backgroundColor: 'transparent' as const, borderWidth: 2, borderColor: c.primary },
    ghost: { backgroundColor: 'transparent' as const },
  };

  const textStyles = {
    primary: { color: c.primaryForeground },
    outline: { color: c.primary },
    ghost: { color: c.primary },
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        typeof style === 'object' && style,
      ]}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? c.primaryForeground : c.primary}
          size="small"
        />
      ) : (
        <Text style={[styles.text, textStyles[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.9,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
