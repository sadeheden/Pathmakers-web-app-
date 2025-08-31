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
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

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

// Date Selection Component
const DateSelectionModal = ({ visible, onClose, onConfirm, selectedCity }) => {
  const [departureDate, setDepartureDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days later
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [error, setError] = useState('');

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDepartureDateChange = (event, selectedDate) => {
    setShowDeparturePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDepartureDate(selectedDate);
      setError('');
      // Auto-adjust return date if it's before departure
      if (selectedDate >= returnDate) {
        const newReturnDate = new Date(selectedDate);
        newReturnDate.setDate(newReturnDate.getDate() + 3); // Minimum 3 days trip
        setReturnDate(newReturnDate);
      }
    }
  };

  const handleReturnDateChange = (event, selectedDate) => {
    setShowReturnPicker(Platform.OS === 'ios');
    if (selectedDate) {
      if (selectedDate <= departureDate) {
        setError('Return date must be after departure date');
        return;
      }
      setReturnDate(selectedDate);
      setError('');
    }
  };

  const handleConfirm = () => {
    if (returnDate <= departureDate) {
      setError('Return date must be after departure date');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (departureDate < today) {
      setError('Departure date cannot be in the past');
      return;
    }

    const tripDuration = Math.ceil((returnDate - departureDate) / (1000 * 60 * 60 * 24));
    onConfirm({ departureDate, returnDate, tripDuration });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.dateModalContent}>
          <TouchableOpacity style={styles.modalCloseX} onPress={onClose}>
            <Text style={styles.modalCloseXText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={styles.dateModalTitle}>Choose Your Travel Dates</Text>
          <Text style={styles.dateModalSubtitle}>{selectedCity?.name} Trip</Text>
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Departure Date */}
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Departure Date</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDeparturePicker(true)}
            >
              <Text style={styles.dateButtonText}>{formatDate(departureDate)}</Text>
              <FontAwesome name="calendar" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Return Date */}
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Return Date</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowReturnPicker(true)}
            >
              <Text style={styles.dateButtonText}>{formatDate(returnDate)}</Text>
              <FontAwesome name="calendar" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Trip Summary */}
          <View style={styles.tripSummary}>
            <Text style={styles.tripSummaryTitle}>Trip Summary</Text>
            <Text style={styles.tripSummaryText}>
              Duration: {Math.ceil((returnDate - departureDate) / (1000 * 60 * 60 * 24))} days
            </Text>
            <Text style={styles.tripSummaryText}>
              From {formatDate(departureDate)} to {formatDate(returnDate)}
            </Text>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity style={styles.confirmDateButton} onPress={handleConfirm}>
            <LinearGradient colors={['#007AFF', '#764ba2']} style={styles.confirmDateGradient}>
              <Text style={styles.confirmDateText}>Confirm Dates</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Date Pickers */}
          {showDeparturePicker && (
            <DateTimePicker
              value={departureDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDepartureDateChange}
              minimumDate={new Date()}
              maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // 1 year from now
            />
          )}

          {showReturnPicker && (
            <DateTimePicker
              value={returnDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleReturnDateChange}
              minimumDate={new Date(departureDate.getTime() + 24 * 60 * 60 * 1000)} // Next day after departure
              maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // 1 year from now
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// Payment Modal Component
const PaymentModal = ({ visible, onClose, selectedCity, tripDates, onPaymentSuccess }) => {
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

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
              {tripDates && (
                <Text style={styles.successDates}>
                  {formatDate(tripDates.departureDate)} - {formatDate(tripDates.returnDate)}
                </Text>
              )}
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.modalCloseX} onPress={onClose}>
                <Text style={styles.modalCloseXText}>✕</Text>
              </TouchableOpacity>
              
              <Text style={styles.paymentTitle}>Complete Your Booking</Text>
              <Text style={styles.paymentSubtitle}>
                {selectedCity?.name} - ${selectedCity?.price}
              </Text>
              
              {tripDates && (
                <View style={styles.tripDetailsInPayment}>
                  <Text style={styles.tripDatesText}>
                    📅 {formatDate(tripDates.departureDate)} - {formatDate(tripDates.returnDate)}
                  </Text>
                  <Text style={styles.tripDurationText}>
                    Duration: {tripDates.tripDuration} days
                  </Text>
                </View>
              )}
              
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
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showIntroPopup, setShowIntroPopup] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [selectedTripDates, setSelectedTripDates] = useState(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [currentWeather, setCurrentWeather] = useState({ temp: 28 });
  const [reviews, setReviews] = useState(userReviews);
  const [userVotes, setUserVotes] = useState({});

  // Booking state variables
  const [departureCity, setDepartureCity] = useState('68022f445f7300b11f986829');
  const [selectedAttractions, setSelectedAttractions] = useState(['6807610adc218773e065223d']);
  const [selectedTransportation, setSelectedTransportation] = useState('Public Transport');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('PayPal');

  const flatListRef = useRef();

  // City ID mapping functions
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

  const getFlightId = (destinationCity) => {
    const flightMappings = {
     'phuket': '6891f45cf511eb0daf23b8f6',   
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

  const getHotelId = (destinationCity) => {
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
      navigation.navigate('Weather');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not navigate to weather screen.');
    }
  };

  const handleDiaryPress = () => {
    try {
      navigation.navigate('RealChat');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not navigate to diary screen.');
    }
  };

  const handleCurrencyPress = () => {
    try {
      navigation.navigate('calculator');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not navigate to currency converter.');
    }
  };

  const handleCityPress = (city) => {
    setSelectedDestination(city);
    setShowTripDetails(true);
  };

  const handleDateSelection = (dateInfo) => {
    setSelectedTripDates(dateInfo);
    setShowDateSelector(false);
    setShowPaymentModal(true);
  };

  const handleLike = (id) => {
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

  const handlePaymentSuccess = async () => {
    setPaymentCompleted(true);
    setShowPaymentModal(false);

    if (!selectedDestination || !selectedTripDates) {
      Alert.alert('Missing data', 'Please select destination and dates again.');
      return;
    }

    const resolvedFlightId = getFlightId(selectedDestination);
    if (!resolvedFlightId) {
      Alert.alert('Missing flight', 'Could not resolve a flight for this destination.');
      return;
    }

    const destId = getDestinationCityId(selectedDestination);
    if (!destId) {
      Alert.alert('Missing destination', 'Could not resolve destination city ID.');
      return;
    }

    const selectedHotel = Array.isArray(global?.hotelsList)
      ? global.hotelsList.find(h => h._id === getHotelId(selectedDestination))
      : null;

    const orderData = {
      departureCityId: getDepartureCityId(selectedDestination),
      departureCityName: selectedDestination?.name || selectedDestination?.slug || '',
      destinationCityId: destId,
      destinationCityName: selectedDestination?.name || selectedDestination?.slug || '',
      flightId: resolvedFlightId,
      flightName: selectedDestination?.name ? `${selectedDestination.name} Flight` : '',
      hotelId: selectedHotel?._id ?? null,
    hotelName: selectedHotel?.name ?? (selectedDestination?.hotel || ''),
      attractions: selectedAttractions || [],
      transportation: selectedTransportation,
      paymentMethod: selectedPaymentMethod,
      totalPrice: parseInt(selectedDestination?.price) || 0,
      departureDate: selectedTripDates.departureDate.toISOString(),
      returnDate: selectedTripDates.returnDate.toISOString(),
      tripDuration: selectedTripDates.tripDuration,
    };

    console.log('Order data prepared:', JSON.stringify(orderData, null, 2));

    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('https://pathmakers-web-app-app-travel.onrender.com/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Server error:', errorData);
        throw new Error(errorData?.message || `Server error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Order saved on server:', responseData);
      
      Alert.alert(
        'Success!', 
        `Your trip to ${selectedDestination.name} has been booked successfully!\n\nTrip dates: ${selectedTripDates.departureDate.toLocaleDateString()} - ${selectedTripDates.returnDate.toLocaleDateString()}\nOrder ID: ${responseData._id}`,
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
      console.error('Error saving order:', error);
      
      Alert.alert(
        'Warning', 
        `Trip booked locally but failed to save to server.\nError: ${error.message}`,
        [
          {
            text: 'Retry',
            onPress: () => handlePaymentSuccess()
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
          <Text style={styles.ctaButtonText}>Start Your Journey</Text>
        </TouchableOpacity>

        {/* Enhanced Destinations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Book Your Next Trip</Text>
            <Text style={styles.sectionSubtitle}>Choose dates and book instantly</Text>
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
            <Text style={styles.sectionTitle}>Traveler Stories</Text>
            <Text style={styles.sectionSubtitle}>Real experiences from real travelers</Text>
          </View>
          {reviews.map((review) => {
            const voted = userVotes[review.id];
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

        {/* Trip Details Modal */}
        {selectedDestination && showTripDetails && (
          <Modal visible={showTripDetails} transparent animationType="slide" onRequestClose={() => {
            setShowTripDetails(false);
            setSelectedDestination(null);
          }}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.modalCloseX}
                  onPress={() => {
                    setShowTripDetails(false);
                    setSelectedDestination(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseXText}>✕</Text>
                </TouchableOpacity>

                <Text style={styles.modalTitle}>{selectedDestination.name} - Trip Details</Text>

                <View style={styles.tripDetailsContainer}>
                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>✈️ Flight:</Text>
                    <Text style={styles.tripDetailValue}>{selectedDestination.flight}</Text>
                  </View>

                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>🛫 Departure Time:</Text>
                    <Text style={styles.tripDetailValue}>06:00 AM</Text>
                  </View>

                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>🛬 Return Time:</Text>
                    <Text style={styles.tripDetailValue}>05:00 PM</Text>
                  </View>

                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>📅 Available Dates:</Text>
                    <Text style={styles.tripDetailValue}>March 13 - March 18</Text>
                  </View>

                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>🏨 Hotel:</Text>
                    <Text style={styles.tripDetailValue}>{selectedDestination.hotel}</Text>
                  </View>

                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>💰 Price:</Text>
                    <Text style={styles.tripDetailPriceValue}>${selectedDestination.price}</Text>
                  </View>

                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>📝 Description:</Text>
                    <Text style={styles.tripDetailDescription}>{selectedDestination.description}</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.bookButton} 
                  onPress={() => {
                    setShowTripDetails(false);
                    setShowDateSelector(true);
                  }} 
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#007AFF', '#764ba2']} style={styles.bookButtonGradient}>
                    <Text style={styles.bookButtonText}>Book Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

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
                <Text style={styles.modalTitle}>You've Selected {selectedDestination.name}!</Text>
                <Text style={styles.modalDescription}>
                  Awesome! You're about to plan your trip to {selectedDestination.name}. Choose your travel dates and we'll handle the rest.
                </Text>
                <Text style={styles.modalDescription}>Click Continue to select your dates.</Text>
                <Text style={styles.priceHighlight}>Price: ${selectedDestination.price} per person</Text>
                <TouchableOpacity 
                  style={styles.continueButton} 
                  onPress={() => {
                    setShowIntroPopup(false);
                    setShowDateSelector(true);
                  }} 
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.continueButtonGradient}>
                    <Text style={styles.continueButtonText}>Continue</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Date Selection Modal */}
        <DateSelectionModal
          visible={showDateSelector}
          onClose={() => {
            setShowDateSelector(false);
            setSelectedDestination(null);
          }}
          onConfirm={handleDateSelection}
          selectedCity={selectedDestination}
        />

        {/* Payment Modal */}
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedDestination(null);
            setSelectedTripDates(null);
          }}
          selectedCity={selectedDestination}
          tripDates={selectedTripDates}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </ScrollView>

      {/* Floating Calculator Button */}
      <TouchableOpacity
        onPress={handleCurrencyPress}
        activeOpacity={0.9}
        style={styles.floatingCalcButton}
        accessibilityRole="button"
        accessibilityLabel="Open currency calculator"
      >
        <LinearGradient
          colors={['#28a745', '#7cec96ff']}
          style={styles.floatingCalcGradient}
        >
          <FontAwesome name="dollar" size={25} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
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
    maxHeight: '80%',
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
  tripDetailsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  tripDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tripDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    flex: 1,
  },
  tripDetailValue: {
    fontSize: 14,
    color: '#2d3748',
    flex: 1,
    textAlign: 'right',
  },
  tripDetailPriceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    flex: 1,
    textAlign: 'right',
  },
  tripDetailDescription: {
    fontSize: 14,
    color: '#2d3748',
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
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
  // Date Selection Modal Styles
  dateModalContent: {
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
  dateModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2d3748',
    textAlign: 'center',
    marginTop: 20,
  },
  dateModalSubtitle: {
    fontSize: 18,
    color: '#667eea',
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: '600',
  },
  dateContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f7fafc',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '600',
  },
  tripSummary: {
    backgroundColor: '#f0f4ff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tripSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
  },
  tripSummaryText: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 4,
  },
  confirmDateButton: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  confirmDateGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  confirmDateText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
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
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  tripDetailsInPayment: {
    backgroundColor: '#f0f4ff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tripDatesText: {
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  tripDurationText: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
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
    marginBottom: 10,
  },
  successDates: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Floating calculator button
  floatingCalcButton: {
    position: 'absolute',
    right: 26,
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
});