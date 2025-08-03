import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { post } from './api.js';

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

 const handleLogin = async () => {
  if (!identifier.trim() || !password.trim()) {
    Alert.alert('Missing Fields', 'Please enter both email/username and password');
    return;
  }

  setLoading(true);

  const payload = {
    identifier: identifier.trim(),
    password: password.trim(),
  };

  console.log('Attempting login with:', payload);

  try {
    const response = await post('auth/login', payload);

    console.log('Login response:', response);

    if (response.success && response.token) {
      Alert.alert('Success', 'Login successful!');
      // Save token to AsyncStorage if needed
      // await AsyncStorage.setItem('userToken', response.token);
      // await AsyncStorage.setItem('userData', JSON.stringify(response.user));

      router.replace('/(tabs)/home');
    } else {
      Alert.alert('Login Failed', response.message || 'Invalid credentials');
    }
  } catch (error) {
    console.error('Login error:', error);
    Alert.alert('Connection Error', error.message || 'Could not connect to the server.');
  } finally {
    setLoading(false);
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
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
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

    <TouchableOpacity style={styles.linkButton} disabled={loading}>
      <Text style={styles.linkText}>
        Don't have an account? Sign up on web.
      </Text>
    </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    color: '#666',
  },
  input: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#89baff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#5392d6ff',
    fontSize: 16,
  },
});