import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        console.log('Start loading profile');
        const token = await AsyncStorage.getItem('token');
        console.log('Token:', token);

        if (!token) {
          console.log('No token found, redirecting to login');
          router.replace('/login');
          return;
        }

        // קודם נטען את פרטי המשתמש השמורים ב-AsyncStorage (מבלי לשלוף שוב מהשרת)
        const userDataJson = await AsyncStorage.getItem('userData');
        if (userDataJson) {
          const userData = JSON.parse(userDataJson);
          console.log('Cached user data:', userData);
          setUser(userData);
        }

        console.log('Fetching trips from server...');
        const response = await fetch('http://10.0.2.2:3001/api/user/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log('Response error text:', errorText);
          throw new Error('Failed to fetch user data from server');
        }

        const data = await response.json();
        console.log('Trips data:', data.trips);
        setTrips(data.trips || []);

        // במידה ואין משתמש במטמון, נשמור עכשיו
        if (!userDataJson && data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(data.user));
          setUser(data.user);
        }
      } catch (error) {
        Alert.alert('Error', error.message);
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/login');
  };

  const renderTrip = ({ item }) => (
    <View style={styles.tripCard}>
      <Text style={styles.tripTitle}>Destination: {item.destination_city_id}</Text>
      <Text>Departure: {item.departure_city_id}</Text>
      <Text>Flight: {item.flight_id}</Text>
      <Text>Total Price: ${item.total_price}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: user?.profile_image || 'https://i.pravatar.cc/150?img=12' }}
        style={styles.avatar}
      />
      <Text style={styles.name}>
        {user?.name || user?.username || 'Traveler'}
      </Text>
      <Text style={styles.email}>{user?.email || 'no-email@example.com'}</Text>

      <Text style={styles.sectionTitle}>Your Trips</Text>
      {trips.length === 0 ? (
        <Text style={{ color: '#666', marginBottom: 20 }}>You have no trips yet.</Text>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item._id}
          renderItem={renderTrip}
          style={{ width: '100%' }}
          contentContainerStyle={{ paddingBottom: 20 }}
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
