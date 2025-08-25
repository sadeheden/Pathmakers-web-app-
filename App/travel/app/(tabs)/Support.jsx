import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { post } from '../../utils/api'; // 👈 הפונקציה שלך

const logo = require('../../assets/images/logo.png');
const MAX_LEN = 800;

const faqs = [
  {
    question: 'How do I create a new trip?',
    answer:
      'There are two options: (1) On the website, you can create a custom trip by following the guided planning steps. (2) In the app, go to the home screen to explore pre-built trips, then select one to view full details and start your journey.',
  },
  {
    question: 'What is the travel journal for?',
    answer:
      'The travel journal lets you document your trip day-by-day. You can add notes, upload photos, and track your memories, creating a personal diary you can revisit anytime.',
  },
  {
    question: 'How does the AI travel assistant work?',
    answer:
      'Our AI travel assistant can help you build your itinerary, suggest activities based on your preferences, and adjust plans in real time based on weather or location changes.',
  },
];

const SupportScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(120);
  const [expandedIdx, setExpandedIdx] = useState(-1);
  const [isLoading, setIsLoading] = useState(false); // 👈 הוספתי loading state
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [kbHeight, setKbHeight] = useState(0);
  const [kbVisible, setKbVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      setKbVisible(true);
      setKbHeight(e.endCoordinates?.height ?? 0);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    };
    const onHide = () => {
      setKbVisible(false);
      setKbHeight(0);
    };

    const s = Keyboard.addListener(showEvent, onShow);
    const h = Keyboard.addListener(hideEvent, onHide);
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  const remaining = useMemo(() => Math.max(0, MAX_LEN - message.length), [message]);
  const canSend = message.trim().length > 2 && email.trim().length > 3 && name.trim().length > 1 && !isLoading;

  const handleContactPress = async () => {
    if (!canSend) {
      Alert.alert('Oops', 'Please fill in all fields before sending.');
      return;
    }

    setIsLoading(true); // 👈 התחל loading

    try {
      console.log('📤 Sending support message:', { name, email, message: message.substring(0, 50) + '...' });
      
      const response = await post('support', { 
        name: name.trim(),
        email: email.trim(), 
        message: message.trim()
      });

      console.log('✅ Support response:', response);
      
      Alert.alert(
        '✅ Message Sent!', 
        'Thank you for contacting us. We\'ll get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => {
              setName('');
              setEmail('');
              setMessage('');
              inputRef.current?.blur();
            }
          }
        ]
      );
      
    } catch (err) {
      console.error('❌ Failed to send support message:', err);
      
      // 👈 שיפור הודעות השגיאה
      let errorMessage = 'Failed to send your message. Please try again.';
      
      if (err.response?.status === 400) {
        errorMessage = 'Please check that all fields are filled correctly.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Alert.alert('❌ Failed to Send', errorMessage);
    } finally {
      setIsLoading(false); // 👈 סיים loading
    }
  };

  const goHome = () => {
    navigation.navigate('(tabs)', { screen: 'home' });
  };

  const quickChips = [
    'Login problem',
    'Payment issue',
    'Trip not saving',
    'App is slow',
    'AI suggestions not working',
    'Journal not updating',
    'Error during booking',
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f9f9f9' }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 10, android: 0 })}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: (kbVisible ? kbHeight : 24) + 16 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces={false}
        >
          <TouchableOpacity onPress={goHome} style={styles.logoTouchable} activeOpacity={0.8}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </TouchableOpacity>

          <Text style={styles.title}>Need Help?</Text>
          <Text style={styles.subtitle}>
            We're here for you. Check out the FAQs or send us a message.
          </Text>

          {/* FAQs */}
          <View style={styles.section}>
            {faqs.map((faq, idx) => {
              const open = expandedIdx === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => setExpandedIdx(open ? -1 : idx)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardQuestion}>{faq.question}</Text>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />
                  </View>
                  {open && <Text style={styles.cardAnswer}>{faq.answer}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick Chips */}
          <View style={styles.chipsRow}>
            {quickChips.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={styles.chip}
                onPress={() => {
                  setMessage((prev) => (prev ? `${prev} ${c}` : c));
                  requestAnimationFrame(() => {
                    inputRef.current?.focus();
                    scrollRef.current?.scrollToEnd({ animated: true });
                  });
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.chipText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <Text style={styles.formTitle}>Your Name:</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter your name" 
            value={name} 
            onChangeText={setName}
            editable={!isLoading} // 👈 disable בזמן loading
          />

          <Text style={styles.formTitle}>Your Email:</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading} // 👈 disable בזמן loading
          />

          <Text style={styles.formTitle}>Describe your issue:</Text>
          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { height: Math.min(200, Math.max(100, inputHeight)) }]}
              multiline
              placeholder="Type your message here..."
              value={message}
              onFocus={() => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))}
              onChangeText={(t) => {
                if (t.length <= MAX_LEN) setMessage(t);
              }}
              onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height + 16)}
              textAlignVertical="top"
              returnKeyType="default"
              blurOnSubmit={false}
              scrollEnabled={false}
              editable={!isLoading} // 👈 disable בזמן loading
            />
            <View style={styles.inputMeta}>
              <Text style={[styles.counter, remaining < 50 && { color: '#D35400' }]}>{remaining} left</Text>
            </View>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.contactButton, 
              !canSend && styles.contactButtonDisabled,
              isLoading && styles.contactButtonLoading // 👈 loading style
            ]}
            onPress={handleContactPress}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            <Ionicons 
              name={isLoading ? "hourglass-outline" : "paper-plane-outline"} 
              size={20} 
              color="#fff" 
              style={{ marginRight: 8 }} 
            />
            <Text style={styles.contactButtonText}>
              {isLoading ? 'Sending...' : canSend ? 'Send Message' : 'Fill all fields…'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 24, flexGrow: 1, alignItems: 'center' },
  logoTouchable: { marginTop: 4, marginBottom: 12 },
  logo: { width: 120, height: 50 },
  title: { fontSize: 26, fontWeight: '700', color: '#333', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 18, textAlign: 'center' },
  section: { width: '100%', maxWidth: 720 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardQuestion: { fontSize: 16, fontWeight: '600', color: '#222', paddingRight: 8 },
  cardAnswer: { fontSize: 15, color: '#555', lineHeight: 22, marginTop: 10 },
  chipsRow: { width: '100%', maxWidth: 720, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 6 },
  chip: { backgroundColor: '#eef4ff', borderColor: '#cfe0ff', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  chipText: { color: '#2459d6', fontWeight: '600', fontSize: 13 },
  formTitle: { fontSize: 16, fontWeight: '600', alignSelf: 'flex-start', marginTop: 16, marginBottom: 8, color: '#333' },
  inputWrap: { width: '100%', maxWidth: 720 },
  input: { width: '100%', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderColor: '#ddd', borderWidth: 1, marginBottom: 6, fontSize: 15 },
  inputMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 },
  counter: { fontSize: 12, color: '#888' },
  contactButton: { flexDirection: 'row', backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 720 },
  contactButtonDisabled: { backgroundColor: '#a9c6ff' },
  contactButtonLoading: { backgroundColor: '#5599ff' }, // 👈 loading color
  contactButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default SupportScreen;