import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, FlatList, Dimensions, Modal, TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

const recommendations = [
  { id: '1', title: 'Phuket', image: require('../../assets/images/phuket.jpg'), description: 'A tropical paradise in Thailand.' },
  { id: '2', title: 'Paris', image: require('../../assets/images/paris.png'), description: 'The romantic capital of France.' },
  { id: '3', title: 'Dubai', image: require('../../assets/images/dubai.png'), description: 'A modern city in the UAE.' },
  { id: '4', title: 'London', image: require('../../assets/images/london.png'), description: 'Historic and cultural UK hub.' },
  { id: '5', title: 'Turkey', image: require('../../assets/images/turkey.png'), description: 'Where East meets West.' },
  { id: '6', title: 'Amsterdam', image: require('../../assets/images/amsterdam.png'), description: 'Charming canals and culture.' },
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
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [reviewModal, setReviewModal] = useState(false);
  const [newReview, setNewReview] = useState('');
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

  const handleDestinationPress = (description) => {
    setModalContent(description);
    setModalVisible(true);
  };

  const handleReviewPress = () => {
    setReviewModal(true);
  };

  const handleSaveReview = () => {
    console.log('Saved review:', newReview);
    setReviewModal(false);
    setNewReview('');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2865c1ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logoSmall} />
        <TouchableOpacity onPress={() => router.push('/weather')}>
          <Text style={styles.weatherPreview}>🌤 27°C</Text>
        </TouchableOpacity>
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
          <TouchableOpacity onPress={() => handleDestinationPress(item.description)}>
            <View style={styles.carouselItem}>
              <Image source={item.image} style={styles.carouselImage} />
              <Text style={styles.cardText}>{item.title}</Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        scrollEnabled
      />

      <Text style={styles.sectionTitle}>Recommended by Travelers</Text>
      {userReviews.map(review => (
        <TouchableOpacity key={review.id} onPress={handleReviewPress}>
          <View style={styles.reviewCard}>
            <Image source={{ uri: review.avatar }} style={styles.avatar} />
            <View>
              <Text style={styles.reviewerName}>{review.name}</Text>
              <Text>{review.comment}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text>{modalContent}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={reviewModal}
        animationType="slide"
        onRequestClose={() => setReviewModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ marginBottom: 10 }}>Leave a Comment</Text>
            <TextInput
              value={newReview}
              onChangeText={setNewReview}
              placeholder="Write your thoughts..."
              style={styles.input}
            />
            <TouchableOpacity style={styles.button} onPress={handleSaveReview}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReviewModal(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { alignItems: 'center', padding: 20, paddingBottom: 100 },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 10,
  },
  logoSmall: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginLeft: 10,
  },
  weatherPreview: {
    fontSize: 18,
    marginRight: 15,
    color: '#007AFF',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
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
    backgroundColor: '#f1f3f6',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalClose: {
    color: '#007AFF',
    marginTop: 10,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
});