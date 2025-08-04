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

  const renderOrder = React.memo(({ item }) => (
    <View style={styles.tripCard}>
      <Text style={styles.tripTitle}>Destination ID: {item.destination_city_id}</Text>
      <Text>Departure ID: {item.departure_city_id}</Text>
      <Text>Flight ID: {item.flight_id}</Text>
      <Text>Hotel ID: {item.hotel_id}</Text>
      <Text>Transport: {item.transportation || 'N/A'}</Text>
      <Text>Price: ${item.total_price}</Text>
    </View>
  ));
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#2865c1ff" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: user?.profile_image || 'https://i.pravatar.cc/150?img=12' }}
        style={styles.avatar}
      />
      <Text style={styles.name}>{user?.name || user?.username || 'Traveler'}</Text>
      <Text style={styles.email}>{user?.email || 'no-email@example.com'}</Text>

      <Text style={styles.sectionTitle}>Your Trips</Text>
      {orders.length === 0 ? (
        <Text style={{ color: '#666', marginBottom: 20 }}>You have no trips yet.</Text>
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
    backgroundColor: '#eef6fc',
    alignItems: 'center',
    padding: 30,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2865c1ff',
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    alignSelf: 'flex-start',
    color: '#2865c1ff',
  },
  tripCard: {
    backgroundColor: '#d0e4ff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  tripTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  button: {
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
});
