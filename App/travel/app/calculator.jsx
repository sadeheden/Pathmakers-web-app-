import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';

import { Picker } from '@react-native-picker/picker'; // Correct Picker import

// Example exchange rates per city with local currencies (fictional values)
const exchangeRates = {
  Paris: { Euro: 1, USD: 1.1 },
  London: { GBP: 1, USD: 1.25 },
  "New York": { USD: 1 },
  Tokyo: { Yen: 150, USD: 1 },
  Rome: { Euro: 1, USD: 1.1 },
  "Los Angeles": { USD: 1 },
  Berlin: { Euro: 1, USD: 1.1 },
  Barcelona: { Euro: 1, USD: 1.1 },
  Dubai: { AED: 3.67, USD: 1 },
  Amsterdam: { Euro: 1, USD: 1.1 },
  "San Francisco": { USD: 1 },
  Madrid: { Euro: 1, USD: 1.1 },
  Seoul: { Won: 1350, USD: 1 },
  Holland: { Euro: 1, USD: 1.1 },
};

const cities = Object.keys(exchangeRates);

const CurrencyConverter = () => {
  const [amount, setAmount] = useState('');
  const [selectedCity, setSelectedCity] = useState(cities[0]);
  const [selectedCurrency, setSelectedCurrency] = useState(
    Object.keys(exchangeRates[cities[0]])[0]
  );
  const [converted, setConverted] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

 const handleConvert = () => {
  const numericAmount = parseFloat(amount);
  if (!isNaN(numericAmount) && numericAmount > 0) {
    setIsConverting(true);
    setConverted('');
    setTimeout(() => {
      const rate = exchangeRates[selectedCity][selectedCurrency];
      const result = numericAmount / rate; // Convert *to USD*
      setConverted(result.toFixed(2));
      setIsConverting(false);
      fadeIn();
    }, 800);
  } else {
    setConverted('');
  }
};


const onCityChange = (city) => {
  setSelectedCity(city);
  const firstCurrency = Object.keys(exchangeRates[city])[0];
  setSelectedCurrency(firstCurrency);

  // trigger conversion if amount already entered
  if (amount && !isNaN(parseFloat(amount))) handleConvert();
};


useEffect(() => {
  if (amount && !isNaN(parseFloat(amount))) {
    const timeoutId = setTimeout(() => {
      handleConvert();
    }, 500);
    return () => clearTimeout(timeoutId);
  } else {
    setConverted('');
  }
}, [amount, selectedCity, selectedCurrency]);


  const fadeIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>💱 Currency Converter</Text>

  <Text style={styles.label}>🌍 Select a City</Text>
<View style={styles.pickerWrapper}>
<Picker
  selectedValue={selectedCity}
  onValueChange={onCityChange}
  style={styles.picker}
  itemStyle={styles.pickerItem}
  mode="dropdown"
>


    {cities.map((city) => (
      <Picker.Item key={city} label={city} value={city} />
    ))}
  </Picker>
</View>

<Text style={styles.label}>💱 Select a Currency</Text>
<View style={styles.pickerWrapper}>
  <Picker
    selectedValue={selectedCurrency}
onValueChange={(currency) => {
  setSelectedCurrency(currency);
  if (amount && !isNaN(parseFloat(amount))) handleConvert();
}}

    style={styles.picker}
  >
    {Object.keys(exchangeRates[selectedCity]).map((currency) => (
      <Picker.Item key={currency} label={currency} value={currency} />
    ))}
  </Picker>
</View>


<Text style={styles.label}>💵 Enter Amount in {selectedCurrency}:</Text>
<TextInput
  style={styles.input}
  placeholder="0.00"
  placeholderTextColor="#64748b" // soft dark gray
  keyboardType="numeric"
  value={amount}
  onChangeText={setAmount}
/>



        <TouchableOpacity
          style={[styles.button, (isConverting || !amount) && styles.buttonDisabled]}
          onPress={handleConvert}
          disabled={isConverting || !amount}
        >
          {isConverting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>🔄 Convert</Text>
          )}
        </TouchableOpacity>

        {converted !== '' && !isConverting && (
         <Animated.View style={[styles.resultBox, { opacity: fadeAnim }]}>
  <Text style={styles.resultText}>
    {amount} {selectedCurrency} = ${converted} USD
  </Text>
  <Text style={styles.infoText}>
    Exchange rate in {selectedCity}: 1 USD = {exchangeRates[selectedCity][selectedCurrency]} {selectedCurrency}
  </Text>
</Animated.View>

        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CurrencyConverter;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e3a8a',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#1e40af',
    marginBottom: 8,
  },
  pickerItem: {
  color: '#090e16ff', // Dark readable text
  fontSize: 16,
},

 pickerWrapper: {
  backgroundColor: '#fff',
  borderRadius: 12,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#cbd5e1',
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
},
picker: {
  height: 44,
  width: '100%',
  fontSize: 16,
  color: '#111827',
},
label: {
  fontSize: 16,
  fontWeight: '600',
  color: '#334155',
  marginBottom: 6,
  marginTop: 12,
},

  input: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    fontSize: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: '#dbe9f3ff',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginTop: 8,
    fontSize: 14,
    color: '#1e40af',
  },
});
