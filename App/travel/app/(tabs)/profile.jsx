import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons';
import { LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';


const { width } = Dimensions.get('window');


function fetchWithTimeout(resource, options = {}) {
  const { timeout = 10000 } = options;

  return Promise.race([
    fetch(resource, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    ),
  ]);
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dynamicData, setDynamicData] = useState({
    cities: {},
    flights: {},
    hotels: {}
  });
  const router = useRouter();
  const navigation = useNavigation();

  // Static mappings as fallback
  const staticMappings = {
    cities: {
      '68022f445f7300b11f986829': 'Tel Aviv',
      '68022f445f7300b11f986837': 'Phuket', 
      '68022f445f7300b11f986838': 'Paris',
      '68022f445f7300b11f986839': 'Dubai',
      '68022f445f7300b11f98683a': 'London',
      '68022f445f7300b11f98683b': 'Turkey',
      '68022f445f7300b11f98683c': 'Amsterdam'
    },
    flights: {
      '68075f88dc218773e0652238': 'PG123 - Phuket Airways',
      '68075f88dc218773e0652239': 'AF456 - Air France',
      '68075f88dc218773e065223a': 'EK654 - Emirates',
      '68075f88dc218773e065223b': 'BA890 - British Airways',
      '68075f88dc218773e065223c': 'TK101 - Turkish Airlines',
      '68075f88dc218773e065223d': 'KL202 - KLM Royal Dutch'
    },
    hotels: {
      '68022f445f7300b11f986837': 'Phuket Grand Resort & Spa',
      '68022f445f7300b11f986838': 'Hotel Parisienne Palace', 
      '68022f445f7300b11f986839': 'Dubai Luxury Suites & Marina',
      '68022f445f7300b11f98683a': 'The London Palace Hotel',
      '68022f445f7300b11f98683b': 'Istanbul Grand Sultanahmet',
      '68022f445f7300b11f98683c': 'Amsterdam Central Boutique Hotel'
    }
  };

  // Function to fetch dynamic data from MongoDB
  const fetchDynamicData = async (type, ids) => {
    try {
      const token = (await AsyncStorage.getItem('token'))?.replace(/^"|"$/g, '') || null;
      if (!token) return {};
      const typeForApi = type === 'cities' ? 'city' : type;
      console.log(`🔍 Fetching ${type} data for IDs:`, ids);
  // normalize ids and keep only true 24-hex
const validIds = (ids || []).map(idKey).filter(isHex24);

      if (validIds.length === 0) {
        console.log(`⏭️ No valid ${type} ids to fetch`);
        return {};
      }
      const response = await fetchWithTimeout(
        'https://pathmakers-web-app-app-travel.onrender.com/api/orders/dynamic-data',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: typeForApi, ids: validIds }),
          timeout: 10000,
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Received ${type} data:`, result.data);
        return result.data || {};
      } else {
        console.log(`❌ Failed to fetch ${type} data:`, response.status);
      }
    } catch (error) {
      console.error(`❌ Error fetching dynamic ${type}:`, error);
    }
    return {};
  };

  // Extract name from MongoDB document based on type
  const extractNameFromDocument = (type, doc) => {
  if (!doc) return null;

  switch (type) {
    case 'cities':
      return doc.name || doc.city || doc.cityName || doc.city_name || null;

    case 'flights': {
      // direct fields if present
      if (doc.flight_number || doc.flightNumber) return doc.flight_number || doc.flightNumber;
      if (doc.name || doc.flight_name) return doc.name || doc.flight_name;

      // handle array form: choose the cheapest airline name, or first as fallback
      if (Array.isArray(doc.airlines) && doc.airlines.length) {
        const best = [...doc.airlines].sort(
          (a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER)
        )[0];
        return best?.name || doc.airlines[0]?.name || null;
      }

      // airline + number combo
      if (doc.airline) {
        const num = doc.flight_number || doc.flightNumber || '';
        return `${doc.airline}${num ? ' ' + num : ''}`.trim();
      }
      return null;
    }

    case 'hotels':
      return doc.name || doc.hotel_name || doc.hotelName || null;

    default:
      return null;
  }
};

  const isHex24 = (s) => typeof s === 'string' && /^[0-9a-f]{24}$/i.test(s);


  // Bulk fetch missing data when orders load
const fetchMissingData = useCallback(async (orders) => {
  const missingIds = { cities: new Set(), flights: new Set(), hotels: new Set() };

  orders.forEach((order) => {
    const depIdKey  = idKey(order.departure_city_id);
    const destIdKey = idKey(order.destination_city_id);

    const depName  = typeof order.departure_city_name === 'string' ? order.departure_city_name : toStringId(order.departure_city_name);
    const destName = typeof order.destination_city_name === 'string' ? order.destination_city_name : toStringId(order.destination_city_name);

    const depNameLooksLikeId  = looksLikeCompositeObjectId(depName)  || /^[0-9a-f]{24}$/i.test(depName || '');
    const destNameLooksLikeId = looksLikeCompositeObjectId(destName) || /^[0-9a-f]{24}$/i.test(destName || '');

    if (depNameLooksLikeId && isHex24(depIdKey) && !staticMappings.cities[depIdKey]) missingIds.cities.add(depIdKey);
    if (destNameLooksLikeId && isHex24(destIdKey) && !staticMappings.cities[destIdKey]) missingIds.cities.add(destIdKey);

    const flightIdKey = idKey(order.flight_id);
    const flightName  = typeof order.flight_name === 'string' ? order.flight_name : toStringId(order.flight_name);
    const flightNameLooksLikeId = looksLikeCompositeObjectId(flightName) || /^[0-9a-f]{24}$/i.test(flightName || '');
    if (flightNameLooksLikeId && isHex24(flightIdKey) && !staticMappings.flights[flightIdKey]) missingIds.flights.add(flightIdKey);

    const hotelIdKey = idKey(order.hotel_id);
    const hotelName  = typeof order.hotel_name === 'string' ? order.hotel_name : toStringId(order.hotel_name);
    const hotelNameLooksLikeId = looksLikeCompositeObjectId(hotelName) || /^[0-9a-f]{24}$/i.test(hotelName || '');
    if (hotelNameLooksLikeId && isHex24(hotelIdKey) && !staticMappings.hotels[hotelIdKey]) missingIds.hotels.add(hotelIdKey);
  });

  const fetchPromises = Object.entries(missingIds).map(async ([type, idSet]) => {
    if (!idSet.size) return { type, data: {} };
    const data = await fetchDynamicData(type, Array.from(idSet));
    return { type, data };
  });
  const results = await Promise.all(fetchPromises);

  // functional update only
  setDynamicData((prev) => {
    const next = { ...prev };
    results.forEach(({ type, data }) => {
      next[type] = { ...next[type], ...data };
    });
    return next;
  });
}, []); // <-- IMPORTANT: no dynamicData here

const inFlightRef = React.useRef(false);

function fetchWithTimeout(resource, options = {}) {
  const { timeout = 30000, ...rest } = options; // ⬆️ 30s
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(resource, { ...rest, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

const loadData = useCallback(async ({ spinner = false } = {}) => {
  if (inFlightRef.current) return;   // ⛔️ don't overlap
  inFlightRef.current = true;

  try {
    if (spinner) setLoading(true);
    setRefreshing(true);

    const raw = await AsyncStorage.getItem('token');
    const token = raw?.replace(/^"|"$/g, '') || null;
    if (!token) { router.replace('/login'); return; }

    const userDataJson = await AsyncStorage.getItem('userData');
    if (userDataJson) setUser(JSON.parse(userDataJson));

    const response = await fetchWithTimeout(
      'https://pathmakers-web-app-app-travel.onrender.com/api/orders',
      { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 } // ⬆️ 30s
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `Failed to load orders (${response.status})`);
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to load orders');

    const ordersData = data.orders || [];
    const sortedOrders = [...ordersData].sort(
      (a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
    );
    setOrders(sortedOrders);

    if (ordersData.length > 0) {
      await fetchMissingData(ordersData);
    }
  } catch (err) {
    // Only show one alert per failure burst
    console.error('🔥 Load data error:', err);
    Alert.alert('Error', err.message || 'Failed to load data');
  } finally {
    setRefreshing(false);
    if (spinner) setLoading(false);
    inFlightRef.current = false;
  }
}, [router, fetchMissingData]); // <- stable now

useEffect(() => {
  loadData({ spinner: true });
}, [loadData]);

useFocusEffect(
  useCallback(() => {
    loadData();  // no spinner
    return () => {};
  }, [loadData])
);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/login');
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };
// Safely turn any mongo id-ish value into a string
// Safely turn any mongo id-ish value into a string
const toStringId = (val) => {
  if (typeof val === 'string') return val;
  if (val?.$oid) return String(val.$oid);         // when coming as { $oid: "..." }
  if (val?.toString) return String(val.toString());
  try { return JSON.stringify(val); } catch { return String(val); }
};

// Short, readable id for UI
const shortId = (id) => {
  const s = toStringId(id);
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
};
// Normalize an id into a safe string key for lookups
// Normalize an id into a safe string key for lookups (strip "-0", "_1", etc.)
const idKey = (id) => {
  const s = toStringId(id) || '';
  const m = s.match(/^([0-9a-f]{24})(?:[-_]\d+)?$/i);
  return m ? m[1] : s;
};

// Helpers for checking patterns
const looksLikeCompositeObjectId = (s) =>
  typeof s === 'string' && /^([0-9a-f]{24})(?:[-_]\d+)?$/i.test(s);


  // Safe name functions
const getSafeName = (name, id) => {
  const idStr = toStringId(id);
  const looksId = looksLikeCompositeObjectId(name) || /^[0-9a-f]{24}$/i.test(name || '');
  if (name && !looksId) return name;
  if (typeof idStr === 'string' && idStr.length >= 24) {
    const core = idKey(idStr); // strip "-0" etc
    return `ID: ${core.substring(0, 8)}...`;
  }
  return idStr || 'Unknown';
};


  // Enhanced name getter functions with dynamic lookup
// Enhanced name getter functions with dynamic lookup (fixed)
// Replace your getCityName with this (uses idKey + composite-id guard)
const getCityName = (cityName, cityId) => {
  const key = idKey(cityId); // normalize id (strips "-0", "_1", etc.)
  const rawName = typeof cityName === 'string' ? cityName : toStringId(cityName);
  const nameStr = looksLikeCompositeObjectId(rawName) ? '' : rawName;

  console.log(`🏙️ Getting city name for: name="${nameStr}", id="${key}"`);

  // If already a human-readable name, use it
  if (nameStr && !/^[0-9a-f]{24}$/i.test(nameStr)) {
    console.log(`✅ Using provided city name: ${nameStr}`);
    return nameStr;
  }

  // Try static mapping
  if (staticMappings.cities[key]) {
    console.log(`✅ Found in static mappings: ${staticMappings.cities[key]}`);
    return staticMappings.cities[key];
  }

  // Try dynamic mapping
  if (dynamicData.cities[key]) {
    const doc = dynamicData.cities[key];
    console.log(`🔍 Found in dynamic data:`, doc);
    const name = extractNameFromDocument('cities', doc);
    if (name) {
      console.log(`✅ Extracted city name: ${name}`);
      return name;
    }
  }

  // Fallback to safe label
  const fallback = getSafeName(nameStr, key);
  console.log(`⚠️ Using fallback for city: ${fallback}`);
  return fallback;
};


const getFlightName = (flightName, flightId) => {
  const key = idKey(flightId);
  const rawName = typeof flightName === 'string' ? flightName : toStringId(flightName);
  const nameStr = looksLikeCompositeObjectId(rawName) ? '' : rawName;

  console.log(`✈️ Getting flight name for: name="${nameStr}", id="${key}"`);

  if (nameStr && !/^[0-9a-f]{24}$/i.test(nameStr)) {
    console.log(`✅ Using provided flight name: ${nameStr}`);
    return nameStr;
  }

  if (staticMappings.flights[key]) {
    console.log(`✅ Found in static mappings: ${staticMappings.flights[key]}`);
    return staticMappings.flights[key];
  }

  if (dynamicData.flights[key]) {
    const doc = dynamicData.flights[key];
    console.log(`🔍 Found in dynamic data:`, doc);
    const name = extractNameFromDocument('flights', doc);
    if (name) {
      console.log(`✅ Extracted flight name: ${name}`);
      return name;
    }
  }

  const fallback = getSafeName(nameStr, key);
  console.log(`⚠️ Using fallback for flight: ${fallback}`);
  return fallback;
};

const getHotelName = (hotelName, hotelId) => {
  const key = idKey(hotelId);
  const rawName = typeof hotelName === 'string' ? hotelName : toStringId(hotelName);
  const nameStr = looksLikeCompositeObjectId(rawName) ? '' : rawName;

  console.log(`🏨 Getting hotel name for: name="${nameStr}", id="${key}"`);

  if (nameStr && !/^[0-9a-f]{24}$/i.test(nameStr)) {
    console.log(`✅ Using provided hotel name: ${nameStr}`);
  }

  if (staticMappings.hotels[key]) {
    console.log(`✅ Found in static mappings: ${staticMappings.hotels[key]}`);
    return staticMappings.hotels[key];
  }

  if (dynamicData.hotels[key]) {
    const doc = dynamicData.hotels[key];
    console.log(`🔍 Found in dynamic data:`, doc);
    const name = extractNameFromDocument('hotels', doc);
    if (name) {
      console.log(`✅ Extracted hotel name: ${name}`);
      return name;
    }
  }

  const fallback = getSafeName(nameStr, key);
  console.log(`⚠️ Using fallback for hotel: ${fallback}`);
  return fallback;
};

  const renderOrder = ({ item }) => {
    const isExpanded = expandedOrderId === item._id;

    return (
      <TouchableOpacity
        style={styles.tripCard}
        onPress={() => toggleExpand(item._id)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#f8f9fa', '#e9ecef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tripGradient}
        >
<View style={styles.tripHeader}>
            <Text style={styles.tripTitle}>
              🏖️ {getCityName(item.destination_city_name, item.destination_city_id)}
            </Text>
            <Text style={styles.tripPrice}>${item.total_price}</Text>
          </View>
          
          {/* Trip dates - departure and return */}
          {(item.tripDate || item.trip_start_date) && (
            <Text style={styles.tripDate}>
              🛫 Departure: {new Date(item.tripDate || item.trip_start_date).toLocaleDateString()}
            </Text>
          )}
          {(item.returnDate || item.trip_end_date) && (
            <Text style={styles.tripDate}>
              🛬 Return: {new Date(item.returnDate || item.trip_end_date).toLocaleDateString()}
            </Text>
          )}
          
          <Text style={styles.tripDate}>
            📅 Booked: {new Date(item.created_at || item.createdAt || item.bookingDate).toLocaleDateString()}
          </Text>
          <Text style={styles.orderId}>Order: {shortId(item._id)}</Text>
          
          {isExpanded && (
            <View style={styles.expandedContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🛫</Text>
                <Text style={styles.detailText}>
                  From: {getCityName(item.departure_city_name, item.departure_city_id)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>✈️</Text>
                <Text style={styles.detailText}>
                  Flight: {getFlightName(item.flight_name, item.flight_id)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🏨</Text>
                <Text style={styles.detailText}>
                  Hotel: {getHotelName(item.hotel_name, item.hotel_id)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🚗</Text>
                <Text style={styles.detailText}>
                  Transport: {item.transportation || 'Not specified'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>💳</Text>
                <Text style={styles.detailText}>
                  Payment: {item.payment_method || 'Not specified'}
                </Text>
              </View>
            </View>
          )}
          
          <Text style={styles.expandHint}>
            {isExpanded ? '▲ Tap to collapse' : '▼ Tap for details'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderStats = () => {
    const totalTrips = upcomingOrders.length;
    const totalSpent = upcomingOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
    const destinations = new Set(
      upcomingOrders.map(order => getCityName(order.destination_city_name, order.destination_city_id))
    ).size;

    return (
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsGradient}
        >
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalTrips}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{destinations}</Text>
            <Text style={styles.statLabel}>Destinations</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>${totalSpent}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c757d" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  // NEW: Check if trip is upcoming (starts today or in the future)
const isUpcomingOrder = (order) => {
  const today = new Date();
  // Set time to start of day for comparison
  today.setHours(0, 0, 0, 0);

  console.log('🔍 DEBUG - Order dates:', {
    orderId: order._id,
    trip_start_date: order.trip_start_date,
    start_date: order.start_date,
    tripDate: order.tripDate,
    trip_end_date: order.trip_end_date,
    end_date: order.end_date,
    returnDate: order.returnDate,
    created_at: order.created_at,
    createdAt: order.createdAt
  });

  const getValidDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  // Get the start date of the trip
  const start =
    getValidDate(order.trip_start_date) ||
    getValidDate(order.start_date) ||
    getValidDate(order.tripDate) ||
    getValidDate(order.created_at) ||
    getValidDate(order.createdAt);

  if (!start) {
    console.log('⚠️ No valid start date found for order:', order._id);
    return false;
  }

  // Set start time to start of day for comparison
  start.setHours(0, 0, 0, 0);

  const isUpcoming = start >= today;

  console.log('🔍 DEBUG - Trip status:', {
    orderId: order._id,
    startDate: start.toISOString(),
    today: today.toISOString(),
    isUpcoming: isUpcoming
  });

  return isUpcoming;
};

  // Filter upcoming orders (trips starting today or in the future)
  const upcomingOrders = orders.filter(isUpcomingOrder);

  return (
    <View style={styles.container}>
      <FlatList
        nestedScrollEnabled
        ListHeaderComponent={
          <>
            {/* Top-right Support Icon */}
            <View style={styles.supportIconContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Support')} // or navigation.navigate('Support')
                style={styles.supportButton}
              >
                <Ionicons name="help-circle-outline" size={24} color="#495057" />
              </TouchableOpacity>
            </View>

            {/* Top-left Logout Icon */}
            <View style={styles.logoutIconContainer}>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <LogOut size={24} color="#495057" />
              </TouchableOpacity>
            </View>

            {/* Profile section */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: user?.profile_image || 'https://i.pravatar.cc/150?img=12' }}
                  style={styles.avatar}
                />
                <View style={styles.avatarRing} />
              </View>
              <Text style={styles.name}>{user?.name || user?.username || 'Traveler'}</Text>
              <Text style={styles.email}>{user?.email || 'no-email@example.com'}</Text>
            </View>

            {/* Stats */}
         {upcomingOrders.length > 0 && renderStats()}

            {/* Title */}
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Upcoming Trips</Text>
              <View style={styles.sectionTitleUnderline} />
              <View style={{ alignItems: 'center', marginTop: 6 }}>
                <Text style={{ fontSize: 12, color: '#d84228ff' }}>
                 For more info visit our website.
                </Text>
              </View>
            </View>
          </>
        }

        data={upcomingOrders}         
keyExtractor={(item) => toStringId(item._id)}

        renderItem={renderOrder}
  refreshing={refreshing}
  onRefresh={() => loadData()}

        ListEmptyComponent={
          <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.noTripsContainer}>
            <Text style={styles.noTripsEmoji}>✈️</Text>
            <Text style={styles.noTripsTitle}>No Upcoming Trips</Text>
            <Text style={styles.noTripsText}>
              To see all your trips (past & upcoming), please visit our website.
            </Text>
          </LinearGradient>
        }

        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 130,
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#e9ecef',
  },
  avatarRing: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 2,
    borderColor: '#dee2e6',
    top: -8,
    left: -8,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  statsContainer: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statsGradient: {
    flexDirection: 'row',
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#dee2e6',
    marginHorizontal: 15,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#495057',
  },
  statLabel: { 
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionTitleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
  },
  sectionTitleUnderline: {
    width: 50,
    height: 3,
    backgroundColor: '#6c757d',
    marginTop: 8,
    borderRadius: 2,
  },
  tripsList: {
    width: '100%',
  },
  tripCard: {
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tripGradient: {
    padding: 20,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
  },
  tripPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#495057',
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  tripDate: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 10,
  },
  expandedContent: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
    lineHeight: 20,
  },
  expandHint: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  noTripsContainer: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginVertical: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  noTripsEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  noTripsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  noTripsText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  orderId: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
  },
  buttonContainer: {
    marginTop: 30,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#6c757d',
    textAlign: 'center',
    fontWeight: '500',
  },
  logoutIconContainer: {
    position: 'absolute',
    top: 50, // adjust for your SafeArea
    left: 20,
    zIndex: 10,
  },
  logoutButton: {
    backgroundColor: '#f1f3f5',
    padding: 8,
    borderRadius: 50,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  supportIconContainer: {
    position: 'absolute',
    top: 50, // adjust for your SafeArea
    right: 20,
    zIndex: 10,
  },
  supportButton: {
    backgroundColor: '#f1f3f5',
    padding: 8,
    borderRadius: 50,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});