import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// לוגו שלך בתיקיית assets/images/
const logo = require('./../assets/images/logo.png');

const faqs = [
  {
    question: 'How do I create a new trip?',
    answer: 'Go to the home screen, tap "Add New Trip", and follow the guided steps.',
  },
  {
    question: 'How do I share my trip with family?',
    answer: 'Inside the trip page, tap "Share" and choose the contacts you want to invite.',
  },
  {
    question: 'How do I edit my daily schedule?',
    answer: 'In the daily schedule view, tap and drag activities to the desired time slot.',
  },
];

const SupportScreen = () => {
  const navigation = useNavigation();
  const [message, setMessage] = useState('');

  const handleContactPress = () => {
    if (message.trim() === '') {
      Alert.alert('Oops', 'Please describe your issue before sending.');
    } else {
      Alert.alert(
        'Message Sent!',
        'Thank you for contacting us. We’ll get back to you as soon as possible.',
      );
      setMessage('');
    }
  };
  const goHome = () => {
   navigation.navigate('(tabs)', { screen: 'home' });
  };
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={goHome} style={styles.logoTouchable}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </TouchableOpacity>

      <Text style={styles.title}>Need Help?</Text>
      <Text style={styles.subtitle}>We’re here for you. Check out the FAQs or send us a message.</Text>

      <View style={styles.faqSection}>
        {faqs.map((faq, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.cardQuestion}>{faq.question}</Text>
            <Text style={styles.cardAnswer}>{faq.answer}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.formTitle}>Describe your issue:</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Type your message here..."
        value={message}
        onChangeText={setMessage}
      />

      <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
        <Ionicons name="paper-plane-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.contactButtonText}>Send Message</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#f9f9f9',
    flexGrow: 1,
    alignItems: 'center',
  },
  logoTouchable: {
    marginTop: 20,
    marginBottom: 15,
  },
  logo: {
    width: 120,
    height: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
  },
  faqSection: {
    width: '100%',
  },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  cardQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#222',
  },
  cardAnswer: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: 20,
    color: '#333',
  },
  input: {
    width: '100%',
    minHeight: 100,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderColor: '#ccc',
    borderWidth: 1,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SupportScreen;
