import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

export function BackButton() {
    const colorScheme = useColorScheme();
    const c = Colors[colorScheme ?? 'light'];

    return (
        <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
            <MaterialIcons name="chevron-left" size={32} color={c.primary} />
            <Text style={[styles.text, { color: c.primary }]}>Atrás</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -8, // Compensate for icon padding
    },
    pressed: {
        opacity: 0.7,
    },
    text: {
        fontSize: 17,
        marginLeft: -4,
    },
});
