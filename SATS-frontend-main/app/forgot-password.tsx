import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '../hooks/useSafeRouter';
import { authAPI } from '../services/api';

export default function ForgotPasswordScreen() {
  const router = useSafeRouter();
  const [step, setStep] = useState<1 | 2>(1); // 1 = Request Code, 2 = Verify Code & Reset
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1: Send reset code
  const handleRequestCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your registered email address');
      return;
    }

    try {
      setLoading(true);
      const res = await authAPI.forgotPassword(email.trim());
      
      let alertMsg = 'A 6-digit verification code has been sent to your email address.';
      // If running locally and resetCode returned in development
      if (res.resetCode) {
        alertMsg += `\n\n[Dev Code: ${res.resetCode}]`;
        setCode(res.resetCode);
      }

      Alert.alert('Code Sent', alertMsg, [
        { text: 'OK', onPress: () => setStep(2) }
      ]);
    } catch (error: any) {
      Alert.alert(
        'Request Failed',
        error.response?.data?.message || 'Could not send reset code. Please verify your email.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code & reset password
  const handleResetPassword = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please enter and confirm your new password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await authAPI.resetPassword({
        email: email.trim(),
        code: code.trim(),
        password,
      });

      Alert.alert(
        'Password Reset Successful',
        'Your password has been updated. You can now log in with your new credentials.',
        [
          {
            text: 'Go to Login',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Reset Failed',
        error.response?.data?.message || 'Failed to reset password. Please check the code and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="key-outline" size={48} color="#007AFF" />
          </View>
          <Text style={styles.title}>
            {step === 1 ? 'Forgot Password' : 'Set New Password'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Enter your email to receive a recovery code'
              : `Enter the code sent to ${email}`}
          </Text>
        </View>

        {/* Step 1 Form */}
        {step === 1 ? (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Registered Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleRequestCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/login')}>
              <Ionicons name="arrow-back" size={18} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={styles.secondaryButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Step 2 Form */
          <View style={styles.form}>
            {/* 6-Digit Code */}
            <View style={styles.inputContainer}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { letterSpacing: 4, fontWeight: 'bold' }]}
                placeholder="6-Digit Code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoCorrect={false}
              />
            </View>

            {/* New Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password (min 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm New Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>Change Email / Resend</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.replace('/login')} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: '#1e293b',
  },
  eyeIcon: {
    padding: 6,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  textButton: {
    paddingVertical: 8,
  },
  textButtonLabel: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
