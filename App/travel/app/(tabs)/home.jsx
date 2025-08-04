import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

// Enhanced cities array with more details
const cities = [
  { id: '1', name: 'Phuket', slug: 'phuket', flight: 'PG123', image: require('../../assets/images/phuket.jpg'), description: 'Explore beaches, temples, and nightlife.', price: 1400 },
  { id: '2', name: 'Paris', slug: 'paris', flight: 'AF123', image: require('../../assets/images/paris.png'), description: 'Romantic streets, Eiffel Tower, fine dining.', price: 1800 },
  { id: '3', name: 'Dubai', slug: 'dubai', flight: 'EK654', image: require('../../assets/images/dubai.png'), description: 'Luxury shopping, Burj Khalifa, desert adventures.', price: 2100 },
  { id: '4', name: 'London', slug: 'london', flight: 'BA890', image: require('../../assets/images/london.png'), description: 'Historic sites, Big Ben, cozy pubs.', price: 1900 },
  { id: '5', name: 'Turkey', slug: 'turkey', flight: 'TK101', image: require('../../assets/images/turkey.png'), description: 'Markets, rich culture, hot air balloons.', price: 1600 },
  { id: '6', name: 'Amsterdam', slug: 'amsterdam', flight: 'KL202', image: require('../../assets/images/amsterdam.png'), description: 'Canals, bikes, vibrant neighborhoods.', price: 1700 },
];

const CARDS_PER_PAGE = 6;
const AUTO_ROTATE_SECONDS = 10;

const userReviews = [
  { id: '1', name: 'Noa Levi', likes: 3, dislikes: 0, tripText: 'Just returned from an amazing week in Phuket! The beaches were absolutely stunning and the local food scene exceeded all expectations. Would definitely go back!' },
  { id: '2', name: 'Ori Cohen', likes: 5, dislikes: 1, tripText: 'Paris in spring is magical! Spent 5 days exploring museums, cafes, and hidden neighborhoods. The Eiffel Tower at sunset is a must-see experience.' },
  { id: '3', name: 'Yasmin Alon', likes: 8, dislikes: 2, tripText: 'Dubai was incredible - from the towering Burj Khalifa to the traditional souks. Perfect blend of modern luxury and cultural heritage. Shopping was amazing!' },
  { id: '4', name: 'Tal Bar', likes: 4, dislikes: 0, tripText: 'London has my heart! Cozy pubs, fascinating history, and friendly locals. The rainy weather just added to the authentic British experience.' },
];

// Payment Modal Component
const PaymentModal = ({ visible, onClose, selectedCity, onPaymentSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = () => {
    // Simple validation
    if (!fullName.trim() || fullName.trim().length < 3) {
      setError('Please enter a valid full name (at least 3 characters)');
      return;
    }
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setError('Please enter a valid 16-digit card number');
      return;
    }
    if (!expiryDate.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
      setError('Please enter expiry date in MM/YY format');
      return;
    }
    if (cvv.length !== 3) {
      setError('Please enter a valid 3-digit CVV');
      return;
    }

    setError('');
    setPaymentSuccess(true);

    setTimeout(() => {
      setPaymentSuccess(false);
      onPaymentSuccess();

      // Reset form
      setFullName('');
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setError('');
    }, 2000);
  };

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\s/g, '').replace(/\D/g, '');
    const match = cleaned.match(/(\d{0,4})(\d{0,4})(\d{0,4})(\d{0,4})/);
    if (match) {
      return [match[1], match[2], match[3], match[4]].filter(Boolean).join(' ');
    }
    return cleaned;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.paymentModalContent}>
          {paymentSuccess ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successTitle}>Payment Successful!</Text>
              <Text style={styles.successText}>
                Your payment of ${selectedCity?.price} has been processed.
              </Text>
              <Text style={styles.successSubtext}>✅ Your trip is now confirmed!</Text>
            </View>
          ) : (
            <>
              <Text style={styles.paymentTitle}>Complete Your Booking</Text>
              <Text style={styles.paymentSubtitle}>
                {selectedCity?.name} - ${selectedCity?.price}
              </Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <Text
                  style={styles.textInput}
                  onPress={() => {
                    Alert.prompt('Full Name', 'Enter your full name', setFullName);
                  }}
                >
                  {fullName || 'Tap to enter full name'}
                </Text>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Card Number</Text>
                <Text
                  style={styles.textInput}
                  onPress={() => {
                    Alert.prompt('Card Number', 'Enter 16-digit card number', (text) => {
                      setCardNumber(formatCardNumber(text));
                    });
                  }}
                >
                  {cardNumber || '**** **** **** ****'}
                </Text>
              </View>
              <View style={styles.rowContainer}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>Expiry</Text>
                  <Text
                    style={styles.textInput}
                    onPress={() => {
                      Alert.prompt('Expiry Date', 'Enter MM/YY', setExpiryDate);
                    }}
                  >
                    {expiryDate || 'MM/YY'}
                  </Text>
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <Text
                    style={styles.textInput}
                    onPress={() => {
                      Alert.prompt('CVV', 'Enter 3-digit CVV', setCvv);
                    }}
                  >
                    {cvv || '***'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.payButton} onPress={handlePayment} activeOpacity={0.8}>
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.payButtonGradient}>
                  <Text style={styles.payButtonText}>Pay ${selectedCity?.price}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showIntroPopup, setShowIntroPopup] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
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

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((prevIndex) => (prevIndex + CARDS_PER_PAGE) % cities.length);
    }, AUTO_ROTATE_SECONDS * 1000);
    return () => clearInterval(interval);
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

  const handleCityPress = (city) => {
    setSelectedDestination(city);
    setPaymentCompleted(false);
    setShowPaymentModal(false);
    setShowIntroPopup(true);
  };

  const handleLike = (id) => {
    const review = userReviews.find((r) => r.id === id);
    if (review) {
      review.likes++;
      setSelectedReview({ ...review });
    }
  };

  const handleDislike = (id) => {
    const review = userReviews.find((r) => r.id === id);
    if (review) {
      review.dislikes++;
      setSelectedReview({ ...review });
    }
  };

  const handlePaymentSuccess = async () => {
    setPaymentCompleted(true);
    setShowPaymentModal(false);
    try {
      // Example API call - uncomment and modify as needed
      /*
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://your-api.com/api/order', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          departureCityId: 'ben-gurion',
          destinationCityId: selectedDestination.slug,
          flightId: selectedDestination.flight,
          totalPrice: selectedDestination.price,
          tripDate: '2026-03-15',
        }),
      });
      */
      Alert.alert('Success!', 'Your trip has been booked successfully!');
    } catch (error) {
      console.error('Error saving order:', error);
      Alert.alert('Warning', 'Trip booked but failed to save to server.');
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

  // Get visible cities for carousel
  const visibleCities = [...cities, ...cities.slice(0, CARDS_PER_PAGE)].slice(carouselIndex, carouselIndex + CARDS_PER_PAGE);

  return (
    <View style={styles.appBackground}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Header Section */}
        <View style={styles.topContainer}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logoSmall} />
          </View>
          <TouchableOpacity onPress={handleWeatherPress} style={styles.weatherPreview} activeOpacity={0.8}>
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
        <TouchableOpacity style={styles.ctaButton} onPress={handleDiaryPress} activeOpacity={0.8}>
          <Text style={styles.ctaButtonText}>🚀 Start Your Journey</Text>
        </TouchableOpacity>

        {/* Enhanced Destinations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✈️ Book Your Next Trip</Text>
            <Text style={styles.sectionSubtitle}>Handpicked destinations with instant booking</Text>
          </View>
          <FlatList
            ref={flatListRef}
            horizontal
            data={visibleCities}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleCityPress(item)} style={styles.destinationCard} activeOpacity={0.9}>
                <Image source={item.image} style={styles.destinationImage} />
                <LinearGradient colors={['transparent', 'rgba(0, 0, 0, 0.8)']} style={styles.destinationOverlay}>
                  <Text style={styles.destinationTitle}>{item.name}</Text>
                  <Text style={styles.destinationPrice}>From ${item.price}</Text>
                  <Text style={styles.destinationFlight}>✈️ {item.flight}</Text>
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
            <Text style={styles.sectionTitle}>💬 Traveler Stories</Text>
            <Text style={styles.sectionSubtitle}>Real experiences from real travelers</Text>
          </View>
          {userReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Image source={{ uri: `https://i.pravatar.cc/150?u=${review.id}` }} style={styles.avatar} />
                <View style={styles.reviewerInfo}>
                  <Text style={styles.reviewerName}>{review.name}</Text>
                  <Text style={styles.reviewDate}>2 days ago</Text>
                </View>
              </View>
              <Text style={styles.tripText}>{review.tripText}</Text>
              <View style={styles.reviewActions}>
                <TouchableOpacity onPress={() => handleLike(review.id)} style={styles.actionButton} activeOpacity={0.7}>
                  <Text style={styles.actionIcon}>👍</Text>
                  <Text style={styles.actionCount}>{review.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDislike(review.id)} style={styles.actionButton} activeOpacity={0.7}>
                  <Text style={styles.actionIcon}>👎</Text>
                  <Text style={styles.actionCount}>{review.dislikes}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedReview(review)} style={styles.replyButton} activeOpacity={0.7}>
                  <Text style={styles.replyText}>💬 Reply</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Intro Popup Modal */}
        {selectedDestination && showIntroPopup && (
          <Modal visible={showIntroPopup} transparent animationType="slide" onRequestClose={() => setShowIntroPopup(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.modalCloseX}
                  onPress={() => {
                    setShowIntroPopup(false);
                    setSelectedDestination(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseXText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>🎯 You've Selected {selectedDestination.name}!</Text>
                <Text style={styles.modalDescription}>
                  ✈️ Awesome! You're about to see your trip details to {selectedDestination.name}. This includes flight number, departure info, and trip dates.
                </Text>
                <Text style={styles.modalDescription}>Click Continue to review and proceed to payment.</Text>
                <Text style={styles.priceHighlight}>Price: ${selectedDestination.price} per person</Text>
                <TouchableOpacity style={styles.continueButton} onPress={() => setShowIntroPopup(false)} activeOpacity={0.8}>
                  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.continueButtonGradient}>
                    <Text style={styles.continueButtonText}>Continue</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Trip Details Modal */}
        {selectedDestination && !paymentCompleted && !showPaymentModal && !showIntroPopup && (
          <Modal visible={!!selectedDestination} transparent animationType="slide" onRequestClose={() => setSelectedDestination(null)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.modalCloseX}
                  onPress={() => setSelectedDestination(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseXText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{selectedDestination.name} - Trip Details</Text>
                <Text style={styles.modalDescription}>Flight: {selectedDestination.flight}</Text>
                <Text style={styles.modalDescription}>Price: ${selectedDestination.price}</Text>
                <Text style={styles.modalDescription}>
                  Description: {selectedDestination.description}
                </Text>
                <TouchableOpacity style={styles.bookButton} onPress={() => setShowPaymentModal(true)} activeOpacity={0.8}>
                  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.bookButtonGradient}>
                    <Text style={styles.bookButtonText}>Book Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Payment Modal */}
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          selectedCity={selectedDestination}
          onPaymentSuccess={handlePaymentSuccess}
        />

        {/* ** ======= הכפתורים החדשים בתחתית ======= ** */}
        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity
            style={styles.bottomButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('calculator')}
          >
            <Text style={styles.bottomButtonText}>💱 Currency Converter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Support')}
          >
            <Text style={styles.bottomButtonText}>🌐 Support</Text>
          </TouchableOpacity>
        </View>
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
  bottomButtonsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  paddingVertical: 15,
  paddingHorizontal: 20,
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#ddd',
  marginTop: 40,
},

bottomButton: {
  backgroundColor: '#667eea',
  paddingVertical: 12,
  paddingHorizontal: 25,
  borderRadius: 25,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 3,
},

bottomButtonText: {
  color: 'white',
  fontWeight: '600',
  fontSize: 16,
},
  appBackground: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
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
    backgroundColor: '#007AFF',
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
    color: '#ffffff',
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
    color: '#4a4a4a',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
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
    height: 100,
    justifyContent: 'flex-end',
    padding: 20,
  },
  destinationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  destinationPrice: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 2,
  },
  destinationFlight: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
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
  modalCloseX: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalCloseXText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2d3748',
    textAlign: 'center',
    marginTop: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  priceHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 20,
    textAlign: 'center',
  },
  continueButton: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  continueButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalImageWrapper: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalCityImage: {
    width: 250,
    height: 150,
    resizeMode: 'cover',
  },
  tripDetails: {
    width: '100%',
    marginBottom: 25,
  },
  tripDetailItem: {
    fontSize: 16,
    marginBottom: 8,
    paddingVertical: 4,
  },
  tripDetailLabel: {
    fontWeight: 'bold',
    color: '#2d3748',
  },
  payNowButton: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  payNowButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  payNowButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  successDetails: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 15,
  },
  successDetailItem: {
    fontSize: 16,
    marginBottom: 8,
    color: '#2d3748',
  },
  successMessage: {
    fontSize: 16,
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 25,
    fontWeight: '600',
  },
  closeSuccessButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  closeSuccessButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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
  // Payment Modal Styles
  paymentModalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 25,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  paymentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2d3748',
    textAlign: 'center',
  },
  paymentSubtitle: {
    fontSize: 18,
    color: '#667eea',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
    backgroundColor: '#fed7d7',
    padding: 10,
    borderRadius: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f7fafc',
    color: '#2d3748',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
  },
  payButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f7fafc',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#4a5568',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 15,
    textAlign: 'center',
  },
  successText: {
    fontSize: 18,
    color: '#2d3748',
    marginBottom: 10,
    textAlign: 'center',
  },
    successSubtext: {
      fontSize: 16,
      color: '#28a745',
      textAlign: 'center',
      fontWeight: '600',
    }
  });