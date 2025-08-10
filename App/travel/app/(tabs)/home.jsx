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
import { FontAwesome } from '@expo/vector-icons';
const screenWidth = Dimensions.get('window').width;

// Enhanced cities array with more details
const cities = [
  { id: '1', name: 'Phuket', slug: 'phuket', flight: 'PG123', image: require('../../assets/images/phuket.jpg'), description: 'Explore beaches, temples, and nightlife.', hotel: 'Phuket Grand Hotel', price: 1400 },
  { id: '2', name: 'Paris', slug: 'paris', flight: 'AF123', image: require('../../assets/images/paris.png'), description: 'Romantic streets, Eiffel Tower, fine dining.', hotel: 'Hotel Parisienne', price: 1800 },
  { id: '3', name: 'Dubai', slug: 'dubai', flight: 'EK654', image: require('../../assets/images/dubai.png'), description: 'Luxury shopping, Burj Khalifa, desert adventures.', hotel: 'Dubai Luxury Suites', price: 2100 },
  { id: '4', name: 'London', slug: 'london', flight: 'BA890', image: require('../../assets/images/london.png'), description: 'Historic sites, Big Ben, cozy pubs.', hotel: 'The London Palace', price: 1900 },
  { id: '5', name: 'Turkey', slug: 'turkey', flight: 'TK101', image: require('../../assets/images/turkey.png'), description: 'Markets, rich culture, hot air balloons.', hotel: 'Istanbul Grand Hotel', price: 1600 },
  { id: '6', name: 'Amsterdam', slug: 'amsterdam', flight: 'KL202', image: require('../../assets/images/amsterdam.png'), description: 'Canals, bikes, vibrant neighborhoods.', hotel: 'Amsterdam Central Hotel', price: 1700 },
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
  const [currentWeather, setCurrentWeather] = useState({ temp: 28 });

  // *** משתני State חדשים לנתוני ההזמנה ***
  const [departureCity, setDepartureCity] = useState('68022f445f7300b11f986829'); // ברירת מחדל - תל אביב
  const [selectedAttractions, setSelectedAttractions] = useState(['6807610adc218773e065223d']); // רשימת אטרקציות
  const [selectedTransportation, setSelectedTransportation] = useState('Public Transport'); // תחבורה ציבורית
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('PayPal'); // אמצעי תשלום

  const flatListRef = useRef();
// *** פונקציה לקבלת מזהה עיר יציאה בהתבסס על העיר הנבחרת ***
const getDepartureCityId = (destinationCity) => {
  const cityMappings = {
    'phuket': '68022f445f7300b11f986829',
    'paris': '68022f445f7300b11f986829',
    'dubai': '68022f445f7300b11f986829',
    'london': '68022f445f7300b11f986829',
    'turkey': '68022f445f7300b11f986829',
    'amsterdam': '68022f445f7300b11f986829',
    'rome': '68022f445f7300b11f986829',
    'barcelona': '68022f445f7300b11f986829',
    'berlin': '68022f445f7300b11f986829',
    'tokyo': '68022f445f7300b11f986829',
    'new york': '68022f445f7300b11f986829',
    'los angeles': '68022f445f7300b11f986829',
    'san francisco': '68022f445f7300b11f986829',
    'madrid': '68022f445f7300b11f986829',
    'seoul': '68022f445f7300b11f986829'
  };

  const citySlug = destinationCity?.slug || destinationCity?.name?.toLowerCase();
  return cityMappings[citySlug] || '68022f445f7300b11f986829';
};

// *** פונקציה לקבלת מזהה יעד בהתבסס על העיר הנבחרת ***
const getDestinationCityId = (destinationCity) => {
  const cityMappings = {
    'phuket': '68022f445f7300b11f986837',
    'paris': '68075dd4f110a359e23cd001',
    'london': '68075dd4f110a359e23cd002',
    'amsterdam': '68075dd4f110a359e23cd003',
    'rome': '68075dd4f110a359e23cd004',
    'barcelona': '68075dd4f110a359e23cd005',
    'berlin': '68075dd4f110a359e23cd006',
    'tokyo': '68075dd4f110a359e23cd007',
    'dubai': '686cd9cd523d724c4a6db66f',
    'new york': '686cdae6523d724c4a6db672',
    'los angeles': '686cdb31523d724c4a6db675',
    'san francisco': '686cdbe3523d724c4a6db676',
    'madrid': '686cdc13523d724c4a6db677',
    'seoul': '686cdc4a523d724c4a6db67a',
    'turkey': '6891f49ef511eb0daf23b8f8'
  };

  const citySlug = destinationCity?.slug || destinationCity?.name?.toLowerCase();
  return cityMappings[citySlug] || '68022f445f7300b11f986837';
};

// *** פונקציה לקבלת מזהה טיסה בהתבסס על העיר ***
const getFlightId = (destinationCity) => {
  const flightMappings = {
    'phuket': '68075f88dc218773e0652238',      // לאמסטרדם בטעות? אם יש מזהה אמיתי לפוקט שימי אותו כאן
    'paris': '68075f88dc218773e0652231',
    'london': '68075f88dc218773e0652230',
    'amsterdam': '68075f88dc218773e0652238',
    'rome': '68075f88dc218773e0652233',
    'barcelona': '68075f88dc218773e0652236',
    'berlin': '68075f88dc218773e0652235',
    'tokyo': '68075f88dc218773e0652232',
    'dubai': '68075f88dc218773e0652237',
    'new york': '68075f88dc218773e0652231',
    'los angeles': '68075f88dc218773e0652234',
    'san francisco': '68075f88dc218773e0652239',
    'madrid': '68075f88dc218773e065223a',
    'seoul': '68075f88dc218773e065223b',
    'turkey': '6891f45cf511eb0daf23b8f5'
  };

  const citySlug = destinationCity?.slug || destinationCity?.name?.toLowerCase();
  return flightMappings[citySlug] || '68075f88dc218773e0652238';
};

  // *** פונקציה לקבלת מזהה מלון בהתבסס על העיר ***
  const getHotelId = (destinationCity) => {
    // שימוש באותו מזהה של העיר כמזהה מלון (כפי שמוצג בדוגמה שלך)
    return getDestinationCityId(destinationCity);
  };

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
      navigation.navigate('RealChat');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not navigate to diary screen.');
    }
  };
  const handleRealChatPress = () => {
    try {
      console.log('RealChat button pressed');
      navigation.navigate('RealChat');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not navigate to RealChat screen.');
    }
  };

  // הפונקציה החדשה לטיפול בלחיצה על אייקון המטבע
  const handleCurrencyPress = () => {
    try {
      console.log('Currency converter pressed');
      navigation.navigate('calculator');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not navigate to currency converter.');
    }
  };

  const handleCityPress = (city) => {
    console.log('🏙️ City selected:', city);
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

  // *** הפונקציה המשופרת לטיפול בתשלום מוצלח ***
  const handlePaymentSuccess = async () => {
    setPaymentCompleted(true);
    setShowPaymentModal(false);

    console.log('🏁 Starting order creation process...');
    console.log('📍 Selected destination:', selectedDestination);

    // בנה את נתוני ההזמנה עם מזהים נכונים
 const selectedHotel = hotelsList.find(h => h._id === getHotelId(selectedDestination));

    const orderData = {
      departureCityId: getDepartureCityId(selectedDestination),
      departureCityName: selectedDestination?.name || selectedDestination?.slug || '',

      destinationCityId: getDestinationCityId(selectedDestination),
      destinationCityName: selectedDestination?.name || selectedDestination?.slug || '',

      flightId: getFlightId(selectedDestination),
      flightName: selectedDestination?.name ? `${selectedDestination.name} Flight` : '',

      hotelId: selectedHotel?._id || '',
      hotelName: selectedHotel?.name || '',

      attractions: selectedAttractions || [],
      transportation: selectedTransportation,
      paymentMethod: selectedPaymentMethod,
      totalPrice: parseInt(selectedDestination?.price) || 0
    };

    console.log('📋 Order data prepared:', JSON.stringify(orderData, null, 2));
    console.log('💰 Price selected by user:', orderData.totalPrice);

    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔐 Token found, sending request...');

      const response = await fetch('https://pathmakers-web-app-app-travel.onrender.com/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      console.log('📡 Response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ Server error:', errorData);
        throw new Error(errorData?.message || `Server error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('✅ Order saved on server:', responseData);
      
      Alert.alert(
        '🎉 Success!', 
        `Your trip to ${selectedDestination.name} has been booked successfully!\n\nOrder ID: ${responseData._id}`,
        [ 
          {
            text: 'View My Orders',
            onPress: () => navigation.navigate('(tabs)', { screen: 'profile' }),
          },
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Error saving order:', error);
      console.error('📍 Error stack:', error.stack);
      
      Alert.alert(
        '⚠️ Warning', 
        `Trip booked locally but failed to save to server.\nError: ${error.message}`,
        [
          {
            text: 'Retry',
            onPress: () => handlePaymentSuccess() // נסה שוב
          },
          {
            text: 'Continue Anyway',
            style: 'default'
          }
        ]
      );
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
          
          {/* Weather Icon/Button */}
          <TouchableOpacity onPress={handleWeatherPress} style={styles.weatherPreview} activeOpacity={0.8}>
            <View style={styles.weatherContent}>
              <Text style={styles.weatherIcon}>☀️</Text>
              <Text style={styles.weatherText}>{Math.round(currentWeather.temp)}°C</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Currency Icon/Button - moved below weather button for better design */}
          <View style={{ alignItems: 'flex-end', marginBottom: 15, transform: [{ translateY: -30 }] }}>
          <TouchableOpacity 
            onPress={handleCurrencyPress} 
            style={styles.currencyIcon} 
            activeOpacity={0.8}
          >
            <LinearGradient 
              colors={['#FFD700', '#FFA500']} 
              style={styles.currencyIconGradient}
            >
               <FontAwesome name="dollar" size={24} color="#fff" />
            </LinearGradient>
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
          <Text style={styles.ctaButtonText}> Start Your Journey</Text>
        </TouchableOpacity>

        {/* Enhanced Destinations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}> Book Your Next Trip</Text>
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
            <Text style={styles.sectionTitle}> Traveler Stories</Text>
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

        {/* כאן נוסיף שעת טיסה הלוך וחזור קבועה */}
        <Text style={styles.modalDescription}>Departure Time: 06:00 AM</Text>
        <Text style={styles.modalDescription}>Return Time: 05:00 PM</Text>

        {/* תאריכים קבועים */}
        <Text style={styles.modalDescription}>Dates: 13/3 - 18/3</Text>

        {/* הצגת שם המלון */}
        <Text style={styles.modalDescription}>Hotel: {selectedDestination.hotel}</Text>

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

        {/* Bottom Support Button */}
        <View style={styles.bottomButtonsContainer}>
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
    alignItems: 'center',
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
  // עיצוב אייקון המטבע החדש
  currencyIcon: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  currencyIconGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
  bookButton: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  bookButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 18,
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
  successIcon: {
    fontSize: 60,
    marginBottom: 20,
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
  },
});