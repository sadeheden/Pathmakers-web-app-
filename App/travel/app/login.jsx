import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { post } from './api.js'; // פונקציה לשליחת POST לשרת

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter both email/username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await post('auth/login', { 
        identifier: identifier.trim(),
        password 
      });

      if (!response) {
        Alert.alert('Error', 'Server did not respond. Please try again.');
        setLoading(false);
        return;
      }

      if (response.success && response.token && response.user) {
        // שמירת הטוקן ב־AsyncStorage תחת המפתח 'token'
        await AsyncStorage.setItem('token', response.token);
        // אם תרצי לשמור גם את פרטי המשתמש (אופציונלי)
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));

        Alert.alert('Success', 'Logged in successfully!');
        router.replace('/home'); // נניח שהמסך הבית נקרא home
      } else {
        Alert.alert(
          'Login Failed',
          response.message?.toLowerCase().includes('invalid') || 
          response.message?.toLowerCase().includes('incorrect')
            ? 'Username or password incorrect, please try again.'
            : (response.message || 'An error occurred, please try again.')
        );
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Could not connect to server. Check your internet.');
      console.error(error);
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
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: '#333' },
  subtitle: { fontSize: 16, marginBottom: 32, textAlign: 'center', color: '#666' },
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
  buttonDisabled: { backgroundColor: '#89baff' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
