// app/intro.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function IntroScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ברוכים הבאים ל־PathMakers</Text>
      <Text style={styles.description}>
        אפליקציה חכמה שמלווה אותך לאורך כל הטיול שלך, עם יומן יומי, מפה אינטראקטיבית, מזג אוויר, ועוד!
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/tabs/login')}>
        <Text style={styles.buttonText}>המשך</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
});
