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
      '68022f445f7300b11f986837': 'Grand Resort & Spa',
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

      console.log(`🔍 Fetching ${type} data for IDs:`, ids);

      const response = await fetchWithTimeout(
        'https://pathmakers-web-app-app-travel.onrender.com/api/orders/dynamic-data',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type, ids }),
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
      case 'flights':
        return doc.flight_number || doc.name || doc.flightNumber || doc.flight_name ||
               (doc.airline ? `${doc.airline} ${doc.flight_number || doc.flightNumber || ''}`.trim() : null);
      case 'hotels':
        return doc.name || doc.hotel_name || doc.hotelName || null;
      default:
        return null;
    }
  };
  const isHex24 = (s) => typeof s === 'string' && /^[0-9a-f]{24}$/i.test(s);


  // Bulk fetch missing data when orders load
  const fetchMissingData = useCallback(async (orders) => {
    console.log('🔍 Starting to analyze orders for missing data:', orders.length);
    
    const missingIds = {
      cities: new Set(),
      flights: new Set(),
      hotels: new Set()
    };

    // Identify missing data with detailed logging
    orders.forEach((order, index) => {
      console.log(`📋 Analyzing order ${index + 1}:`, {
        departure_city_name: order.departure_city_name,
        departure_city_id: order.departure_city_id,
        destination_city_name: order.destination_city_name,
        destination_city_id: order.destination_city_id,
        flight_name: order.flight_name,
        flight_id: order.flight_id,
        hotel_name: order.hotel_name,
        hotel_id: order.hotel_id
      });

      // Check departure cities
      const needsDepartureCity = (!order.departure_city_name || 
                                 order.departure_city_name.match(/^[0-9a-f]{24}$/i)) && 
                                order.departure_city_id && 
                                !staticMappings.cities[order.departure_city_id];
    if (needsDepartureCity && isHex24(order.departure_city_id)) {
        console.log(`🏙️ Need to fetch departure city: ${order.departure_city_id}`);
        missingIds.cities.add(order.departure_city_id);
      }
 else if (needsDepartureCity) {
   console.log('⛔ Skipping bad departure_city_id:', order.departure_city_id);
  }
      // Check destination cities
      const needsDestinationCity = (!order.destination_city_name || 
                                   order.destination_city_name.match(/^[0-9a-f]{24}$/i)) && 
                                  order.destination_city_id && 
                                  !staticMappings.cities[order.destination_city_id];
      if (needsDestinationCity) {
        console.log(`🏙️ Need to fetch destination city: ${order.destination_city_id}`);
        missingIds.cities.add(order.destination_city_id);
      }
      
      // Check flights
      const needsFlight = (!order.flight_name || 
                          order.flight_name.match(/^[0-9a-f]{24}$/i)) && 
                         order.flight_id && 
                         !staticMappings.flights[order.flight_id];
      if (needsFlight) {
        console.log(`✈️ Need to fetch flight: ${order.flight_id}`);
        missingIds.flights.add(order.flight_id);
      }
      
      // Check hotels
      const needsHotel = (!order.hotel_name || 
                         order.hotel_name.match(/^[0-9a-f]{24}$/i)) && 
                        order.hotel_id && 
                        !staticMappings.hotels[order.hotel_id];
      if (needsHotel) {
        console.log(`🏨 Need to fetch hotel: ${order.hotel_id}`);
        missingIds.hotels.add(order.hotel_id);
      }
    });
    console.log('📊 Summary of missing IDs:', {
      cities: Array.from(missingIds.cities),
      flights: Array.from(missingIds.flights),
      hotels: Array.from(missingIds.hotels)
    });

    // Fetch missing data for each type
    const fetchPromises = Object.entries(missingIds).map(async ([type, idSet]) => {
      if (idSet.size > 0) {
        const ids = Array.from(idSet);
        console.log(`🔄 Fetching missing ${type} data for ${ids.length} IDs:`, ids);
        const data = await fetchDynamicData(type, ids);
        console.log(`✅ Received ${type} data:`, data);
        return { type, data };
      }
      return { type, data: {} };
    });
    const results = await Promise.all(fetchPromises);
    
    // Update dynamic data state
    const newDynamicData = { ...dynamicData };
    results.forEach(({ type, data }) => {
      newDynamicData[type] = { ...newDynamicData[type], ...data };
    });
    
    console.log('🎯 Updated dynamic data:', newDynamicData);
    setDynamicData(newDynamicData);
  }, [dynamicData]);

  useEffect(() => {
    const loadData = async () => {
      console.log('📥 Start loading data...');
      try {
        // READ & CLEAN YOUR TOKEN
        const raw = await AsyncStorage.getItem('token');
        const token = raw?.replace(/^"|"$/g, '') || null;
        console.log('🔑 Clean token:', token);

        if (!token) {
          console.log('🚪 No token found, redirecting to login');
          router.replace('/login');
          return;
        }

        // LOAD CACHED USER DATA
        const userDataJson = await AsyncStorage.getItem('userData');
        if (userDataJson) {
          console.log('🗃️ Cached user data:', userDataJson);
          setUser(JSON.parse(userDataJson));
        }

        // FETCH ORDERS WITH THE CLEAN TOKEN
        console.log('🌐 Fetching orders from server...');
        const response = await fetchWithTimeout(
          'https://pathmakers-web-app-app-travel.onrender.com/api/orders',
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.log('❌ Response error body:', errorData);
          throw new Error(errorData?.message || 'Failed to load orders');
        }

        const data = await response.json();
        console.log('📦 Orders received:', data);

        if (!data.success) {
          throw new Error(data.message || 'Failed to load orders');
        }

        const ordersData = data.orders || [];
        const sortedOrders = [...ordersData].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setOrders(sortedOrders);
                
        // Fetch missing dynamic data
        if (ordersData.length > 0) {
          await fetchMissingData(ordersData);
        }

      } catch (err) {
        console.error('🔥 Load data error:', err);
        Alert.alert('Error', err.message || 'Failed to load data');
      } finally {
        setLoading(false);
        console.log('✅ Finished loading data. Loading state set to false.');
      }
    };

    loadData();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/login');
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  // Safe name functions
  const getSafeName = (name, id) => {
    if (name && name !== id && !name.match(/^[0-9a-f]{24}$/i)) {
      return name;
    }
    if (typeof id === 'string' && id.length === 24) {
      return `ID: ${id.substring(0, 8)}...`;
    }
    return id || 'Unknown';
  };

  // Enhanced name getter functions with dynamic lookup
  const getCityName = (cityName, cityId) => {
    console.log(`🏙️ Getting city name for: name="${cityName}", id="${cityId}"`);
    
    // First check if we have a valid non-ObjectId name
    if (cityName && !cityName.match(/^[0-9a-f]{24}$/i)) {
      console.log(`✅ Using provided city name: ${cityName}`);
      return cityName;
    }
    
    // Check static mappings
    if (staticMappings.cities[cityId]) {
      console.log(`✅ Found in static mappings: ${staticMappings.cities[cityId]}`);
      return staticMappings.cities[cityId];
    }
    
    // Check dynamic data
    if (dynamicData.cities[cityId]) {
      const doc = dynamicData.cities[cityId];
      console.log(`🔍 Found in dynamic data:`, doc);
      const name = extractNameFromDocument('cities', doc);
      if (name) {
        console.log(`✅ Extracted city name: ${name}`);
        return name;
      }
    }
    
    // Fallback
    const fallback = getSafeName(cityName, cityId);
    console.log(`⚠️ Using fallback for city: ${fallback}`);
    return fallback;
  };

  const getFlightName = (flightName, flightId) => {
    console.log(`✈️ Getting flight name for: name="${flightName}", id="${flightId}"`);
    
    if (flightName && !flightName.match(/^[0-9a-f]{24}$/i)) {
      console.log(`✅ Using provided flight name: ${flightName}`);
      return flightName;
    }
    
    if (staticMappings.flights[flightId]) {
      console.log(`✅ Found in static mappings: ${staticMappings.flights[flightId]}`);
      return staticMappings.flights[flightId];
    }
    
    if (dynamicData.flights[flightId]) {
      const doc = dynamicData.flights[flightId];
      console.log(`🔍 Found in dynamic data:`, doc);
      const name = extractNameFromDocument('flights', doc);
      if (name) {
        console.log(`✅ Extracted flight name: ${name}`);
        return name;
      }
    }
    
    const fallback = getSafeName(flightName, flightId);
    console.log(`⚠️ Using fallback for flight: ${fallback}`);
    return fallback;
  };

  const getHotelName = (hotelName, hotelId) => {
    console.log(`🏨 Getting hotel name for: name="${hotelName}", id="${hotelId}"`);
    
    if (hotelName && !hotelName.match(/^[0-9a-f]{24}$/i)) {
      console.log(`✅ Using provided hotel name: ${hotelName}`);
      return hotelName;
    }
    
    if (staticMappings.hotels[hotelId]) {
      console.log(`✅ Found in static mappings: ${staticMappings.hotels[hotelId]}`);
      return staticMappings.hotels[hotelId];
    }
    
    if (dynamicData.hotels[hotelId]) {
      const doc = dynamicData.hotels[hotelId];
      console.log(`🔍 Found in dynamic data:`, doc);
      const name = extractNameFromDocument('hotels', doc);
      if (name) {
        console.log(`✅ Extracted hotel name: ${name}`);
        return name;
      }
    }
    
    const fallback = getSafeName(hotelName, hotelId);
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
          
          <Text style={styles.tripDate}>
            📅 {new Date(item.created_at).toLocaleDateString()}
          </Text>
          
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
    const totalTrips = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);
    const destinations = new Set(orders.map(order => 
      getCityName(order.destination_city_name, order.destination_city_id)
    )).size;

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
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{destinations}</Text>
            <Text style={styles.statLabel}>Destinations</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>${totalSpent}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
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

  return (
 <View style={styles.container}>
    {/* Fixed buttons */}
    <View style={styles.logoutIconContainer}>
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <LogOut size={24} color="#495057" />
      </TouchableOpacity>
    </View>

    <View style={styles.supportIconContainer}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Support')}
        style={styles.supportButton}
      >
        <Ionicons name="help-circle-outline" size={24} color="#495057" />
      </TouchableOpacity>
    </View>

    {/* Scrollable content */}
    <FlatList
      nestedScrollEnabled
      ListHeaderComponent={
        <>
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
          {orders.length > 0 && renderStats()}

          {/* Title */}
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Your Adventures</Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
        </>
      }
      data={orders}
      keyExtractor={(item) => item._id.toString()}
      renderItem={renderOrder}
      ListEmptyComponent={
        <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.noTripsContainer}>
          <Text style={styles.noTripsEmoji}>✈️</Text>
          <Text style={styles.noTripsTitle}>Ready for Adventure?</Text>
          <Text style={styles.noTripsText}>Start exploring the world!</Text>
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
  top: 50, // adjust for safe area
  left: 20,
  zIndex: 100,
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
  top: 50,
  right: 20,
  zIndex: 100,
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