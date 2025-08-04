import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

// Supported languages with codes for the API
const languages = [
  { label: 'English', value: 'en' },
  { label: 'Hebrew', value: 'he' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Russian', value: 'ru' },
  { label: 'Chinese (Simplified)', value: 'zh' },
];

export default function TranslateScreen() {
  const [text, setText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('he');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const translateText = async () => {
    if (!text.trim()) {
      setError('Please enter text to translate');
      return;
    }
    if (sourceLang === targetLang) {
      setError('Please select different languages for translation');
      return;
    }

    setLoading(true);
    setError(null);
    setTranslatedText('');

    try {
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text',
        }),
      });

      if (!response.ok) {
        throw new Error('Translation server error');
      }

      const data = await response.json();
      setTranslatedText(data.translatedText);
    } catch (err) {
      setError('An error occurred while translating. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>🌐 Translator</Text>

        <Text style={styles.label}>Text to translate:</Text>
        <TextInput
          style={[styles.input, { height: 120 }]}
          multiline
          placeholder="Enter text here"
          placeholderTextColor="#a0aec0"
          value={text}
          onChangeText={setText}
        />

        <Text style={styles.label}>Source language:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={sourceLang}
            onValueChange={setSourceLang}
            style={styles.picker}
            dropdownIconColor="#4f46e5"
          >
            {languages.map((lang) => (
              <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Target language:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={targetLang}
            onValueChange={setTargetLang}
            style={styles.picker}
            dropdownIconColor="#4f46e5"
          >
            {languages.map((lang) => (
              <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={translateText}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Translate</Text>
          )}
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {translatedText ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Translated text:</Text>
            <Text style={styles.resultText}>{translatedText}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  contentContainer: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#5a67d8',
    textAlign: 'center',
    marginBottom: 32,
    textShadowColor: 'rgba(90, 103, 216, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  label: {
    fontSize: 18,
    color: '#4c51bf',
    marginBottom: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 17,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#c3cbe3',
    textAlignVertical: 'top',
    shadowColor: '#6b7280',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    color: '#1a202c',
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c3cbe3',
    marginBottom: 24,
    shadowColor: '#6b7280',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#4c51bf',
  },
  button: {
    backgroundColor: '#5a67d8',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#5a67d8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
    transform: [{ translateY: 0 }],
  },
  buttonDisabled: {
    backgroundColor: '#a3bffa',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: 0.8,
  },
  errorText: {
    color: '#e53e3e',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
    fontSize: 16,
  },
  resultBox: {
    backgroundColor: '#e0e7ff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#5a67d8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
    color: '#4c51bf',
  },
  resultText: {
    fontSize: 18,
    color: '#2d3748',
    lineHeight: 26,
  },
});
