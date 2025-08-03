import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* לוגו - ודא שהקובץ קיים ב־assets/logo.png */}
     <Image source={require('../../assets/images/logo.png')} style={styles.logo} />

      <Text style={styles.title}>ברוכה הבאה ל־PathMakers</Text>
      <Text style={styles.subtitle}>
        האפליקציה שמלווה אותך לאורך כל הטיול — עם לוח זמנים, מפה, מזג אוויר ועוד!
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/diary')}>
        <Text style={styles.buttonText}>לתחילת היום שלך</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#2865c1ff',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
});
