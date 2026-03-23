import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials');
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
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>Build your system. Own your day.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              testID="login-email-input"
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
              testID="login-password-input"
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              testID="login-submit-btn"
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>SIGN IN</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity testID="go-to-register-btn" onPress={() => router.push('/(auth)/register')} style={styles.switchBtn}>
            <Text style={[styles.switchText, { color: colors.textSecondary }]}>
              Don't have an account? <Text style={{ color: colors.accent, fontFamily: 'Inter_700Bold' }}>Sign Up</Text>
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
  button: { height: 56, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', shadowColor: '#FF3B30', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.lg, letterSpacing: 1 },
  switchBtn: { alignItems: 'center', marginTop: spacing.xl },
  switchText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm },
});
