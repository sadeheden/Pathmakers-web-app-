import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

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
  const router = useRouter();

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

        setOrders(data.orders || []);
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

  // פונקציה לקבלת שם בטוח - אם אין שם, תציג ID מקוצר
  const getSafeName = (name, id) => {
    if (name && name !== id && !name.match(/^[0-9a-f]{24}$/i)) {
      return name;
    }
    // אם השם הוא ID, תציג גרסה מקוצרת וידידותית יותר
    if (typeof id === 'string' && id.length === 24) {
      return `ID: ${id.substring(0, 8)}...`;
    }
    return id || 'Unknown';
  };

  // פונקציה לקבלת שם עיר
  const getCityName = (cityName, cityId) => {
    // מיפוי ידני של IDs לשמות ערים אם הlookup לא עובד
    const cityMappings = {
      '68022f445f7300b11f986829': 'Tel Aviv',
      '68022f445f7300b11f986837': 'Phuket', 
      '68022f445f7300b11f986838': 'Paris',
      '68022f445f7300b11f986839': 'Dubai',
      '68022f445f7300b11f98683a': 'London',
      '68022f445f7300b11f98683b': 'Turkey',
      '68022f445f7300b11f98683c': 'Amsterdam'
    };
    
    if (cityName && !cityName.match(/^[0-9a-f]{24}$/i)) {
      return cityName;
    }
    
    return cityMappings[cityId] || getSafeName(cityName, cityId);
  };

  // פונקציה לקבלת מספר טיסה
  const getFlightName = (flightName, flightId) => {
    const flightMappings = {
      '68075f88dc218773e0652238': 'PG123 - Phuket',
      '68075f88dc218773e0652239': 'AF123 - Paris',
      '68075f88dc218773e065223a': 'EK654 - Dubai',
      '68075f88dc218773e065223b': 'BA890 - London',
      '68075f88dc218773e065223c': 'TK101 - Turkey',
      '68075f88dc218773e065223d': 'KL202 - Amsterdam'
    };
    
    if (flightName && !flightName.match(/^[0-9a-f]{24}$/i)) {
      return flightName;
    }
    
    return flightMappings[flightId] || getSafeName(flightName, flightId);
  };

  // פונקציה לקבלת שם מלון
  const getHotelName = (hotelName, hotelId) => {
    const hotelMappings = {
      '68022f445f7300b11f986837': 'Phuket Grand Hotel',
      '68022f445f7300b11f986838': 'Hotel Parisienne', 
      '68022f445f7300b11f986839': 'Dubai Luxury Suites',
      '68022f445f7300b11f98683a': 'The London Palace',
      '68022f445f7300b11f98683b': 'Istanbul Grand Hotel',
      '68022f445f7300b11f98683c': 'Amsterdam Central Hotel'
    };
    
    if (hotelName && !hotelName.match(/^[0-9a-f]{24}$/i)) {
      return hotelName;
    }
    
    return hotelMappings[hotelId] || getSafeName(hotelName, hotelId);
  };

  const renderOrder = ({ item }) => {
    const isExpanded = expandedOrderId === item._id;

    return (
      <TouchableOpacity
        style={styles.tripCard}
        onPress={() => toggleExpand(item._id)}
        activeOpacity={0.8}
      >
        <Text style={styles.tripTitle}>
          🏖️ Trip to {getCityName(item.destination_city_name, item.destination_city_id)}
        </Text>
        
        <Text style={styles.tripPrice}>💰 ${item.total_price}</Text>
        <Text style={styles.tripDate}>📅 {new Date(item.created_at).toLocaleDateString()}</Text>
        
        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.detailText}>
              🛫 From: {getCityName(item.departure_city_name, item.departure_city_id)}
            </Text>
            <Text style={styles.detailText}>
              ✈️ Flight: {getFlightName(item.flight_name, item.flight_id)}
            </Text>
            <Text style={styles.detailText}>
              🏨 Hotel: {getHotelName(item.hotel_name, item.hotel_id)}
            </Text>
            <Text style={styles.detailText}>
              🚗 Transport: {item.transportation || 'Not specified'}
            </Text>
            <Text style={styles.detailText}>
              💳 Payment: {item.payment_method || 'Not specified'}
            </Text>
          </View>
        )}
        
        <Text style={styles.expandHint}>
          {isExpanded ? '▲ Tap to collapse' : '▼ Tap for details'}
        </Text>
      </TouchableOpacity>
    );
  };

  // רכיב סטטיסטיקות
  const renderStats = () => {
    const totalTrips = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);
    const destinations = new Set(orders.map(order => 
      getCityName(order.destination_city_name, order.destination_city_id)
    )).size;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalTrips}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{destinations}</Text>
          <Text style={styles.statLabel}>      Destinations</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>${totalSpent}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <Image
          source={{ uri: user?.profile_image || 'https://i.pravatar.cc/150?img=12' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{user?.name || user?.username || 'Traveler'}</Text>
        <Text style={styles.email}>{user?.email || 'no-email@example.com'}</Text>
      </View>

      {orders.length > 0 && renderStats()}

      <Text style={styles.sectionTitle}>Your Trips</Text>
      
      {orders.length === 0 ? (
        <View style={styles.noTripsContainer}>
          <Text style={styles.noTripsEmoji}>✈️</Text>
          <Text style={styles.noTripsText}>No trips yet!</Text>
          <Text style={styles.noTripsText}>Start exploring the world</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id.toString()}
          renderItem={renderOrder}
          style={{ width: '100%' }}
          contentContainerStyle={{ paddingBottom: 20 }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2f593',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  profileSection: {
    marginTop: 40, 
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    color: '#2865c1ff',
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
sectionTitle: {
  fontSize: 22,
  fontWeight: '700',
  marginBottom: 15,
  marginTop: 10,  // להקטין/להגדיל את המרווח מעל הכותרת
  alignSelf: 'flex-start',
  color: '#2865c1ff',
  borderBottomWidth: 2,
  borderBottomColor: '#007AFF',
  paddingBottom: 5,
},

  tripCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2865c1ff',
  },
  tripPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 20,
  },
  expandHint: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 25,  
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  // סטיילים נוספים לשיפור החוויה
  noTripsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
  },
  noTripsText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 10,
  },
  noTripsEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef2f593',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});