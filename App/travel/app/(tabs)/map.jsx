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
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { post } from '../../utils/api'; // 👈 Using your API service

const PAGE_LIMIT = 30;

/* ===================== Helpers (stable) ===================== */
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

/* ===================== Component ===================== */
export default function AttractionsScreen() {
  const [searchCity, setSearchCity] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [loadingLoc, setLoadingLoc] = useState(true);

  const [loadingList, setLoadingList] = useState(false);
  const [items, setItems] = useState([]);
  const [errorText, setErrorText] = useState('');

  const fetchAbortRef = useRef(null);

  // Get user's current city on component mount
  useEffect(() => {
    (async () => {
      try {
        console.log('📍 Requesting location permission...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('⚠️ Location permission denied, will search by city name only');
          setCurrentCity('');
          setLoadingLoc(false);
          return;
        }

        console.log('📍 Getting current position...');
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

        // Reverse geocode to get city name
        try {
          console.log('🌍 Reverse geocoding...');
          const [g] = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          const cityName = g?.city || g?.subregion || '';
          console.log('🏙️ Current city detected:', cityName);
          setCurrentCity(cityName);
          setSearchCity(cityName); // Pre-fill search with current city
        } catch (geoError) {
          console.warn('⚠️ Reverse geocoding failed:', geoError);
          setCurrentCity('');
        }
      } catch (e) {
        console.error('❌ Location error:', e);
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

    console.log('🔍 Starting city-based attractions search for:', cityName);
    setLoadingList(true);
    setErrorText('');

    try {
      const searchData = {
        city: cityName.trim(),
        limit: PAGE_LIMIT,
      };

      console.log('📤 Search request data:', searchData);

      // 👈 Using your API service with proper authentication
      const response = await post('orders/search-by-city', searchData);

      console.log('📥 API Response:', JSON.stringify(response, null, 2));

      if (!response.success) {
        throw new Error(response.message || 'Search failed');
      }

      // >>> Here is the main fix: Better processing with debug logs
    const list = (response.items || []).flatMap(cityDoc => {
  if (cityDoc.attractions && Array.isArray(cityDoc.attractions)) {
    // עיר עם מערך אטרקציות
    return cityDoc.attractions.map((attr, idx) => ({
      id: `${cityDoc._id}_${idx}`,
      name: attr.name || 'Unknown place',
      city: cityDoc.city || '',
      address: attr.address || '',
      openingHours: attr.openingHours || null,
      price: attr.price && typeof attr.price === 'object'
        ? parseInt(attr.price.$numberInt || attr.price.$numberDouble || attr.price, 10)
        : (typeof attr.price === 'number' ? attr.price : null),
      category: 'attraction',
      rating: attr.rating ?? null,
      bookable: attr.bookable ?? true,
      availability: Array.isArray(attr.availability) && attr.availability.length > 0
        ? attr.availability
        : makeAvailability(`${cityDoc._id}_${idx}`),
      description: attr.description || null
    }));
  } else {
    // אטרקציה בודדת (או עיר בלי מערך אטרקציות)
    return [{
      id: cityDoc._id || cityDoc.id || `attraction_${Math.random()}`,
      name: cityDoc.name || 'Unknown place',
      city: cityDoc.city || '',
      address: cityDoc.address || '',
      openingHours: cityDoc.openingHours || null,
      price: cityDoc.price && typeof cityDoc.price === 'object'
        ? parseInt(cityDoc.price.$numberInt || cityDoc.price.$numberDouble || cityDoc.price, 10)
        : (typeof cityDoc.price === 'number' ? cityDoc.price : null),
      category: cityDoc.category || 'attraction',
      rating: cityDoc.rating ?? null,
      bookable: cityDoc.bookable ?? true,
      availability: Array.isArray(cityDoc.availability) && cityDoc.availability.length > 0
        ? cityDoc.availability
        : makeAvailability(cityDoc._id || cityDoc.id),
      description: cityDoc.description || null
    }];
  }
});

      console.log(`✅ Processed ${list.length} attractions from MongoDB for city: ${cityName}`);
      console.log('🏛️ Final attractions list:', list);
      setItems(list);
    } catch (e) {
      console.error('❌ Failed to fetch attractions:', e);
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

    try {
      console.log('🎫 Booking attraction:', item.name);

      const bookingData = {
        slot: item.availability?.[0] ?? null,
      };

      // 👈 Using your API service
      const response = await post(`orders/${item.id}/book`, bookingData);

      if (!response.success) {
        throw new Error(response.message || 'Booking failed');
      }

      Alert.alert('Booked! 🎉', `Your booking for ${item.name} is confirmed.`);
    } catch (e) {
      console.error('❌ Booking error:', e);
      Alert.alert('Booking failed', e.message || 'Unable to complete booking.');
    }
  };

  const handleSearch = () => {
    if (searchCity.trim()) {
      fetchAttractionsByCity(searchCity);
    }
  };

  const Header = useMemo(
    () => (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 Search Attractions by City</Text>
        {currentCity && <Text style={styles.headerSubtitle}>Current location: {currentCity}</Text>}
      </View>
    ),
    [currentCity]
  );

  const SearchControls = useMemo(
    () => (
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

        {/* Quick city buttons */}
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
    ),
    [searchCity, loadingList, handleSearch, fetchAttractionsByCity, items.length]
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={{ flex: 1, paddingRight: 50 }}>
          <Text style={styles.placeName} numberOfLines={1}>
            {item.name}
          </Text>
          {!!item.address && (
            <Text style={styles.placeAddress} numberOfLines={1}>
              {item.address}
            </Text>
          )}
          {!!item.city && (
            <Text style={styles.placeCity} numberOfLines={1}>
              {item.city}
            </Text>
          )}

          {!!item.description && (
            <Text style={styles.placeDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.metaRow}>
            {item.rating && (
              <View style={styles.metaPill}>
                <Ionicons name="star" size={14} />
                <Text style={styles.metaText}>{stars(item.rating)}</Text>
              </View>
            )}

            {item.category && (
              <View style={[styles.metaPill, styles.ml8]}>
                <Ionicons name="pricetag-outline" size={14} />
                <Text style={styles.metaText}>{item.category}</Text>
              </View>
            )}

            {item.openingHours && (
              <View style={[styles.metaPill, styles.ml8]}>
                <Ionicons name="time-outline" size={14} />
                <Text style={styles.metaText}>Open</Text>
              </View>
            )}
          </View>

          {/* Availability chips */}
          {Array.isArray(item.availability) && item.availability.length > 0 ? (
            <View style={[styles.metaRow, { marginTop: 6 }]}>
              {item.availability.slice(0, 3).map((slot, idx) => (
                <View key={slot + idx} style={[styles.timePill, idx > 0 && styles.ml8]}>
                  <Ionicons name="time-outline" size={12} />
                  <Text style={styles.timeText}>{slot}</Text>
                </View>
              ))}
            </View>
          ) : null}
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
            {item.price != null ? `From $${item.price}` : 'Available to book'}
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
          <Text style={{ marginTop: 8 }}>Searching MongoDB for {searchCity}…</Text>
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
    </View>
  );
}

/* ===================== Styles ===================== */
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
  timeText: { fontSize: 10, color: '#0a66c2', marginLeft: 4, fontWeight: '600' },

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
});
