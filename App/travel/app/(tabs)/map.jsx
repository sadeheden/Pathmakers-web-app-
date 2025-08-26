import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { post } from '../../utils/api'; // 👈 Using your API service

const PAGE_LIMIT = 30;

/* =====================
   Helpers (stable)
   ===================== */
const fmtDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

const stars = (n) => {
  if (n == null || isNaN(n)) return 'N/A';
  const five = n > 5 ? Math.min(5, Math.round((n / 10) * 5)) : Math.round(n);
  return '★'.repeat(five) + '☆'.repeat(5 - five);
};

// deterministic pseudo-random per id (fallback for missing availability)
const hashCode = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
};

const rngFrom = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0; // LCG
    return s / 4294967296;
  };
};

const makeAvailability = (id) => {
  // 2–3 time slots, deterministic per attraction id
  const rng = rngFrom(hashCode(String(id)));
  const base = [
    '09:00–10:30',
    '11:00–12:30',
    '13:00–14:30',
    '15:00–16:30',
    '17:00–18:30',
  ];
  const count = 2 + Math.floor(rng() * 2); // 2 or 3
  const pool = [...base].sort(() => rng() - 0.5);
  return pool.slice(0, count);
};

/* =====================
   Payment Modal Component
   ===================== */
const PaymentModal = ({ visible, item, onClose, onConfirm, loading }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const handlePayment = () => {
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    onConfirm({
      cardNumber,
      expiryDate,
      cvv,
      cardholderName,
      amount: item?.price || 0
    });
  };

  const resetForm = () => {
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment for {item.name}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Amount to pay:</Text>
            <Text style={styles.priceAmount}>${item.price}</Text>
          </View>

          <View style={styles.paymentForm}>
            <Text style={styles.inputLabel}>Cardholder Name</Text>
            <TextInput
              style={styles.input}
              value={cardholderName}
              onChangeText={setCardholderName}
              placeholder="John Doe"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Card Number</Text>
            <TextInput
              style={styles.input}
              value={cardNumber}
              onChangeText={(text) => {
                const formatted = text.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                setCardNumber(formatted);
              }}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={19}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  value={expiryDate}
                  onChangeText={(text) => {
                    const formatted = text.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
                    setExpiryDate(formatted);
                  }}
                  placeholder="MM/YY"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={setCvv}
                  placeholder="123"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payButton, loading && styles.payButtonDisabled]}
              onPress={handlePayment}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={18} color="#fff" />
                  <Text style={styles.payButtonText}>Pay ${item.price}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* =====================
   Main Component
   ===================== */
export default function AttractionsScreen() {
  const [searchCity, setSearchCity] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [items, setItems] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [paymentModal, setPaymentModal] = useState({ visible: false, item: null });
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchAbortRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentCity('');
          setLoadingLoc(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        try {
          const [g] = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          const cityName = g?.city || g?.subregion || '';
          setCurrentCity(cityName);
        } catch (geoError) {
          setCurrentCity('');
        }
      } catch (e) {
        setCurrentCity('');
      } finally {
        setLoadingLoc(false);
      }
    })();
  }, []);

  const fetchAttractionsByCity = useCallback(async (cityName) => {
    if (!cityName?.trim()) {
      setErrorText('Please enter a city name to search');
      return;
    }

    setLoadingList(true);
    setErrorText('');

    try {
      const searchData = { city: cityName.trim(), limit: PAGE_LIMIT };
      const response = await post('attractions/search-by-city', searchData);

      if (!response.success) {
        throw new Error(response.message || 'Search failed');
      }

      const list = (response.items || []).map((attr, idx) => ({
        id: attr._id || `attraction_${idx}`,
        name: attr.name || 'Unknown place',
        city: attr.city || cityName,
        address: attr.address || '',
        openingHours: attr.openingHours || null,
        price: typeof attr.price === 'number' ? attr.price : null,
        category: attr.category || 'attraction',
        rating: attr.rating ?? null,
        bookable: attr.bookable ?? true,
        availability: Array.isArray(attr.availability) && attr.availability.length > 0
          ? attr.availability
          : makeAvailability(attr._id || idx),
        description: attr.description || null,
      }));

      setItems(list);
    } catch (e) {
      setErrorText(e.message || 'Failed to load attractions from your database.');
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const onPressTicket = async (item) => {
    if (!item.bookable) {
      Alert.alert('Not available', 'This attraction is not bookable with us (yet).');
      return;
    }

    if (item.price === 0) {
      await handleFreeBooking(item);
    } else {
      setPaymentModal({ visible: true, item });
    }
  };

  const handleFreeBooking = async (item) => {
    try {
      const bookingData = { slot: item.availability?.[0] ?? null, paymentType: 'free' };
      const response = await post(`attractions/${item.id}/book`, bookingData);
      if (!response.success) throw new Error(response.message || 'Booking failed');
      Alert.alert('Booked Successfully! 🎉', `Your booking for ${item.name} is confirmed (free!)`);
    } catch (e) {
      Alert.alert('Booking Error', e.message || 'Cannot complete booking.');
    }
  };

  const handlePaymentConfirm = async (paymentData) => {
    setPaymentLoading(true);
    try {
      const bookingData = {
        slot: paymentModal.item.availability?.[0] ?? null,
        paymentType: 'paid',
        paymentDetails: {
          cardNumber: paymentData.cardNumber.replace(/\s/g, ''),
          expiryDate: paymentData.expiryDate,
          cvv: paymentData.cvv,
          cardholderName: paymentData.cardholderName,
          amount: paymentData.amount
        }
      };
      const response = await post(`attractions/${paymentModal.item.id}/book`, bookingData);
      if (!response.success) throw new Error(response.message || 'Payment failed');
      Alert.alert('Payment Successful! 🎉', `Your payment of $${paymentData.amount} for ${paymentModal.item.name} is confirmed!`);
      setPaymentModal({ visible: false, item: null });
    } catch (e) {
      Alert.alert('Payment Error', e.message || 'Cannot complete payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchCity.trim()) fetchAttractionsByCity(searchCity);
  };

  const Header = useMemo(() => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>🔍 Search Attractions by City</Text>
      {currentCity ? <Text style={styles.headerSubtitle}>Current location: {currentCity}</Text> : null}
    </View>
  ), [currentCity]);

  const SearchControls = useMemo(() => (
    <View style={styles.controls}>
      <Text style={styles.ctrlLabel}>Search City</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchCity}
          onChangeText={setSearchCity}
          placeholder="Enter city name (e.g., Amsterdam, Paris, New York)"
          placeholderTextColor="#999"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={[styles.searchBtn, loadingList && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={loadingList || !searchCity.trim()}
        >
          <Ionicons name={loadingList ? 'hourglass-outline' : 'search'} size={18} color="#fff" />
          <Text style={styles.searchText}>{loadingList ? 'Searching...' : 'Search'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.quickLabel}>Quick search:</Text>
        {['Amsterdam', 'Paris', 'London', 'New York'].map((city) => (
          <TouchableOpacity
            key={city}
            style={[styles.quickChip, styles.ml8]}
            onPress={() => {
              setSearchCity(city);
              fetchAttractionsByCity(city);
            }}
          >
            <Text style={styles.quickChipText}>{city}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {items.length > 0 && (
        <Text style={styles.resultsCount}>Found {items.length} attractions in {searchCity}</Text>
      )}
    </View>
  ), [searchCity, loadingList, fetchAttractionsByCity, items.length]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={{ flex: 1, paddingRight: 50 }}>
          <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
          {!!item.address && <Text style={styles.placeAddress} numberOfLines={1}>{item.address}</Text>}
          {!!item.city && <Text style={styles.placeCity} numberOfLines={1}>{item.city}</Text>}
          {!!item.description && <Text style={styles.placeDescription} numberOfLines={2}>{item.description}</Text>}

          <View style={styles.metaRow}>
            {item.rating && <View style={styles.metaPill}><Ionicons name="star" size={14} /><Text style={styles.metaText}>{stars(item.rating)}</Text></View>}
            {item.category && <View style={[styles.metaPill, styles.ml8]}><Ionicons name="pricetag-outline" size={14} /><Text style={styles.metaText}>{item.category}</Text></View>}
            {item.openingHours && <View style={[styles.metaPill, styles.ml8]}><Ionicons name="time-outline" size={14} /><Text style={styles.metaText}>Open</Text></View>}
          </View>

          {Array.isArray(item.availability) && item.availability.length > 0 && (
            <View style={[styles.metaRow, { marginTop: 6 }]}>
              {item.availability.slice(0, 3).map((slot, idx) => (
                <View key={slot + idx} style={[styles.timePill, idx > 0 && styles.ml8]}>
                  <Ionicons name="time-outline" size={12} />
                  <Text style={styles.timeText}>{slot}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.ticketBtn, !item.bookable && styles.ticketBtnDisabled]}
          onPress={() => onPressTicket(item)}
          disabled={!item.bookable}
          accessibilityLabel={item.bookable ? 'Book tickets' : 'Not bookable'}
        >
          <Ionicons name="ticket-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {item.bookable ? (
        <View style={styles.bookRow}>
          <Ionicons name="checkmark-circle-outline" size={14} />
          <Text style={styles.bookText}>
            {item.price === 0 ? 'Free - Bookable' : item.price != null ? `From $${item.price}` : 'Available to book'}
          </Text>
        </View>
      ) : (
        <View style={styles.unavailableRow}>
          <Ionicons name="close-circle-outline" size={14} />
          <Text style={styles.unavailableText}>Not available to book</Text>
        </View>
      )}
    </View>
  );

  if (loadingLoc) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Detecting your location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Header}
      {SearchControls}

      {loadingList ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 8 }}>Searching attractions for {searchCity}…</Text>
        </View>
      ) : items.length === 0 && !errorText ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.errorTitle}>Search for Attractions</Text>
          <Text style={styles.errorText}>Enter a city name above to find attractions</Text>
        </View>
      ) : items.length === 0 && errorText ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Ionicons name="database-outline" size={48} color="#ccc" />
          <Text style={styles.errorTitle}>No Attractions Found</Text>
          <Text style={styles.errorText}>{errorText}</Text>
          <Text style={styles.errorHint}>Try searching for a different city or add attractions to your database.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        />
      )}

      <PaymentModal
        visible={paymentModal.visible}
        item={paymentModal.item}
        onClose={() => setPaymentModal({ visible: false, item: null })}
        onConfirm={handlePaymentConfirm}
        loading={paymentLoading}
      />
    </View>
  );
}
/* =====================
   Styles
   ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingTop: 90,
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flexDirection: 'row', alignItems: 'center' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  controls: { paddingHorizontal: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ml8: { marginLeft: 8 },
  ctrlLabel: { fontWeight: '600', marginBottom: 6 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  searchBtn: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a66c2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchBtnDisabled: { backgroundColor: '#9aa0a6' },
  searchText: { color: '#fff', marginLeft: 6, fontWeight: '600' },
  quickLabel: { fontSize: 12, color: '#666', marginRight: 4 },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  quickChipText: { fontSize: 11, fontWeight: '600', color: '#0a66c2' },
  resultsCount: {
    fontSize: 12,
    color: '#2ea44f',
    marginTop: 8,
    fontWeight: '600',
  },
  card: {
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardMain: { flexDirection: 'row', alignItems: 'flex-start' },
  placeName: { fontSize: 16, fontWeight: '700' },
  placeAddress: { fontSize: 13, color: '#666', marginTop: 2 },
  placeCity: { fontSize: 12, color: '#888', marginTop: 1, fontStyle: 'italic' },
  placeDescription: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
    lineHeight: 16,
  },
  metaRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f7f8',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  metaText: { fontSize: 11, color: '#333', marginLeft: 4 },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#0a66c2',
    marginLeft: 4,
    fontWeight: '600',
  },
  ticketBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#2ea44f',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ticketBtnDisabled: { backgroundColor: '#9aa0a6' },
  bookRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  bookText: { fontSize: 13, color: '#1b5e20', fontWeight: '600', marginLeft: 6 },
  unavailableRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  unavailableText: { fontSize: 13, color: '#9a0007', fontWeight: '600', marginLeft: 6 },
  errorTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 4 },
  errorHint: { fontSize: 12, color: '#999', textAlign: 'center', fontStyle: 'italic' },
  
  // Payment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  priceSection: {
    backgroundColor: '#f0f8f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2ea44f',
  },
  paymentForm: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
    marginRight: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  payButton: {
    flex: 1,
    backgroundColor: '#2ea44f',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#9aa0a6',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
});