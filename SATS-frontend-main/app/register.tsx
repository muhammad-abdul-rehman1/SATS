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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '../hooks/useSafeRouter';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

export default function RegisterScreen() {
  const router = useSafeRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [resending, setResending] = useState(false);

  const { register, verifyEmail } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      const res = await register({ name, email: email.trim(), password });
      if (res?.requireVerification) {
        setIsVerifying(true);
        Alert.alert(
          'Verification Code Sent',
          `A 6-digit activation code has been sent to ${email.trim()}. Please enter it to activate your account.`
        );
        return;
      }
      router.replace('/(tabs)/assets');
    } catch (error: any) {
      const isNetworkError =
        error.message?.includes('Network Error') ||
        error.message?.includes('network') ||
        error.code === 'ERR_NETWORK' ||
        !error.response;

      if (isNetworkError) {
        Alert.alert(
          'Connection Error',
          'Cannot reach the backend server. Make sure the PC is running the backend and both devices are on the same Wi-Fi.',
          [
            { text: 'Retry', onPress: () => handleRegister() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Registration Failed', error.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verifyCode.trim()) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }

    try {
      setLoading(true);
      await verifyEmail(email.trim(), verifyCode.trim());
      Alert.alert('Success', 'Your email has been verified and your account is active!', [
        { text: 'Get Started', onPress: () => router.replace('/(tabs)/assets') }
      ]);
    } catch (error: any) {
      Alert.alert('Verification Failed', error.response?.data?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResending(true);
      await authAPI.resendVerification(email.trim());
      Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Resend Failed', error.response?.data?.message || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons 
              name={isVerifying ? "mail-unread-outline" : "qr-code"} 
              size={isVerifying ? 50 : 60} 
              color="#007AFF" 
            />
          </View>
          <Text style={styles.title}>
            {isVerifying ? 'Verify Your Email' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {isVerifying 
              ? `Enter the 6-digit code sent to ${email}`
              : 'Join Smart Asset Tracker'}
          </Text>
        </View>

        {isVerifying ? (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { letterSpacing: 4, fontWeight: 'bold' }]}
                placeholder="6-Digit Code"
                value={verifyCode}
                onChangeText={setVerifyCode}
                keyboardType="number-pad"
                maxLength={6}
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleVerifyEmail}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Verifying...' : 'Verify & Activate Account'}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <TouchableOpacity onPress={handleResendCode} disabled={resending}>
                <Text style={{ color: '#007AFF', fontWeight: '600', fontSize: 14 }}>
                  {resending ? 'Sending...' : "Resend Code"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsVerifying(false)}>
                <Text style={{ color: '#666', fontWeight: '600', fontSize: 14 }}>
                  Change Details
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => router.replace('/login')} 
              style={{ marginTop: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '500' }}>
                Already verified? Go to Login
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
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
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
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
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 4,
  },
  registerButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  registerButtonDisabled: {
    backgroundColor: '#ccc',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  loginButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
