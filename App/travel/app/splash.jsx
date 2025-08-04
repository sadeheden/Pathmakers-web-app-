import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function IntroScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/intro'); // Adjust this route if needed (should probably be /login or /auth-check)
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleTap = () => {
    router.replace('/intro'); // Same as timeout target
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleTap} activeOpacity={1}>
      <Image source={require('../assets/images/logo.png')} style={styles.logo} />
      <Text style={styles.title}>Welcome to PathMakers</Text>
      <Text style={styles.subtitle}>Your journey starts here</Text>

      <View style={styles.tapHintContainer}>
        <Text style={styles.tapHint}>Tap to continue</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    marginTop: 10,
  },
  tapHintContainer: {
    position: 'absolute',
    bottom: 40,
  },
  tapHint: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
  },
});
