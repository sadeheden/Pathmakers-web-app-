import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
   TextInput, 
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
  { id: '1', name: 'Phuket', slug: 'phuket', flight: 'Thai Airways', image: require('../../assets/images/phuket.jpg'), description: 'Explore beaches, temples, and nightlife.', hotel: 'Banyan Tree Phuket', price: 1400 },
  { id: '2', name: 'Paris', slug: 'paris', flight: 'Air France', image: require('../../assets/images/paris.png'), description: 'Romantic streets, Eiffel Tower, fine dining.', hotel: 'Shangri-La Hotel Paris', price: 1800 },
  { id: '3', name: 'Dubai', slug: 'dubai', flight: 'Air France', image: require('../../assets/images/dubai.png'), description: 'Luxury shopping, Burj Khalifa, desert adventures.', hotel: 'Jumeirah Beach Hotel', price: 2100 },
  { id: '4', name: 'London', slug: 'london', flight: 'Lufthansa', image: require('../../assets/images/london.png'), description: 'Historic sites, Big Ben, cozy pubs.', hotel: 'The Langham, London', price: 1900 },
  { id: '5', name: 'Turkey', slug: 'turkey', flight: 'Turkish Airlines', image: require('../../assets/images/turkey.png'), description: 'Markets, rich culture, hot air balloons.', hotel: 'Antalya Beach Resort', price: 1600 },
  { id: '6', name: 'Amsterdam', slug: 'amsterdam', flight: 'Delta Airlines', image: require('../../assets/images/amsterdam.png'), description: 'Canals, bikes, vibrant neighborhoods.', hotel: 'Hotel Okura Amsterdam', price: 1700 },
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
  <TextInput
    value={fullName}
    onChangeText={setFullName}
    placeholder="John Doe"
    style={styles.textInput}
    autoCapitalize="words"
    returnKeyType="done"
  />
</View>

<View style={styles.inputContainer}>
  <Text style={styles.inputLabel}>Card Number</Text>
  <TextInput
    value={cardNumber}
    onChangeText={(t) => setCardNumber(formatCardNumber(t))}
    placeholder="1234 5678 9012 3456"
    style={styles.textInput}
    keyboardType="number-pad"
    maxLength={19}
    returnKeyType="done"
  />
</View>

<View style={styles.rowContainer}>
  <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
    <Text style={styles.inputLabel}>Expiry</Text>
    <TextInput
      value={expiryDate}
      onChangeText={(t) => {
        // Allow MM/YY or MM/YYYY
        const digits = t.replace(/[^\d]/g, '');
        const mm = digits.slice(0, 2);
        const year = digits.length > 4 ? digits.slice(2, 6) : digits.slice(2, 4);
        setExpiryDate(year ? `${mm}/${year}` : mm);
      }}
      placeholder="MM/YY or MM/YYYY"
      style={styles.textInput}
      keyboardType="number-pad"
      maxLength={7}
      returnKeyType="done"
    />
  </View>

  <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
    <Text style={styles.inputLabel}>CVV</Text>
    <TextInput
      value={cvv}
      onChangeText={setCvv}
      placeholder="123"
      style={styles.textInput}
      keyboardType="number-pad"
      maxLength={3}
      secureTextEntry
      returnKeyType="done"
    />
  </View>
</View>
              <TouchableOpacity style={styles.payButton} onPress={handlePayment} activeOpacity={0.8}>
               <LinearGradient colors={['#007AFF', '#764ba2']} style={styles.payButtonGradient}>
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
const [reviews, setReviews] = useState(userReviews); // local, mutable list
const [userVotes, setUserVotes] = useState({});      // { [reviewId]: 'like' | 'dislike' }
const [bookingOpen, setBookingOpen] = useState(false);

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
  navigation.navigate('Pay', { city });
};



  const handleLike = (id) => {
  // if already voted, block further changes
  if (userVotes[id]) return;

  setReviews((prev) =>
    prev.map((r) => (r.id === id ? { ...r, likes: r.likes + 1 } : r))
  );
  setUserVotes((prev) => ({ ...prev, [id]: 'like' }));
};

const handleDislike = (id) => {
  if (userVotes[id]) return;

  setReviews((prev) =>
    prev.map((r) => (r.id === id ? { ...r, dislikes: r.dislikes + 1 } : r))
  );
  setUserVotes((prev) => ({ ...prev, [id]: 'dislike' }));
};


  // *** הפונקציה המשופרת לטיפול בתשלום מוצלח ***
  const handlePaymentSuccess = async () => {
    setPaymentCompleted(true);
    setShowPaymentModal(false);

    console.log('🏁 Starting order creation process...');
    console.log('📍 Selected destination:', selectedDestination);

    // בנה את נתוני ההזמנה עם מזהים נכונים
 const selectedHotel = Array.isArray(global?.hotelsList)
  ? global.hotelsList.find(h => h._id === getHotelId(selectedDestination))
  : null; // or pass hotelsList in via props/context and use that
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
        {reviews.map((review) => {
  const voted = userVotes[review.id]; // undefined | 'like' | 'dislike'
  const likeDisabled = !!voted;
  const dislikeDisabled = !!voted;

  return (
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
        <TouchableOpacity
          onPress={() => handleLike(review.id)}
          style={[
            styles.actionButton,
            voted === 'like' && { opacity: 1 },
            voted && voted !== 'like' && { opacity: 0.4 },
          ]}
          activeOpacity={voted ? 1 : 0.7}
          disabled={likeDisabled}
        >
          <Text style={styles.actionIcon}>👍</Text>
          <Text style={styles.actionCount}>{review.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDislike(review.id)}
          style={[
            styles.actionButton,
            voted === 'dislike' && { opacity: 1 },
            voted && voted !== 'dislike' && { opacity: 0.4 },
          ]}
          activeOpacity={voted ? 1 : 0.7}
          disabled={dislikeDisabled}
        >
          <Text style={styles.actionIcon}>👎</Text>
          <Text style={styles.actionCount}>{review.dislikes}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
})}
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
          <LinearGradient colors={['#007AFF', '#007AFF']} style={styles.bookButtonGradient}>
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

       
          </ScrollView>

      {/* Floating Calculator Button (bottom-left, above tab bar) */}
      <TouchableOpacity
        onPress={handleCurrencyPress}
        activeOpacity={0.9}
        style={styles.floatingCalcButton}
        accessibilityRole="button"
        accessibilityLabel="Open currency calculator"
      >
        <LinearGradient
          colors={['#FFD700', '#FFA500']}
          style={styles.floatingCalcGradient}
        >
          <FontAwesome name="dollar" size={25} color="#fff" />

        </LinearGradient>
      </TouchableOpacity>

    </View>
  );
}
// ===== Bottom Sheet Booking Flow =====
const BookingSheet = ({
  visible,
  city,
  price,
  onClose,
  onConfirm, // async -> returns {ok:boolean, message?:string, orderId?:string}
}) => {
 const [step, setStep] = useState('details');
  const [fullName, setFullName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const translateY = useRef(new Animated.Value(600)).current; // slide up

  useEffect(() => {
    if (visible) {
      setStep('details');
      setError('');
      setFullName('');
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 600,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const formatCard = (text) => {
    const cleaned = text.replace(/\s/g, '').replace(/\D/g, '');
    const parts = cleaned.match(/.{1,4}/g) || [];
    return parts.join(' ').slice(0, 19);
  };

  const validatePayment = () => {
    if (!fullName.trim() || fullName.trim().length < 3) return 'Enter your full name (min 3 chars).';
    if (cardNumber.replace(/\s/g, '').length !== 16) return 'Card number must be 16 digits.';
   if (!/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/.test(expiryDate)) return 'Expiry must be MM/YY or MM/YYYY.';
    if (cvv.length !== 3 || !/^\d{3}$/.test(cvv)) return 'CVV must be 3 digits.';
    return '';
  };

  const handlePay = async () => {
    const v = validatePayment();
    if (v) { setError(v); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await onConfirm({
        fullName,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expiryDate,
        cvv,
      });
      if (res?.ok) {
        setStep('success');
      } else {
        setError(res?.message || 'Payment failed. Please try again.');
      }
    } catch (e) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={sheetStyles.backdrop}>
      {/* tap outside to close */}
      <TouchableOpacity style={sheetStyles.backdropTap} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY }] }]}>
        {/* Grabber */}
        <View style={sheetStyles.grabber} />

        {/* Header */}
        <View style={sheetStyles.headerRow}>
          <Text style={sheetStyles.sheetTitle}>
            {step === 'details' && `Your trip to ${city?.name}`}
            {step === 'payment' && 'Payment'}
            {step === 'success' && 'All set!'}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={sheetStyles.closeX}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Step: Details */}
        {step === 'details' && (
          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Banner */}
            <View style={sheetStyles.banner}>
              <Image source={city?.image} style={sheetStyles.bannerImg} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={sheetStyles.bannerOverlay} />
              <View style={sheetStyles.bannerTextWrap}>
                <Text style={sheetStyles.bannerTitle}>{city?.name}</Text>
                <Text style={sheetStyles.bannerSubtitle}>From ${price}</Text>
              </View>
            </View>

            {/* Details grid */}
            <View style={sheetStyles.grid}>
              <View style={sheetStyles.gridItem}>
                <Text style={sheetStyles.gridLabel}>Flight</Text>
                <Text style={sheetStyles.gridValue}>✈️ {city?.flight}</Text>
              </View>
              <View style={sheetStyles.gridItem}>
                <Text style={sheetStyles.gridLabel}>Dates</Text>
                <Text style={sheetStyles.gridValue}>13/3 – 18/3</Text>
              </View>
              <View style={sheetStyles.gridItem}>
                <Text style={sheetStyles.gridLabel}>Departure</Text>
                <Text style={sheetStyles.gridValue}>06:00 AM</Text>
              </View>
              <View style={sheetStyles.gridItem}>
                <Text style={sheetStyles.gridLabel}>Return</Text>
                <Text style={sheetStyles.gridValue}>05:00 PM</Text>
              </View>
              <View style={sheetStyles.gridItemWide}>
                <Text style={sheetStyles.gridLabel}>Hotel</Text>
                <Text style={sheetStyles.gridValue}>{city?.hotel}</Text>
              </View>
              <View style={sheetStyles.gridItemWide}>
                <Text style={sheetStyles.gridLabel}>About</Text>
                <Text style={sheetStyles.gridValue}>{city?.description}</Text>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity onPress={() => setStep('payment')} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden', marginTop: 8 }}>
              <LinearGradient colors={['#667eea', '#764ba2']} style={sheetStyles.primaryBtn}>
                <Text style={sheetStyles.primaryBtnText}>Continue to Payment</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Step: Payment */}
        {step === 'payment' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={sheetStyles.totalText}>Total: <Text style={{ fontWeight: '700' }}>${price}</Text></Text>

              {!!error && <Text style={sheetStyles.errorBox}>{error}</Text>}

              <View style={sheetStyles.inputWrap}>
                <Text style={sheetStyles.inputLabel}>Full Name</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="John Doe"
                  style={sheetStyles.input}
                  autoCapitalize="words"
                />
              </View>

              <View style={sheetStyles.inputWrap}>
                <Text style={sheetStyles.inputLabel}>Card Number</Text>
                <TextInput
                  value={cardNumber}
                  onChangeText={(t) => setCardNumber(formatCard(t))}
                  placeholder="1234 5678 9012 3456"
                  keyboardType="number-pad"
                  style={sheetStyles.input}
                  maxLength={19}
                />
              </View>

              <View style={sheetStyles.row}>
                <View style={[sheetStyles.inputWrap, sheetStyles.col]}>
                  <Text style={sheetStyles.inputLabel}>Expiry (MM/YY)</Text>
                  <TextInput
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                    placeholder="08/27"
                    style={sheetStyles.input}
                    maxLength={5}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[sheetStyles.inputWrap, sheetStyles.col]}>
                  <Text style={sheetStyles.inputLabel}>CVV</Text>
                  <TextInput
                    value={cvv}
                    onChangeText={setCvv}
                    placeholder="123"
                    style={sheetStyles.input}
                    keyboardType="number-pad"
                    maxLength={3}
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity onPress={handlePay} disabled={submitting} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden', marginTop: 6 }}>
                <LinearGradient colors={['##007AFF', '#764ba2']} style={sheetStyles.primaryBtn}>
                  {submitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={sheetStyles.primaryBtnText}>Pay ${price}</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('details')} style={sheetStyles.secondaryBtn}>
                <Text style={sheetStyles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <View style={{ alignItems: 'center', paddingBottom: 8 }}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>🎉</Text>
            <Text style={sheetStyles.successTitle}>Payment Successful</Text>
            <Text style={sheetStyles.successSub}>Your trip to {city?.name} is confirmed.</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden', marginTop: 16, width: '100%' }}>
              <LinearGradient colors={['#667eea', '#764ba2']} style={sheetStyles.primaryBtn}>
                <Text style={sheetStyles.primaryBtnText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 24,
    maxHeight: '86%',
  },
  grabber: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
  },
  closeX: { fontSize: 20, color: '#6b7280' },

  banner: { borderRadius: 16, overflow: 'hidden', marginTop: 8, marginBottom: 14 },
  bannerImg: { width: '100%', height: 150, resizeMode: 'cover' },
  bannerOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 70 },
  bannerTextWrap: { position: 'absolute', left: 12, bottom: 10 },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  bannerSubtitle: { fontSize: 14, fontWeight: '600', color: '#fff', opacity: 0.95 },

  grid: { gap: 10, marginTop: 8 },
  gridItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  gridItemWide: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  gridLabel: { fontSize: 12, color: '#64748b', marginBottom: 2, fontWeight: '600' },
  gridValue: { fontSize: 15, color: '#0f172a' },

  primaryBtn: { paddingVertical: 14, alignItems: 'center', borderRadius: 16 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#007AFF', fontSize: 15, fontWeight: '700' },

  inputWrap: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    fontSize: 15,
    color: '#0f172a',
  },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  totalText: { fontSize: 16, marginBottom: 10, color: '#1f2937' },
  errorBox: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    textAlign: 'center',
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#16a34a', marginBottom: 6 },
  successSub: { fontSize: 15, color: '#334155', textAlign: 'center' },
});


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
    color: '#5b76edff',
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
    // Floating calculator button
  floatingCalcButton: {
    position: 'absolute',
    right: 26,
    // keep it above the tab bar; adjust as needed depending on device
    bottom: 18, 
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  floatingCalcGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  floatingCalcText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

});