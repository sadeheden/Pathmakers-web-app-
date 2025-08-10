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
  const router = useRouter();
  const navigation = useNavigation();

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

  const getCityName = (cityName, cityId) => {
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