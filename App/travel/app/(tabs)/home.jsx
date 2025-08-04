import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, FlatList, Dimensions, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

const recommendations = [
  { id: '1', title: 'Phuket', image: require('../../assets/images/phuket.jpg'), description: 'Explore beaches, temples, and nightlife.' },
  { id: '2', title: 'Paris', image: require('../../assets/images/paris.png'), description: 'Romantic streets, Eiffel Tower, fine dining.' },
  { id: '3', title: 'Dubai', image: require('../../assets/images/dubai.png'), description: 'Luxury shopping, Burj Khalifa, desert adventures.' },
  { id: '4', title: 'London', image: require('../../assets/images/london.png'), description: 'Historic sites, Big Ben, cozy pubs.' },
  { id: '5', title: 'Turkey', image: require('../../assets/images/turkey.png'), description: 'Markets, rich culture, hot air balloons.' },
  { id: '6', title: 'Amsterdam', image: require('../../assets/images/amsterdam.png'), description: 'Canals, bikes, vibrant neighborhoods.' },
];

const userReviews = [
  { 
    id: '1', 
    name: 'Noa Levi', 
    likes: 3, 
    dislikes: 0, 
    tripText: 'Just returned from an amazing week in Phuket! The beaches were absolutely stunning and the local food scene exceeded all expectations. Would definitely go back!' 
  },
  { 
    id: '2', 
    name: 'Ori Cohen', 
    likes: 5, 
    dislikes: 1, 
    tripText: 'Paris in spring is magical! Spent 5 days exploring museums, cafes, and hidden neighborhoods. The Eiffel Tower at sunset is a must-see experience.' 
  },
  { 
    id: '3', 
    name: 'Yasmin Alon', 
    likes: 8, 
    dislikes: 2, 
    tripText: 'Dubai was incredible - from the towering Burj Khalifa to the traditional souks. Perfect blend of modern luxury and cultural heritage. Shopping was amazing!' 
  },
  { 
    id: '4', 
    name: 'Tal Bar', 
    likes: 4, 
    dislikes: 0, 
    tripText: 'London has my heart! Cozy pubs, fascinating history, and friendly locals. The rainy weather just added to the authentic British experience.' 
  },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
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

  const handleWeatherPress = () => {
    try {
      console.log('Weather button pressed');
      navigation.navigate('Weather');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not navigate to weather screen.');
    }
  };

  const handleDiaryPress = () => {
    try {
      console.log('Diary button pressed');
      navigation.navigate('Diary');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not navigate to diary screen.');
    }
  };

  const handleLike = (id) => {
    const review = userReviews.find(r => r.id === id);
    if (review) {
      review.likes++;
      setSelectedReview({ ...review });
    }
  };

  const handleDislike = (id) => {
    const review = userReviews.find(r => r.id === id);
    if (review) {
      review.dislikes++;
      setSelectedReview({ ...review });
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#f1f1f1ff', '#e0dde2ff']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading your adventure...</Text>
      </LinearGradient>
    );
  }

  return (
<View style={styles.appBackground}>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Header Section */}
        <View style={styles.topContainer}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logoSmall} />
          </View>
          <TouchableOpacity 
            onPress={handleWeatherPress} 
            style={styles.weatherPreview}
            activeOpacity={0.8}
          >
            <View style={styles.weatherContent}>
              <Text style={styles.weatherIcon}>☀️</Text>
              <Text style={styles.weatherText}>27°C</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.title}>
            Welcome back, {user?.name && user.name.trim() !== '' ? user.name : 'Explorer'}! 
          </Text>
          <Text style={styles.subtitle}>
            Ready for your next adventure? Discover amazing destinations and plan your perfect trip with personalized recommendations.
          </Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity 
          style={styles.ctaButton} 
          onPress={handleDiaryPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6d6ca8ff', '#6d6ca8ff#']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.ctaButtonText}> Start Your Journey</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Destinations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}> Trending Destinations</Text>
            <Text style={styles.sectionSubtitle}>Handpicked just for you</Text>
          </View>
          
          <FlatList
            ref={flatListRef}
            horizontal
            data={recommendations}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedDestination(item)}
                style={styles.destinationCard}
                activeOpacity={0.9}
              >
                <Image source={item.image} style={styles.destinationImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(214, 205, 205, 0.8)']}
                  style={styles.destinationOverlay}
                >
                  <Text style={styles.destinationTitle}>{item.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={true}
            contentContainerStyle={styles.destinationsList}
          />
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}> Traveler Stories</Text>
            <Text style={styles.sectionSubtitle}>Real experiences from real travelers</Text>
          </View>
          
          {userReviews.map(review => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Image 
                  source={{ uri: `https://i.pravatar.cc/150?u=${review.id}` }} 
                  style={styles.avatar} 
                />
                <View style={styles.reviewerInfo}>
                  <Text style={styles.reviewerName}>{review.name}</Text>
                  <Text style={styles.reviewDate}>2 days ago</Text>
                </View>
              </View>
              
              <Text style={styles.tripText}>{review.tripText}</Text>
              
              <View style={styles.reviewActions}>
                <TouchableOpacity 
                  onPress={() => handleLike(review.id)}
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionIcon}>👍</Text>
                  <Text style={styles.actionCount}>{review.likes}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => handleDislike(review.id)}
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionIcon}>👎</Text>
                  <Text style={styles.actionCount}>{review.dislikes}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => setSelectedReview(review)} 
                  style={styles.replyButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.replyText}>💬 Reply</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Modals */}
        <Modal
          visible={!!selectedDestination}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedDestination(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedDestination?.title}</Text>
              <Text style={styles.modalDescription}>{selectedDestination?.description}</Text>
              <TouchableOpacity 
  onPress={() => setSelectedDestination(null)} 
  style={styles.modalCloseButton}
  activeOpacity={0.8}
>
  <Text style={styles.modalCloseButtonText}>Close</Text>
</TouchableOpacity>

            </View>
          </View>
        </Modal>

        <Modal
          visible={!!selectedReview}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedReview(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Reply to {selectedReview?.name}</Text>
              <Text style={styles.modalDescription}>What did you think of their travel experience?</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => handleLike(selectedReview?.id)}
                  style={styles.modalActionButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalActionIcon}>👍</Text>
                  <Text style={styles.modalActionText}>Helpful</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleDislike(selectedReview?.id)}
                  style={styles.modalActionButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalActionIcon}>👎</Text>
                  <Text style={styles.modalActionText}>Not helpful</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                onPress={() => setSelectedReview(null)} 
                style={styles.modalButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  appBackground: {
  flex: 1,
  backgroundColor: '#ffffff',
}
,
  topContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 50,
    marginBottom: 30,
  },
  logoContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  logoSmall: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  weatherPreview: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backdropFilter: 'blur(10px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  weatherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherIcon: {
    fontSize: 20,
  },
  weatherText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  welcomeSection: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 25,
    padding: 25,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#2d3748',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#718096',
    lineHeight: 24,
  },
  ctaButton: {
    marginBottom: 30,
    borderRadius: 25,
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
 ctaButton: {
  backgroundColor: '#007AFF', // light gray button background
  paddingVertical: 14,
  paddingHorizontal: 30,
  borderRadius: 25,
  alignItems: 'center',
  marginBottom: 30,

  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 6,
},
ctaButtonText: {
  color: '#ffffffff', // your specified subtle gray
  fontSize: 20,
  fontWeight: 'bold',
},

  section: {
    marginBottom: 35,
  },
  sectionHeader: {
    marginBottom: 20,
  },
 sectionTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#4a4a4a', // previously #ffffff
  marginBottom: 5,
},
sectionSubtitle: {
  fontSize: 14,
  color: '#7f8c8d', // subtle gray
},

  destinationsList: {
    paddingLeft: 5,
  },
  destinationCard: {
    marginRight: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  destinationImage: {
    width: screenWidth * 0.75,
    height: 200,
    resizeMode: 'cover',
  },
  destinationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    padding: 20,
  },
  destinationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#a0aec0',
  },
  tripText: {
    fontSize: 15,
    color: '#4a5568',
    lineHeight: 22,
    marginBottom: 15,
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    gap: 5,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  replyButton: {
    marginLeft: 'auto',
    backgroundColor: '#667eea',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  replyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 25,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2d3748',
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 25,
  },
  modalActionButton: {
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    minWidth: 80,
  },
  modalActionIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  modalActionText: {
    fontSize: 12,
    color: '#4a5568',
    fontWeight: '600',
  },
  modalButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseButton: {
  backgroundColor: '#007AFF',
  paddingVertical: 12,
  paddingHorizontal: 30,
  borderRadius: 20,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 5,
  marginTop: 10,
},
modalCloseButtonText: {
  color: '#ffffff',
  fontSize: 16,
  fontWeight: 'bold',
}

});