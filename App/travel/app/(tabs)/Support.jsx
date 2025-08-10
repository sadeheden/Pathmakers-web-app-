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

// ✅ local logo
const logo = require('../../assets/images/logo.png');

const faqs = [
  { question: 'How do I create a new trip?', answer: 'Go to the home screen, tap "Add New Trip", and follow the guided steps.' },
  { question: 'How do I share my trip with family?', answer: 'Inside the trip page, tap "Share" and choose the contacts you want to invite.' },
  { question: 'How do I edit my daily schedule?', answer: 'In the daily schedule view, tap and drag activities to the desired time slot.' },
];

const MAX_LEN = 800;

const SupportScreen = () => {
  const navigation = useNavigation();
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(120);
  const [expandedIdx, setExpandedIdx] = useState(-1);

  // 👇 keyboard management
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
      // ensure last elements (input + button) are visible
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
  const canSend = message.trim().length > 2;

  const handleContactPress = () => {
    if (!canSend) {
      Alert.alert('Oops', 'Please describe your issue before sending.');
      return;
    }
    Alert.alert('Message Sent!', 'Thank you for contacting us. We’ll get back to you as soon as possible.');
    setMessage('');
    inputRef.current?.blur();
  };

  const goHome = () => {
    navigation.navigate('(tabs)', { screen: 'home' });
  };

  const quickChips = ['Login problem', 'Payment issue', 'Trip not saving', 'App is slow'];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f9f9f9' }}
      behavior={Platform.select({ ios: 'padding', android: undefined /* we'll pad manually */ })}
      keyboardVerticalOffset={Platform.select({ ios: 10, android: 0 })}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            // extra bottom padding when keyboard is visible so button + input stay above it
            { paddingBottom: (kbVisible ? kbHeight : 24) + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces={false}
        >
          {/* Header / Logo */}
          <TouchableOpacity onPress={goHome} style={styles.logoTouchable} activeOpacity={0.8}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </TouchableOpacity>

          <Text style={styles.title}>Need Help?</Text>
          <Text style={styles.subtitle}>
            We’re here for you. Check out the FAQs or send us a message.
          </Text>

          {/* FAQs – collapsible */}
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

          {/* Quick chips */}
          <View style={styles.chipsRow}>
            {quickChips.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={styles.chip}
                onPress={() => {
                  setMessage((prev) => (prev ? `${prev} ${c}` : c));
                  // make sure input is visible if user taps a chip with keyboard closed
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

          {/* Message input */}
          <Text style={styles.formTitle}>Describe your issue:</Text>
          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { height: Math.min(200, Math.max(100, inputHeight)) }]}
              multiline
              placeholder="Type your message here..."
              value={message}
              onFocus={() => {
                // ensure caret is visible on focus
                requestAnimationFrame(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                });
              }}
              onChangeText={(t) => {
                if (t.length <= MAX_LEN) setMessage(t);
              }}
              onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height + 16)}
              textAlignVertical="top"
              returnKeyType="default"
              blurOnSubmit={false}
              scrollEnabled={false} // let ScrollView handle vertical space; prevents inner scroll conflicts
            />
 <View style={styles.inputMeta}>
  <Text style={[styles.counter, remaining < 50 && { color: '#D35400' }]}>
    {remaining} left
  </Text>
</View>

          </View>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.contactButton, !canSend && styles.contactButtonDisabled]}
            onPress={handleContactPress}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            <Ionicons name="paper-plane-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.contactButtonText}>{canSend ? 'Send Message' : 'Type a few words…'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 24,
    flexGrow: 1,
    alignItems: 'center',
  },
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
  chipsRow: {
    width: '100%',
    maxWidth: 720,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  chip: { backgroundColor: '#eef4ff', borderColor: '#cfe0ff', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  chipText: { color: '#2459d6', fontWeight: '600', fontSize: 13 },
  formTitle: { fontSize: 16, fontWeight: '600', alignSelf: 'flex-start', marginTop: 16, marginBottom: 8, color: '#333' },
  inputWrap: { width: '100%', maxWidth: 720 },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 6,
    fontSize: 15,
  },
  inputMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 },
  counter: { fontSize: 12, color: '#888' },
  contactButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 720,
  },
  contactButtonDisabled: { backgroundColor: '#a9c6ff' },
  contactButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default SupportScreen;
