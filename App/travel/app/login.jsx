import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { post } from './api.js'; // adjust if needed
import Popup from './components/Popup'; // adjust if needed

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setPopup({
        visible: true,
        title: 'Missing Fields',
        message: 'Please enter both email/username and password',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await post('auth/login', {
        identifier: identifier.trim(),
        password,
      });

      if (!response || !response.success || !response.token || !response.user) {
        setPopup({
          visible: true,
          title: 'Login Failed',
          message: response?.message || 'Unknown error',
        });
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));

      setPopup({
        visible: true,
        title: 'Success',
        message: 'Logged in!',
      });

      setTimeout(() => {
        setPopup(prev => ({ ...prev, visible: false }));
        router.replace('/home');
      }, 1200);
    } catch (err) {
      console.error('Login Error:', err);
      setPopup({
        visible: true,
        title: 'Connection Error',
        message: 'Could not connect to server.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.wrapper}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Good to see you</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <TextInput
          placeholder="Email or Username"
          value={identifier}
          onChangeText={setIdentifier}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          editable={!loading}
        />

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <Popup
          visible={popup.visible}
          title={popup.title}
          message={popup.message}
          onClose={() => setPopup(prev => ({ ...prev, visible: false }))}
          onConfirm={() => setPopup(prev => ({ ...prev, visible: false }))}
          showCancel={false}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#222',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#99caff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
