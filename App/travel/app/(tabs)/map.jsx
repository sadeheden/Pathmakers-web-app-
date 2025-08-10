import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, ActivityIndicator,
  TouchableOpacity, Alert, FlatList, Platform
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const GEOAPIFY_KEY = 'df685720b88e4349a1df71ab33e36c3d';
const DEFAULT_RADIUS_M = 5000;
const PAGE_LIMIT = 30;

/* ✅ Move helpers OUTSIDE so they’re stable */
const toRad = (d) => (d * Math.PI) / 180;
const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};
const fmtDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);
const stars = (n) => {
  if (n == null || isNaN(n)) return 'N/A';
  const five = n > 5 ? Math.min(5, Math.round((n / 10) * 5)) : Math.round(n);
  return '★'.repeat(five) + '☆'.repeat(5 - five);
};
// deterministic pseudo-random per id
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

export default function AttractionsScreen() {
  const [coords, setCoords] = useState(null);
  const [loadingLoc, setLoadingLoc] = useState(true);

  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [loadingList, setLoadingList] = useState(false);
  const [items, setItems] = useState([]);
  const [errorText, setErrorText] = useState('');

  const fetchAbortRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Allow location access to find attractions nearby.');
          setErrorText('Location permission denied.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } catch (e) {
        setErrorText('Failed to get current location.');
      } finally {
        setLoadingLoc(false);
      }
    })();
  }, []);

  const fetchAttractions = useCallback(async () => {
    if (!coords) return;
    setLoadingList(true);
    setErrorText('');

    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      const categories = [
        'tourism.attraction',
        'tourism.sights',
        'entertainment.museum',
        'entertainment.zoo',
        'entertainment.theme_park',
        'leisure.park'
      ].join(',');

      const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(
        categories
      )}&filter=circle:${coords.lon},${coords.lat},${radiusM}&bias=proximity:${coords.lon},${coords.lat}&limit=${PAGE_LIMIT}&apiKey=${GEOAPIFY_KEY}`;

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Geoapify error ${res.status}`);
      const json = await res.json();

      const list = await Promise.all(
        (json.features || []).map(async (f) => {
          const p = f.properties || {};
          const [lon, lat] = (f.geometry && f.geometry.coordinates) || [];
          const dist = distanceMeters(coords.lat, coords.lon, lat, lon);
          const rating = p.rating ?? p.score ?? p.rank ?? null;
          const book = await fetchBookability(p.place_id);

          return {
            id: p.place_id || `${lat},${lon}`,
            name: p.name || p.street || p.formatted || 'Unknown place',
            address: p.address_line2 || p.address_line1 || p.formatted || '',
            lat,
            lon,
            distance: dist,
            rating,
            openingHours: p.opening_hours || null,
            website: p.website || null,
            bookable: !!book.bookable,
            price: book.price ?? null,
          };
        })
      );

      setItems(list.sort((a, b) => a.distance - b.distance));
    } catch (e) {
      if (e.name !== 'AbortError') {
        setErrorText('Failed to load attractions.');
        setItems([]);
      }
    } finally {
      setLoadingList(false);
      fetchAbortRef.current = null;
    }
  /* ✅ Dependencies no longer include distanceMeters (it’s stable now) */
  }, [coords, radiusM]);

  useEffect(() => {
    if (coords) fetchAttractions();
  }, [coords, radiusM, fetchAttractions]);

  const onPressTicket = async (item) => {
    if (!item.bookable) {
      Alert.alert('Not available', 'This attraction is not bookable with us (yet).');
      return;
    }
    Alert.alert('Booking', `Opening booking for ${item.name}…`);
  };

  const Header = useMemo(
    () => (
      <View style={styles.header}>
        <Ionicons name="location" size={18} />
        <Text style={styles.headerTitle}> Nearby attractions</Text>
      </View>
    ),
    []
  );

  const Controls = useMemo(
    () => (
      <View style={styles.controls}>
        <Text style={styles.ctrlLabel}>Radius</Text>

        <View style={styles.row}>
          {[{ label: '2km', val: 2000 }, { label: '5km', val: 5000 }, { label: '10km', val: 10000 }].map((opt, idx) => (
            <TouchableOpacity
              key={opt.val}
              style={[styles.chip, radiusM === opt.val && styles.chipActive, idx > 0 && styles.ml8]}
              onPress={() => setRadiusM(opt.val)}
            >
              <Text style={[styles.chipText, radiusM === opt.val && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchAttractions} disabled={loadingList}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    ),
    [radiusM, loadingList, fetchAttractions]
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={{ flex: 1, paddingRight: 42 }}>
          <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
          {!!item.address && <Text style={styles.placeAddress} numberOfLines={1}>{item.address}</Text>}

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="navigate-outline" size={14} />
              <Text style={styles.metaText}>{fmtDistance(item.distance)}</Text>
            </View>

            <View style={[styles.metaPill, styles.ml8]}>
              <Ionicons name="star" size={14} />
              <Text style={styles.metaText}>{stars(item.rating)}</Text>
            </View>

            {item.openingHours ? (
              <View style={[styles.metaPill, styles.ml8]}>
                <Ionicons name="time-outline" size={14} />
                <Text style={styles.metaText}>Hours available</Text>
              </View>
            ) : null}
          </View>
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
          <Ionicons name="pricetag-outline" size={14} />
          <Text style={styles.bookText}>{item.price != null ? `From $${item.price}` : 'Available to book'}</Text>
        </View>
      ) : (
        <View style={styles.unavailableRow}>
          <Ionicons name="close-circle-outline" size={14} />
          <Text style={styles.unavailableText}>Not available to book with us</Text>
        </View>
      )}
    </View>
  );

  if (loadingLoc) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Getting your location…</Text>
      </View>
    );
  }

  if (!coords) {
    return (
      <View style={styles.center}>
        <Text>{errorText || 'Location unavailable.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Header}
      {Controls}

      {loadingList ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Searching nearby attractions…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text>{errorText || 'No attractions found nearby.'}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingTop: 90, paddingHorizontal: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  controls: { paddingHorizontal: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  ml8: { marginLeft: 8 },

  ctrlLabel: { fontWeight: '600', marginRight: 6, marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f1f3f5' },
  chipActive: { backgroundColor: '#dceeff' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#444' },
  chipTextActive: { color: '#0a66c2' },
  refreshBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a66c2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8
  },
  refreshText: { color: '#fff', marginLeft: 6, fontWeight: '600' },

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
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  placeName: { fontSize: 16, fontWeight: '700' },
  placeAddress: { fontSize: 13, color: '#666', marginTop: 2 },
  metaRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f7f8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: { fontSize: 12, color: '#333' },

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
});
