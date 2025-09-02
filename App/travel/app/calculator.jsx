import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
const popularCurrencies = ['USD','EUR','GBP','JPY','CNY','AUD','CAD','CHF','ILS'];

const CurrencySelector = ({ label, value, onChange, disabledCurrency }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={styles.label}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {popularCurrencies.map(currency => {
        const isActive = currency === value;
        const isDisabled = currency === disabledCurrency;
        return (
          <TouchableOpacity
            key={currency}
            onPress={() => !isDisabled && onChange(currency)}
            disabled={isDisabled}
            style={[
              styles.currencyButton,
              isActive && styles.currencyButtonActive,
              isDisabled && styles.currencyButtonDisabled
            ]}
          >
            <Text style={[styles.currencyText, isActive && styles.currencyTextActive, isDisabled && styles.currencyTextDisabled]}>
              {currency}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const CurrencyConverter = () => {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [convertedAmount, setConvertedAmount] = useState('0.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pickAlternative = (avoid) => popularCurrencies.find(c => c !== avoid) || avoid;

  const setFromSafe = (cur) => {
    if (cur === toCurrency) setToCurrency(pickAlternative(cur));
    setFromCurrency(cur);
  };

  const setToSafe = (cur) => {
    if (cur === fromCurrency) setFromCurrency(pickAlternative(cur));
    setToCurrency(cur);
  };

  const swapCurrencies = () => {
    if (fromCurrency === toCurrency) setToCurrency(pickAlternative(fromCurrency));
    const f = fromCurrency, t = toCurrency;
    setFromCurrency(t);
    setToCurrency(f);
  };

 const getExchangeRate = async (from, to) => {
  setLoading(true);
  setError(null);
  try {
    const url = `https://api.frankfurter.app/latest?amount=1&from=${from}&to=${to}`;
    console.log('Fetching:', url);
    const response = await fetch(url);
    const data = await response.json();
    console.log('Exchange API response:', data);
    
    if (!data.rates || !data.rates[to]) throw new Error('No rate in response');
    setExchangeRate(data.rates[to]);
  } catch (err) {
    console.log('Exchange rate error:', err);
    setError('Failed to fetch exchange rate');
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    getExchangeRate(fromCurrency, toCurrency);
  }, [fromCurrency, toCurrency]);

  useEffect(() => {
    if (exchangeRate && amount) {
      setConvertedAmount((parseFloat(amount) * exchangeRate).toFixed(2));
    }
  }, [amount, exchangeRate]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() =>  navigation.navigate('(tabs)', { screen: 'home' })} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="white" />
            
          </TouchableOpacity>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="currency-usd" size={32} color="white" />
            </View>
            <Text style={styles.title}>Currency Converter</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
              placeholder="Enter amount"
            />

            <CurrencySelector label="From" value={fromCurrency} onChange={setFromSafe} />
            <TouchableOpacity onPress={swapCurrencies} style={styles.swapButton}>
              <FontAwesome5 name="exchange-alt" size={20} color="white" />
            </TouchableOpacity>
            <CurrencySelector label="To" value={toCurrency} onChange={setToSafe} />

            <View style={styles.resultBox}>
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text style={styles.loadingText}>Converting...</Text>
                </View>
              ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : (
                <>
                  <Text style={styles.convertedAmount}>{convertedAmount} {toCurrency}</Text>
                  <Text style={styles.convertInfo}>{amount} {fromCurrency} =</Text>
                </>
              )}
            </View>

            <TouchableOpacity onPress={() => getExchangeRate(fromCurrency, toCurrency)} disabled={loading} style={[styles.refreshButton, loading && { opacity: 0.5 }]}>
              <Text style={styles.refreshButtonText}>Refresh Rates</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f7f7f7ff', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  iconCircle: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 40, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: 'flex-start'
  },
  backButtonText: { color: 'white', marginLeft: 8, fontWeight: '600', fontSize: 16 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  label: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 20 },
  currencyButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.7)', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  currencyButtonActive: { backgroundColor: '#4f46e5', borderColor: '#4338ca' },
  currencyText: { color: '#475569', fontWeight: '600' },
  currencyTextActive: { color: 'white' },
  swapButton: { backgroundColor: '#4f46e5', alignSelf: 'center', padding: 12, borderRadius: 30, marginVertical: 16 },
  resultBox: { backgroundColor: '#dcfce7', borderRadius: 16, padding: 20, marginTop: 10, borderWidth: 1, borderColor: '#bbf7d0' },
  convertedAmount: { fontSize: 28, fontWeight: 'bold', color: '#166534', textAlign: 'center' },
  convertInfo: { fontSize: 16, color: '#4b5563', textAlign: 'center', marginTop: 4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { marginLeft: 8, color: '#2563eb', fontWeight: '600' },
  errorText: { textAlign: 'center', color: '#dc2626', fontWeight: '600' },
  refreshButton: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 20, marginTop: 20, alignItems: 'center' },
  refreshButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});

export default CurrencyConverter;
