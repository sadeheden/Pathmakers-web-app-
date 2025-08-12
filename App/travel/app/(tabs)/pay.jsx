// (tabs)/pay.jsx
import React, { useMemo, useState, useLayoutEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';

// ====== ID mapping helpers (copied from Home to keep logic identical) ======
const getDepartureCityId = (destinationCity) => {
  const cityMappings = {
    'phuket': '68022f445f7300b11f986829',
    'paris': '68022f445f7300b11f986829',
    'dubai': '68022f445f7300b11f986829',
    'london': '68022f445f7300b11f986829',
    'turkey': '68022f445f7300b11f986829',
    'amsterdam': '68022f445f7300b11f986829',
    'rome': '68022f445f7300b11f986829',
    'barcelona': '68022f445f7300b11f986829',
    'berlin': '68022f445f7300b11f986829',
    'tokyo': '68022f445f7300b11f986829',
    'new york': '68022f445f7300b11f986829',
    'los angeles': '68022f445f7300b11f986829',
    'san francisco': '68022f445f7300b11f986829',
    'madrid': '68022f445f7300b11f986829',
    'seoul': '68022f445f7300b11f986829'
  };
  const citySlug = destinationCity?.slug || destinationCity?.name?.toLowerCase();
  return cityMappings[citySlug] || '68022f445f7300b11f986829';
};

const getDestinationCityId = (destinationCity) => {
  const cityMappings = {
    'phuket': '68022f445f7300b11f986837',
    'paris': '68075dd4f110a359e23cd001',
    'london': '68075dd4f110a359e23cd002',
    'amsterdam': '68075dd4f110a359e23cd003',
    'rome': '68075dd4f110a359e23cd004',
    'barcelona': '68075dd4f110a359e23cd005',
    'berlin': '68075dd4f110a359e23cd006',
    'tokyo': '68075dd4f110a359e23cd007',
    'dubai': '686cd9cd523d724c4a6db66f',
    'new york': '686cdae6523d724c4a6db672',
    'los angeles': '686cdb31523d724c4a6db675',
    'san francisco': '686cdbe3523d724c4a6db676',
    'madrid': '686cdc13523d724c4a6db677',
    'seoul': '686cdc4a523d724c4a6db67a',
    'turkey': '6891f49ef511eb0daf23b8f8'
  };
  const citySlug = destinationCity?.slug || destinationCity?.name?.toLowerCase();
  return cityMappings[citySlug] || '68022f445f7300b11f986837';
};

const getFlightId = (destinationCity) => {
  const flightMappings = {
    'phuket': '68075f88dc218773e0652238',
    'paris': '68075f88dc218773e0652231',
    'london': '68075f88dc218773e0652230',
    'amsterdam': '68075f88dc218773e0652238',
    'rome': '68075f88dc218773e0652233',
    'barcelona': '68075f88dc218773e0652236',
    'berlin': '68075f88dc218773e0652235',
    'tokyo': '68075f88dc218773e0652232',
    'dubai': '68075f88dc218773e0652237',
    'new york': '68075f88dc218773e0652231',
    'los angeles': '68075f88dc218773e0652234',
    'san francisco': '68075f88dc218773e0652239',
    'madrid': '68075f88dc218773e065223a',
    'seoul': '68075f88dc218773e065223b',
    'turkey': '6891f45cf511eb0daf23b8f5'
  };
  const citySlug = destinationCity?.slug || destinationCity?.name?.toLowerCase();
  return flightMappings[citySlug] || '68075f88dc218773e0652238';
};

// ====== Pay Screen ======
export default function PayScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const city = route?.params?.city || null;

  // Hide the native header so we only have our custom header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const price = useMemo(() => parseInt(city?.price) || 0, [city]);

  // form
  const [fullName, setFullName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successPopupVisible, setSuccessPopupVisible] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const formatCard = (text) => {
    const cleaned = text.replace(/\s/g, '').replace(/\D/g, '');
    return (cleaned.match(/.{1,4}/g) || []).join(' ').slice(0, 19);
  };

  // Auto-insert "/" and clamp month to 01..12 → MM/YY
  const formatExpiry = (text) => {
    const d = text.replace(/\D/g, '').slice(0, 4);
    const mm = d.slice(0, 2);
    const yy = d.slice(2, 4);
    let mmClamped = mm;
    if (mm.length === 2) {
      const n = Math.max(1, Math.min(parseInt(mm, 10) || 0, 12));
      mmClamped = String(n).padStart(2, '0');
    }
    return yy ? `${mmClamped}/${yy}` : mmClamped;
  };

  const validate = () => {
    if (!fullName.trim() || fullName.trim().length < 3) return 'Please enter a valid full name (min 3 chars).';
    if (cardNumber.replace(/\s/g, '').length !== 16) return 'Card number must be 16 digits.';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) return 'Expiry must be MM/YY.';
    if (!/^\d{3}$/.test(cvv)) return 'CVV must be 3 digits.';
    return '';
  };

  const SuccessPopup = ({ visible, onClose, onViewOrders, cityName, orderId, price }) => (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        {/* Backdrop tap closes */}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => onClose && onClose()} />
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', alignItems: 'center', elevation: 6 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 8 }}>🎉 Booking Confirmed!</Text>
          <Text style={{ textAlign: 'center', fontSize: 16, marginBottom: 10 }}>
            Your trip to {cityName} is booked!
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Order ID: {orderId || '—'}</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>Total: ${price}</Text>

          <TouchableOpacity
            style={{ backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 10, width: '100%' }}
            onPress={onViewOrders}
          >
            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>View My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, width: '100%' }}
            onPress={() => onClose && onClose()}
          >
            <Text style={{ color: '#374151', fontWeight: '700', textAlign: 'center' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const submitOrder = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setError('');
    setSubmitting(true);

    try {
      // Clean token extraction
      const raw = await AsyncStorage.getItem('token');
      const token = raw?.replace(/^"|"$/g, '') || null;

      console.log('🔑 Token retrieved:', token ? 'Present' : 'Missing');

      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Prepare order data with proper structure
      const orderData = {
        departureCityId: getDepartureCityId(city),
        departureCityName: 'Tel Aviv', // Static departure city name
        destinationCityId: getDestinationCityId(city),
        destinationCityName: city?.name || city?.slug || '',
        flightId: getFlightId(city),
        flightName: city?.flight || `${city?.name} Flight` || '',
        hotelId: getDestinationCityId(city), // Using same ID as destination for hotel
        hotelName: city?.hotel || `${city?.name} Hotel` || '',
        attractions: ['6807610adc218773e065223d'], // Default attraction
        transportation: 'Public Transport',
        paymentMethod: 'PayPal',
        totalPrice: price,
      };

      console.log('📦 Sending order data:', JSON.stringify(orderData, null, 2));

      const response = await fetch('https://pathmakers-web-app-app-travel.onrender.com/api/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      console.log('📡 Response status:', response.status);

      // Try to parse JSON (even for some error responses)
      let payload = null;
      try {
        payload = await response.json();
      } catch (_e) {
        const t = await response.text().catch(() => '');
        console.log('ℹ️ Non-JSON response body:', t);
      }

      if (!response.ok) {
        console.log('❌ Server error response:', payload);
        throw new Error(payload?.message || `Server error: ${response.status}`);
      }

      // Extract a usable order ID regardless of server shape
      const orderId =
        payload?._id ||
        payload?.order?._id ||
        payload?.insertedId ||
        payload?.id ||
        null;

      console.log('✅ Order saved successfully:', payload);

      // Save & show success popup (stay on this screen)
      setLastOrder({ ...payload, _id: orderId });
      setSuccessPopupVisible(true);
      setError('');
    } catch (e) {
      console.error('❌ Order submission error:', e);
      setError(e?.message || 'Something went wrong while booking your trip.');

      Alert.alert(
        '⚠️ Booking Error',
        `Failed to book your trip.\n\nError: ${e?.message || 'Unknown error'}\n\nPlease try again or contact support.`,
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SuccessPopup
        visible={successPopupVisible}
        cityName={city?.name}
        orderId={lastOrder?._id}
        price={price}
        onClose={() => setSuccessPopupVisible(false)}
        onViewOrders={() => {
          setSuccessPopupVisible(false);
          navigation.navigate('Tabs', { screen: 'Profile' });
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={[pstyles.container, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header (custom) */}
          <View style={pstyles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={pstyles.backX}>✕</Text>
            </TouchableOpacity>
            <Text style={pstyles.title}>Complete Your Booking</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Banner */}
          <View style={pstyles.banner}>
            {!!city?.image && <Image source={city.image} style={pstyles.bannerImg} />}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={pstyles.bannerOverlay} />
            <View style={pstyles.bannerText}>
              <Text style={pstyles.bannerTitle}>{city?.name || 'Your Trip'}</Text>
              <Text style={pstyles.bannerSub}>From ${price}</Text>
            </View>
          </View>

          {/* Trip details */}
          <View style={pstyles.card}>
            <Text style={pstyles.cardTitle}>Trip Details</Text>
            <Text style={pstyles.row}><Text style={pstyles.label}>Flight:</Text> ✈️ {city?.flight || '—'}</Text>
            <Text style={pstyles.row}><Text style={pstyles.label}>Dates:</Text> 13/3 – 18/3</Text>
            <Text style={pstyles.row}><Text style={pstyles.label}>Departure:</Text> 06:00 AM</Text>
            <Text style={pstyles.row}><Text style={pstyles.label}>Return:</Text> 05:00 PM</Text>
            <Text style={pstyles.row}><Text style={pstyles.label}>Hotel:</Text> {city?.hotel || '—'}</Text>
            <Text style={pstyles.desc}>{city?.description || ''}</Text>
          </View>

          {/* Total */}
          <Text style={pstyles.total}>Total: <Text style={{ fontWeight: '800' }}>${price}</Text></Text>

          {/* Errors */}
          {!!error && <Text style={pstyles.error}>{error}</Text>}

          {/* Payment form */}
          <View style={pstyles.form}>
            <View style={pstyles.field}>
              <Text style={pstyles.inputLabel}>Full Name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="John Doe"
                autoCapitalize="words"
                style={pstyles.input}
                returnKeyType="done"
              />
            </View>

            <View style={pstyles.field}>
              <Text style={pstyles.inputLabel}>Card Number</Text>
              <TextInput
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCard(t))}
                placeholder="1234 5678 9012 3456"
                keyboardType="number-pad"
                style={pstyles.input}
                maxLength={19}
                returnKeyType="done"
              />
            </View>

            <View style={pstyles.row2}>
              <View style={[pstyles.field, pstyles.col]}>
                <Text style={pstyles.inputLabel}>Expiry (MM/YY)</Text>
                <TextInput
                  value={expiryDate}
                  onChangeText={(t) => setExpiryDate(formatExpiry(t))}
                  placeholder="08/27"
                  style={pstyles.input}
                  keyboardType="number-pad"
                  maxLength={5}
                  returnKeyType="done"
                />
              </View>
              <View style={[pstyles.field, pstyles.col]}>
                <Text style={pstyles.inputLabel}>CVV</Text>
                <TextInput
                  value={cvv}
                  onChangeText={setCvv}
                  placeholder="123"
                  style={pstyles.input}
                  keyboardType="number-pad"
                  maxLength={3}
                  secureTextEntry
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky footer */}
        <View style={pstyles.footer}>
          <TouchableOpacity
            disabled={submitting}
            onPress={submitOrder}
            activeOpacity={0.9}
            style={{ borderRadius: 14, overflow: 'hidden' }}
          >
            <LinearGradient colors={['#007AFF', '#007AFF']} style={pstyles.payBtn}>
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={pstyles.payText}>Pay ${price}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const pstyles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msg: { fontSize: 16, color: '#334155', marginBottom: 10 },
  backBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#eef2ff' },
  backBtnText: { fontWeight: '700', color: '#4f46e5' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 8 },
  backX: { fontSize: 22, color: '#6b7280' },
  title: { fontSize: 18, fontWeight: '800', color: '#1f2937' },

  banner: { borderRadius: 16, overflow: 'hidden', marginVertical: 10 },
  bannerImg: { width: '100%', height: 170, resizeMode: 'cover' },
  bannerOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  bannerText: { position: 'absolute', left: 12, bottom: 10 },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bannerSub: { fontSize: 14, fontWeight: '600', color: '#fff' },

  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, marginTop: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  row: { fontSize: 14, color: '#111827', marginBottom: 4 },
  label: { color: '#6b7280', fontWeight: '700' },
  desc: { marginTop: 0, fontSize: 14, color: '#334155' },

  total: { fontSize: 16, marginTop: 14, color: '#111827' },
  error: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    textAlign: 'center',
  },

  form: { marginTop: 10 },
  field: { marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#0f172a',
  },
  row2: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  payBtn: { paddingVertical: 14, alignItems: 'center' },
  payText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
