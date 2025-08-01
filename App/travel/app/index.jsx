import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Register from './components/register';

export default function index() {
  const [showLogin, setShowLogin] = useState(true);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <TouchableOpacity onPress={() => setShowLogin(true)} style={[styles.toggleButton, showLogin && styles.activeButton]}>
          <Text style={showLogin ? styles.activeText : styles.inactiveText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowLogin(false)} style={[styles.toggleButton, !showLogin && styles.activeButton]}>
          <Text style={!showLogin ? styles.activeText : styles.inactiveText}>Register</Text>
        </TouchableOpacity>
      </View>
      {showLogin ? (
        <View style={styles.form}>
          <Text style={styles.title}>Login</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={loginEmail}
            onChangeText={setLoginEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry
          />
          <Button title="Login" onPress={() => { router.push('/(tabs)/books') }} />
        </View>
      ) : (
        <Register />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  toggleContainer: { flexDirection: 'row', marginBottom: 20, justifyContent: 'center' },
  toggleButton: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  activeButton: { borderColor: '#007AFF' },
  activeText: { color: '#007AFF', fontWeight: 'bold' },
  inactiveText: { color: '#888' },
  form: { marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 15 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 15 },
  picker: { height: Platform.OS === 'ios' ? 180 : 50, width: '100%' },
});