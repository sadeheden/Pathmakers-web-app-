import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView, Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const logo = require('../assets/images/logo.png');

const popularCurrencies = ['USD','EUR','GBP','JPY','CNY','AUD','CAD','CHF','ILS'];

const CurrencySelector = ({ label, value, onChange, disabledCurrency }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.picker}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {popularCurrencies.map((currency) => {
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
                isDisabled && styles.currencyButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.currencyText,
                  isActive && styles.currencyTextActive,
                  isDisabled && styles.currencyTextDisabled,
                ]}
              >
                {currency}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
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
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Prevent "From" and "To" from ever being the same
const pickAlternative = (avoid) =>
  popularCurrencies.find(c => c !== avoid) || avoid;

const setFromSafe = (cur) => {
  if (cur === toCurrency) setToCurrency(pickAlternative(cur));
  setFromCurrency(cur);
};

const setToSafe = (cur) => {
  if (cur === fromCurrency) setFromCurrency(pickAlternative(cur));
  setToCurrency(cur);
};

// Optional: bulletproof swap
const swapCurrencies = () => {
  if (fromCurrency === toCurrency) {
    setToCurrency(pickAlternative(fromCurrency));
    return;
  }
  const f = fromCurrency, t = toCurrency;
  setFromCurrency(t);
  setToCurrency(f);
};

// Extra guard (covers any other code paths)
useEffect(() => {
  if (fromCurrency === toCurrency) {
    setToCurrency(pickAlternative(fromCurrency));
  }
}, [fromCurrency, toCurrency]);

  const getExchangeRate = async (from, to) => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const mockRates = {
        'USD-EUR': 0.85, 'USD-GBP': 0.73, 'USD-JPY': 110.0, 'USD-CNY': 6.45,
        'USD-AUD': 1.35, 'USD-CAD': 1.25, 'USD-CHF': 0.92, 'USD-ILS': 3.65,
        'EUR-USD': 1.18, 'EUR-GBP': 0.86, 'EUR-JPY': 129.41,
        'GBP-USD': 1.37, 'GBP-EUR': 1.16, 'JPY-USD': 0.0091, 'ILS-USD': 0.274
      };
      const rateKey = `${from}-${to}`;
      const reverseKey = `${to}-${from}`;
      let rate = mockRates[rateKey];
      if (!rate && mockRates[reverseKey]) rate = 1 / mockRates[reverseKey];
      if (!rate) rate = 1.0;
      setExchangeRate(rate);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
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


  const goHome = () => {
    navigation.navigate('(tabs)', { screen: 'home' });
  };
 
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Return (Back) button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color="#1e293b" />
          </TouchableOpacity>

    

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="currency-usd" size={32} color="white" />
            </View>
            <Text style={styles.title}>Currency Converter</Text>
            <View style={styles.subtitleRow}>
              <Feather name="globe" size={16} color="#555" />
              <Text style={styles.subtitle}>Real-time exchange rates</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
              placeholder="Enter amount"
              returnKeyType="done"           // 👈 shows "Return/Done"
              blurOnSubmit={true}
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

                  {exchangeRate && (
                    <View style={styles.exchangeRateRow}>
                      <View style={styles.exchangeRateLeft}>
                        <MaterialCommunityIcons name="trending-up" size={16} color="#555" />
                        <Text style={styles.exchangeRateText}>
                          1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
                        </Text>
                      </View>
                      {lastUpdated && (
                        <View style={styles.exchangeRateRight}>
                          <MaterialCommunityIcons name="clock-outline" size={16} color="#555" />
                          <Text style={styles.exchangeRateText}>{lastUpdated}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              onPress={() => getExchangeRate(fromCurrency, toCurrency)}
              disabled={loading}
              style={[styles.refreshButton, loading && { opacity: 0.5 }]}
            >
              <View style={styles.refreshButtonContent}>
                {loading && <ActivityIndicator size="small" color="white" />}
                <Text style={styles.refreshButtonText}>Refresh Rates</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Extra bottom space so button clears keyboard */}
          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#e0e7ff', justifyContent: 'center' },
  backBtn: {
  position: 'absolute',
  top: 40, // ⬅️ move it lower
  left: 10,
  zIndex: 10,
  backgroundColor: 'rgba(255,255,255,0.9)',
  borderRadius: 20,
  padding: 6,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  },
  logoTouchable: { alignSelf: 'center', marginTop: 20, marginBottom: 10 },
  logo: { width: 150, height: 50 },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  iconCircle: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 40,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  subtitle: { marginLeft: 6, color: '#555' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  label: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
    backgroundColor: 'white',
  },
  picker: { flexDirection: 'row' },
  currencyButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  currencyButtonActive: { backgroundColor: '#4f46e5', borderColor: '#4338ca' },
  currencyText: { color: '#475569', fontWeight: '600' },
  currencyTextActive: { color: 'white' },
  swapButton: {
    backgroundColor: '#4f46e5',
    alignSelf: 'center',
    padding: 12,
    borderRadius: 30,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  resultBox: {
    backgroundColor: '#dcfce7',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  convertedAmount: { fontSize: 28, fontWeight: 'bold', color: '#166534', textAlign: 'center' },
  convertInfo: { fontSize: 16, color: '#4b5563', textAlign: 'center', marginTop: 4 },
  exchangeRateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  exchangeRateLeft: { flexDirection: 'row', alignItems: 'center' },
  exchangeRateRight: { flexDirection: 'row', alignItems: 'center' },
  exchangeRateText: { marginLeft: 6, color: '#4b5563', fontSize: 14 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { marginLeft: 8, color: '#2563eb', fontWeight: '600' },
  errorText: { textAlign: 'center', color: '#dc2626', fontWeight: '600' },
  refreshButton: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 20, marginTop: 20, alignItems: 'center' },
  refreshButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  refreshButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});

export default CurrencyConverter;
