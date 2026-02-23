import * as React from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  Text,
  type TextInputProps,
} from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const backgroundColor = useThemeColor(
    { light: Colors.light.card, dark: Colors.dark.card },
    'background'
  );
  const borderColorError = useThemeColor(
    { light: Colors.light.destructive, dark: Colors.dark.destructive },
    'background'
  );
  const borderColorNormal = useThemeColor(
    { light: Colors.light.border, dark: Colors.dark.border },
    'icon'
  );
  const borderColor = error ? borderColorError : borderColorNormal;
  const textColor = useThemeColor(
    { light: Colors.light.foreground, dark: Colors.dark.foreground },
    'text'
  );
  const placeholderColor = useThemeColor(
    { light: Colors.light.mutedForeground, dark: Colors.dark.mutedForeground },
    'icon'
  );
  const errorColor = useThemeColor(
    { light: Colors.light.destructive, dark: Colors.dark.destructive },
    'background'
  );

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor,
            borderColor,
            color: textColor,
          },
          style,
        ]}
        placeholderTextColor={placeholderColor}
        {...props}
      />
      {error ? (
        <Text style={[styles.error, { color: errorColor }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
