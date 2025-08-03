import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, FlatList, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

const recommendations  = [
  { id: '1', title: 'Phuket', image: require('../../assets/images/phuket.jpg') },
  { id: '2', title: 'Paris', image: require('../../assets/images/paris.png') },
  { id: '3', title: 'Dubai', image: require('../../assets/images/dubai.png') },
  { id: '4', title: 'London', image: require('../../assets/images/london.png') },
  { id: '5', title: 'Turkey', image: require('../../assets/images/turkey.png') },
  { id: '6', title: 'Amsterdam', image: require('../../assets/images/amsterdam.png') },
];

const userReviews = [
  { id: '1', name: 'Noa Levi', comment: 'An unforgettable experience!', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: '2', name: 'Ori Cohen', comment: 'The app helped me a lot!', avatar: 'https://i.pravatar.cc/150?img=14' },
  { id: '3', name: 'Yasmin Alon', comment: 'Super easy to use and really helpful during my trip.', avatar: 'https://i.pravatar.cc/150?img=32' },
  { id: '4', name: 'Tal Bar', comment: 'My whole trip was smoother thanks to this app.', avatar: 'https://i.pravatar.cc/150?img=23' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');
        if (userDataJson) {
          const userData = JSON.parse(userDataJson);
          setUser(userData);
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to load user data.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % recommendations.length;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2865c1ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logoSmall} />
      </View>

      <Text style={styles.title}>
        Welcome, {user?.name && user.name.trim() !== '' ? user.name : 'Dear Traveler'}!
      </Text>
      <Text style={styles.subtitle}>
        The app that guides you throughout your trip — with a schedule, map, weather, and more!
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/diary')}>
        <Text style={styles.buttonText}>Start Your Day</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recommended destinations</Text>
      <FlatList
        ref={flatListRef}
        horizontal
        data={recommendations}
        renderItem={({ item }) => (
          <View style={styles.carouselItem}>
            <Image source={item.image} style={styles.carouselImage} />
            <Text style={styles.cardText}>{item.title}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        scrollEnabled={false}
      />

      <Text style={styles.sectionTitle}>Recommended by Travelers</Text>
      {userReviews.map(review => (
        <View key={review.id} style={styles.reviewCard}>
          <Image source={{ uri: review.avatar }} style={styles.avatar} />
          <View>
            <Text style={styles.reviewerName}>{review.name}</Text>
            <Text>{review.comment}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.button, { backgroundColor:  '#007AFF', marginTop: 30 }]}
        onPress={() => router.push('/chat')}
      >
        <Text style={styles.buttonText}>Create a Custom Itinerary</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#cfeaf5ff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 100,
  },
logoContainer: {
  width: '100%',
  flexDirection: 'row',
  justifyContent: 'flex-start',
  paddingHorizontal: 10,
  marginBottom: 10,
  marginTop: 30, // הוספתי את זה כדי להוריד את הלוגו קצת למטה
},

  logoSmall: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#2865c1ff',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 30,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  carouselItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  carouselImage: {
    width: screenWidth - 80,
    height: 180,
    borderRadius: 15,
    resizeMode: 'cover',
    marginBottom: 5,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9eaebdff', 
    padding: 10,
    borderRadius: 12,
    marginVertical: 6,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewerName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
});
