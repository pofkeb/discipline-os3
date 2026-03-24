import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.brand, { color: colors.accent }]}>DISCIPLINE</Text>
            <Text style={[styles.brandSub, { color: colors.textPrimary }]}>OS</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>Create your account</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              testID="register-name-input"
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Full Name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TextInput
              testID="register-email-input"
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              testID="register-password-input"
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              testID="register-submit-btn"
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity testID="go-to-login-btn" onPress={() => router.back()} style={styles.switchBtn}>
            <Text style={[styles.switchText, { color: colors.textSecondary }]}>
              Already have an account? <Text style={{ color: colors.accent, fontFamily: 'Inter_700Bold' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: spacing.xxl },
  brand: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.hero, letterSpacing: 2 },
  brandSub: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.display, marginTop: -8 },
  tagline: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, marginTop: spacing.sm },
  form: { gap: spacing.md },
  input: { height: 56, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize.base, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  button: { height: 56, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#FF3B30', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 4 } }) },
  buttonText: { color: '#FFFFFF', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1 },
  switchBtn: { alignItems: 'center', marginTop: spacing.xl },
  switchText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm },
});
