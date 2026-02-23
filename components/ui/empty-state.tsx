import { View, Text, StyleSheet, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export interface EmptyStateProps {
  icon?: MaterialIconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
}

const DEFAULT_ICON: MaterialIconName = 'inbox';

export function EmptyState({
  icon = DEFAULT_ICON,
  title,
  subtitle,
  actionLabel,
  onAction,
  iconColor,
  titleColor,
  subtitleColor,
  buttonBgColor,
  buttonTextColor = '#fff',
}: EmptyStateProps) {
  const iconC = iconColor ?? '#9ca3af';
  const titleC = titleColor ?? '#374151';
  const subC = subtitleColor ?? '#6b7280';

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialIcons name={icon} size={56} color={iconC} />
      </View>
      <Text style={[styles.title, { color: titleC }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: subC }]}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.button,
            buttonBgColor && { backgroundColor: buttonBgColor },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: buttonTextColor }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: { opacity: 0.9 },
});
