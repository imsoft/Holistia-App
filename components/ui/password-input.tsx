import * as React from 'react';
import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Input, type InputProps } from './input';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';

export function PasswordInput(props: Omit<InputProps, 'secureTextEntry'>) {
  const [visible, setVisible] = useState(false);
  const iconColor = useThemeColor(
    { light: Colors.light.mutedForeground, dark: Colors.dark.mutedForeground },
    'icon'
  );

  return (
    <View style={styles.wrapper}>
      <Input
        {...props}
        secureTextEntry={!visible}
        style={[props.style, styles.input]}
      />
      <Pressable
        style={styles.eyeButton}
        onPress={() => setVisible(!visible)}
        hitSlop={12}
      >
        <MaterialIcons
          name={visible ? 'visibility-off' : 'visibility'}
          size={22}
          color={iconColor}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  input: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 32,
  },
});
