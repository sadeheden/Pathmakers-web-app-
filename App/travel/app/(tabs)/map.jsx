import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { post, get } from '../../utils/api';

const PAGE_LIMIT = 30;

/* =====================
   Helpers (stable)
   ===================== */
const fmtDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

const stars = (n) => {
  if (n == null || isNaN(n)) return 'N/A';
  const five = n > 5 ? Math.min(5, Math.round((n / 10) * 5)) : Math.round(n);
  return '★'.repeat(five) + '☆'.repeat(5 - five);
};

const hashCode = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
};

const rngFrom = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const makeAvailability = (id) => {
  const rng = rngFrom(hashCode(String(id)));
  const base = [
    '09:00–10:30',
    '11:00–12:30',
    '13:00–14:30',
    '15:00–16:30',
    '17:00–18:30',
  ];
  const count = 2 + Math.floor(rng() * 2);
  const pool = [...base].sort(() => rng() - 0.5);
  return pool.slice(0, count);
};

/* =====================
   People Selection Modal Component
   ===================== */
const PeopleSelectionModal = ({ visible, item, onClose, onConfirm }) => {
  const [peopleCount, setPeopleCount] = useState(1);
  const [customInput, setCustomInput] = useState('1');

  useEffect(() => {
    if (visible) {
      setPeopleCount(1);
      setCustomInput('1');
    }
  }, [visible]);

  const handlePeopleChange = (count) => {
    const validCount = Math.max(1, Math.min(50, count)); // Limit between 1-50 people
    setPeopleCount(validCount);
    setCustomInput(validCount.toString());
  };

  const handleCustomInputChange = (text) => {
    setCustomInput(text);
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0) {
      setPeopleCount(Math.max(1, Math.min(50, num)));
    }
  };

  const totalPrice = (item?.price || 0) * peopleCount;
  const isFree = (item?.price || 0) === 0;

  const handleConfirm = () => {
    onConfirm({
      peopleCount,
      totalPrice,
      pricePerPerson: item?.price || 0
    });
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.peopleModalOverlay}>
        <View style={styles.peopleModalContent}>
          {/* Header */}
          <View style={styles.peopleModalHeader}>
            <Text style={styles.peopleModalTitle}>Select Number of People</Text>
            <TouchableOpacity onPress={onClose} style={styles.peopleCloseButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Attraction Info */}
          <View style={styles.attractionInfo}>
            <Text style={styles.attractionInfoName}>{item.name}</Text>
            <Text style={styles.attractionInfoCity}>{item.city}</Text>
            <View style={styles.pricePerPersonRow}>
              <Text style={styles.pricePerPersonLabel}>Price per person:</Text>
              <Text style={[styles.pricePerPersonValue, isFree && styles.freePrice]}>
                {isFree ? 'FREE' : `$${item.price}`}
              </Text>
            </View>
          </View>

          {/* People Counter */}
          <View style={styles.peopleCounter}>
            <Text style={styles.peopleCounterLabel}>Number of people:</Text>
            
            {/* Quick Select Buttons */}
            <View style={styles.quickSelectRow}>
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.quickSelectButton,
                    peopleCount === count && styles.quickSelectButtonActive
                  ]}
                  onPress={() => handlePeopleChange(count)}
                >
                  <Text style={[
                    styles.quickSelectButtonText,
                    peopleCount === count && styles.quickSelectButtonTextActive
                  ]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Manual Input and Controls */}
            <View style={styles.manualInputRow}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => handlePeopleChange(peopleCount - 1)}
                disabled={peopleCount <= 1}
              >
                <Ionicons 
                  name="remove" 
                  size={20} 
                  color={peopleCount <= 1 ? "#ccc" : "#666"} 
                />
              </TouchableOpacity>

              <TextInput
                style={styles.peopleInput}
                value={customInput}
                onChangeText={handleCustomInputChange}
                keyboardType="numeric"
                textAlign="center"
                maxLength={2}
                onBlur={() => {
                  if (!customInput || isNaN(parseInt(customInput))) {
                    setCustomInput('1');
                    setPeopleCount(1);
                  }
                }}
              />

              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => handlePeopleChange(peopleCount + 1)}
                disabled={peopleCount >= 50}
              >
                <Ionicons 
                  name="add" 
                  size={20} 
                  color={peopleCount >= 50 ? "#ccc" : "#666"} 
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.peopleLimit}>Maximum 50 people per booking</Text>
          </View>

          {/* Price Calculator */}
          <View style={styles.priceCalculator}>
            <View style={styles.calculatorHeader}>
              <Ionicons name="calculator-outline" size={20} color="#2ea44f" />
              <Text style={styles.calculatorTitle}>Price Calculator</Text>
            </View>
            
            <View style={styles.calculationRow}>
              <Text style={styles.calculationText}>
                {peopleCount} {peopleCount === 1 ? 'person' : 'people'} × {isFree ? 'FREE' : `$${item.price}`} =
              </Text>
              <Text style={[styles.totalPrice, isFree && styles.totalPriceFree]}>
                {isFree ? 'FREE' : `$${totalPrice}`}
              </Text>
            </View>

            {!isFree && peopleCount > 1 && (
              <Text style={styles.savingsText}>
                Save ${((item.price * 0.1) * peopleCount).toFixed(2)} with group booking!
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.peopleModalButtons}>
            <TouchableOpacity 
              style={styles.peopleCancelButton} 
              onPress={onClose}
            >
              <Text style={styles.peopleCancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.peopleConfirmButton}
              onPress={handleConfirm}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.peopleConfirmButtonText}>
                {isFree ? 'Book Free' : `Book for $${totalPrice}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* =====================
   Enhanced Cart Modal Component (Updated for People Count)
   ===================== */
const CartModal = ({ visible, purchasedItems, onClose }) => {
  const [sortBy, setSortBy] = useState('city'); // city, date, price
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Updated calculations to include people count
  const totalValue = purchasedItems.reduce((sum, item) => {
    const price = typeof item.totalPrice === 'number' ? item.totalPrice : (typeof item.price === 'number' ? item.price : 0);
    return sum + price;
  }, 0);
  
  const totalPeople = purchasedItems.reduce((sum, item) => {
    return sum + (item.peopleCount || 1);
  }, 0);
  
  const freeItemsCount = purchasedItems.filter(item => {
    const price = typeof item.totalPrice === 'number' ? item.totalPrice : (typeof item.price === 'number' ? item.price : 0);
    return price === 0;
  }).length;
  
  const paidItemsCount = purchasedItems.length - freeItemsCount;
  const uniqueCities = [...new Set(purchasedItems.map(item => item.city || 'Other Cities'))].length;

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...purchasedItems];
    switch (sortBy) {
      case 'date':
        return sorted.sort((a, b) => new Date(b.purchaseDate || b.booked_at || 0) - new Date(a.purchaseDate || a.booked_at || 0));
      case 'price':
        return sorted.sort((a, b) => (b.totalPrice || b.price || 0) - (a.totalPrice || a.price || 0));
      default:
        return sorted.sort((a, b) => (a.city || 'zzz').localeCompare(b.city || 'zzz'));
    }
  }, [purchasedItems, sortBy]);

  // Group by city (only when sorting by city)
  const groupedItems = useMemo(() => {
    if (sortBy !== 'city') return null;
    
    const groups = {};
    sortedItems.forEach((item, index) => {
      const city = item.city || 'Other Cities';
      if (!groups[city]) {
        groups[city] = [];
      }
      groups[city].push({ ...item, originalIndex: index });
    });
    return groups;
  }, [sortedItems, sortBy]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Unknown date';
    }
  };

  // Render individual attraction item - updated for people count
  const renderAttractionItem = (item, index) => {
    const attractionName = item.attractionName || item.name || 'Unknown Attraction';
    const timeSlot = item.bookingSlot || item.slot || 'No time slot';
    const totalPrice = typeof item.totalPrice === 'number' ? item.totalPrice : (typeof item.price === 'number' ? item.price : 0);
    const pricePerPerson = item.pricePerPerson || (typeof item.price === 'number' ? item.price : 0);
    const peopleCount = item.peopleCount || 1;
    const purchaseDate = item.purchaseDate || item.booked_at;
    const isFree = totalPrice === 0;

    return (
      <View 
        key={item._id || item.id || index} 
        style={styles.attractionItem}
      >
        <View style={styles.attractionContent}>
          <View style={styles.attractionHeader}>
            <View style={styles.attractionMainInfo}>
              <Text style={styles.attractionName} numberOfLines={2}>
                {attractionName}
              </Text>
              <View style={styles.attractionMeta}>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={12} color="#666" />
                  <Text style={styles.detailText}>{timeSlot}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="people-outline" size={12} color="#666" />
                  <Text style={styles.detailText}>
                    {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.attractionFooter}>
            <View style={styles.priceRow}>
              <View style={styles.priceContainer}>
                <Text style={[styles.priceText, isFree && styles.freeText]}>
                  {isFree ? 'FREE' : `$${totalPrice}`}
                </Text>
                {!isFree && (
                  <Text style={styles.pricePerPersonText}>
                    (${pricePerPerson}/person)
                  </Text>
                )}
                {!isFree && (
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>PAID</Text>
                  </View>
                )}
              </View>
              <Text style={styles.dateText}>
                {formatDate(purchaseDate)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render city section
  const renderCitySection = (city, items) => (
    <View key={city} style={styles.citySection}>
      <View style={styles.cityHeader}>
        <Text style={styles.cityTitle}>{city}</Text>
        <Text style={styles.cityCount}>{items.length} attraction{items.length > 1 ? 's' : ''}</Text>
      </View>
      
      {items.map((item, index) => renderAttractionItem(item, index))}
    </View>
  );

  // Sort menu
  const SortMenu = () => (
    showSortMenu && (
      <View style={styles.sortMenu}>
        {[
          { key: 'city', label: 'By City', icon: 'location-outline' },
          { key: 'date', label: 'By Date', icon: 'time-outline' },
          { key: 'price', label: 'By Price', icon: 'cash-outline' }
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[styles.sortOption, sortBy === option.key && styles.sortOptionActive]}
            onPress={() => {
              setSortBy(option.key);
              setShowSortMenu(false);
            }}
          >
            <Ionicons name={option.icon} size={16} color={sortBy === option.key ? '#2ea44f' : '#666'} />
            <Text style={[styles.sortOptionText, sortBy === option.key && styles.sortOptionTextActive]}>
              {option.label}
            </Text>
            {sortBy === option.key && <Ionicons name="checkmark" size={16} color="#2ea44f" />}
          </TouchableOpacity>
        ))}
      </View>
    )
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.modalContent} 
          activeOpacity={1}
          onPress={() => {}}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar} />
          
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.modalTitle}>My Bookings</Text>
              <Text style={styles.headerSubtitle}>
                {purchasedItems.length} item{purchasedItems.length !== 1 ? 's' : ''} • {totalPeople} people • {uniqueCities} cit{uniqueCities !== 1 ? 'ies' : 'y'}
              </Text>
            </View>
            
            {purchasedItems.length > 0 && (
              <TouchableOpacity 
                style={styles.sortButton}
                onPress={() => setShowSortMenu(!showSortMenu)}
              >
                <Ionicons name="options-outline" size={20} color="#666" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <SortMenu />

          {purchasedItems.length === 0 ? (
            <View style={styles.emptyCart}>
              <View style={styles.emptyCartIcon}>
                <Ionicons name="bag-outline" size={64} color="#ddd" />
              </View>
              <Text style={styles.emptyCartTitle}>No Bookings Yet</Text>
              <Text style={styles.emptyCartText}>
                Start exploring amazing attractions and book your first experience!
              </Text>
              <TouchableOpacity style={styles.exploreButton} onPress={onClose}>
                <Ionicons name="compass-outline" size={18} color="#fff" />
                <Text style={styles.exploreButtonText}>Explore Attractions</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Attractions List */}
              <ScrollView
                style={styles.attractionsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {groupedItems ? (
                  Object.entries(groupedItems)
                    .sort(([cityA], [cityB]) =>
                      cityA === 'Other Cities'
                        ? 1
                        : cityB === 'Other Cities'
                        ? -1
                        : cityA.localeCompare(cityB)
                    )
                    .map(([city, items]) => renderCitySection(city, items))
                ) : (
                  sortedItems.map((item, index) => renderAttractionItem(item, index))
                )}
              </ScrollView>

              {/* Summary Footer – Fixed at bottom */}
              <View style={styles.summaryFooter}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>Booking Summary</Text>
                </View>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="location-outline" size={20} color="#2ea44f" />
                    <Text style={styles.summaryLabel}>Cities</Text>
                    <Text style={styles.summaryValue}>{uniqueCities}</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Ionicons name="ticket-outline" size={20} color="#2ea44f" />
                    <Text style={styles.summaryLabel}>Bookings</Text>
                    <Text style={styles.summaryValue}>{purchasedItems.length}</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Ionicons name="people-outline" size={20} color="#ff6b35" />
                    <Text style={styles.summaryLabel}>People</Text>
                    <Text style={styles.summaryValue}>{totalPeople}</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Ionicons name="card-outline" size={20} color="#1b5e20" />
                    <Text style={styles.summaryLabel}>Total</Text>
                    <Text style={styles.summaryValueHighlight}>${totalValue}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

/* =====================
   Updated Payment Modal Component (with people count display)
   ===================== */
const PaymentModal = ({ visible, item, peopleData, onClose, onConfirm, loading }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const handlePayment = () => {
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    onConfirm({
      cardNumber,
      expiryDate,
      cvv,
      cardholderName,
      amount: peopleData?.totalPrice || 0,
      peopleCount: peopleData?.peopleCount || 1,
      pricePerPerson: peopleData?.pricePerPerson || 0
    });
  };

  const resetForm = () => {
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!item || !peopleData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.paymentModalOverlay}>
        <View style={styles.paymentModalContent}>
          <View style={styles.paymentModalHeader}>
            <Text style={styles.paymentModalTitle}>Payment for {item.name}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.paymentCloseButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Booking Details */}
          <View style={styles.bookingDetails}>
            <View style={styles.bookingDetailRow}>
              <Ionicons name="people-outline" size={16} color="#666" />
              <Text style={styles.bookingDetailText}>
                {peopleData.peopleCount} {peopleData.peopleCount === 1 ? 'person' : 'people'}
              </Text>
            </View>
            <View style={styles.bookingDetailRow}>
              <Ionicons name="pricetag-outline" size={16} color="#666" />
              <Text style={styles.bookingDetailText}>
                ${peopleData.pricePerPerson} per person
              </Text>
            </View>
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Total amount:</Text>
            <Text style={styles.priceAmount}>${peopleData.totalPrice}</Text>
            <Text style={styles.priceCalculation}>
              {peopleData.peopleCount} × ${peopleData.pricePerPerson}
            </Text>
          </View>

          <View style={styles.paymentForm}>
            <Text style={styles.inputLabel}>Cardholder Name</Text>
            <TextInput
              style={styles.input}
              value={cardholderName}
              onChangeText={setCardholderName}
              placeholder="John Doe"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Card Number</Text>
            <TextInput
              style={styles.input}
              value={cardNumber}
              onChangeText={(text) => {
                const formatted = text.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                setCardNumber(formatted);
              }}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={19}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  value={expiryDate}
                  onChangeText={(text) => {
                    const formatted = text.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
                    setExpiryDate(formatted);
                  }}
                  placeholder="MM/YY"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={setCvv}
                  placeholder="123"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payButton, loading && styles.payButtonDisabled]}
              onPress={handlePayment}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={18} color="#fff" />
                  <Text style={styles.payButtonText}>Pay ${peopleData.totalPrice}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* =====================
   Animated Cart Button Component
   ===================== */
const AnimatedCartButton = ({ purchasedItems, onPress }) => {
  const [scale] = useState(new Animated.Value(1));
  
  useEffect(() => {
    if (purchasedItems.length > 0) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [purchasedItems.length]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity style={styles.cartButton} onPress={onPress}>
        <Ionicons name="bag-outline" size={20} color="#fff" />
        {purchasedItems.length > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{purchasedItems.length}</Text>
          </View>
        )}
        <Text style={styles.cartButtonText}>
          Cart ({purchasedItems.length})
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

/* =====================
   Main Component
   ===================== */
export default function AttractionsScreen() {
  const [searchCity, setSearchCity] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [items, setItems] = useState([]);
  const [errorText, setErrorText] = useState('');
  
  // Updated state for people selection and payment
  const [peopleModal, setPeopleModal] = useState({ visible: false, item: null });
  const [paymentModal, setPaymentModal] = useState({ visible: false, item: null, peopleData: null });
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  const [cartModal, setCartModal] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(false);

  const fetchAbortRef = useRef(null);

  useEffect(() => {
    loadPurchasedAttractions();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentCity('');
          setLoadingLoc(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        try {
          const [g] = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          const cityName = g?.city || g?.subregion || '';
          setCurrentCity(cityName);
        } catch (geoError) {
          setCurrentCity('');
        }
      } catch (e) {
        setCurrentCity('');
      } finally {
        setLoadingLoc(false);
      }
    })();
  }, []);

  const loadPurchasedAttractions = async () => {
    console.log('🔄 Loading purchased attractions...');
    setLoadingCart(true);
    try {
      const response = await get('attractions/purchased');
      console.log('📥 API Response:', response);
      
      if (response.success && Array.isArray(response.data)) {
        console.log('✅ Purchased items loaded:', response.data.length, 'items');
        setPurchasedItems(response.data);
      } else if (response.success && Array.isArray(response.items)) {
        console.log('✅ Purchased items loaded from items field:', response.items.length, 'items');
        setPurchasedItems(response.items);
      } else {
        console.log('❌ No purchased items or invalid response format:', response);
        setPurchasedItems([]);
      }
    } catch (error) {
      console.error('❌ Failed to load purchased attractions:', error);
      Alert.alert('Error', 'Failed to load your purchases. Please try again.');
      setPurchasedItems([]);
    } finally {
      setLoadingCart(false);
    }
  };

  const fetchAttractionsByCity = useCallback(async (cityName) => {
    if (!cityName?.trim()) {
      setErrorText('Please enter a city name to search');
      return;
    }

    setLoadingList(true);
    setErrorText('');

    try {
      const searchData = { city: cityName.trim(), limit: PAGE_LIMIT };
      const response = await post('attractions/search-by-city', searchData);

      if (!response.success) {
        throw new Error(response.message || 'Search failed');
      }

      const list = (response.items || []).map((attr, idx) => ({
        id: attr._id || `attraction_${idx}`,
        name: attr.name || 'Unknown place',
        city: attr.city || cityName,
        address: attr.address || '',
        openingHours: attr.openingHours || null,
        price: typeof attr.price === 'number' ? attr.price : null,
        category: attr.category || 'attraction',
        rating: attr.rating ?? null,
        bookable: attr.bookable ?? true,
        availability: Array.isArray(attr.availability) && attr.availability.length > 0
          ? attr.availability
          : makeAvailability(attr._id || idx),
        description: attr.description || null,
      }));

      setItems(list);
    } catch (e) {
      setErrorText(e.message || 'Failed to load attractions from your database.');
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const onPressTicket = async (item) => {
    if (!item.bookable) {
      Alert.alert('Not available', 'This attraction is not bookable with us (yet).');
      return;
    }

    // Always show people selection modal first
    setPeopleModal({ visible: true, item });
  };

  const handlePeopleSelection = async (peopleData) => {
    const { item } = peopleModal;
    setPeopleModal({ visible: false, item: null });

    if (peopleData.totalPrice === 0) {
      // Handle free booking
      await handleFreeBooking(item, peopleData);
    } else {
      // Show payment modal
      setPaymentModal({ 
        visible: true, 
        item, 
        peopleData 
      });
    }
  };

  const handleFreeBooking = async (item, peopleData) => {
    try {
      const bookingData = { 
        attractionId: item.id,
        attractionName: item.name,
        city: item.city,
        slot: item.availability?.[0] ?? null, 
        price: 0,
        totalPrice: 0,
        peopleCount: peopleData.peopleCount,
        pricePerPerson: 0,
        paymentType: 'free' 
      };
      
      console.log('📤 Sending free booking:', bookingData);
      const response = await post('attractions/book', bookingData);
      console.log('📥 Booking response:', response);
      
      if (!response.success) throw new Error(response.message || 'Booking failed');
      
      Alert.alert(
        'Booked Successfully! 🎉', 
        `Your booking for ${item.name} is confirmed for ${peopleData.peopleCount} ${peopleData.peopleCount === 1 ? 'person' : 'people'} (free!)`
      );
      
      console.log('🔄 Refreshing cart after successful booking...');
      await loadPurchasedAttractions();
    } catch (e) {
      console.error('❌ Free booking error:', e);
      Alert.alert('Booking Error', e.message || 'Cannot complete booking.');
    }
  };

  const handlePaymentConfirm = async (paymentData) => {
    setPaymentLoading(true);
    try {
      const bookingData = {
        attractionId: paymentModal.item.id,
        attractionName: paymentModal.item.name,
        city: paymentModal.item.city,
        slot: paymentModal.item.availability?.[0] ?? null,
        price: paymentData.pricePerPerson,
        totalPrice: paymentData.amount,
        peopleCount: paymentData.peopleCount,
        pricePerPerson: paymentData.pricePerPerson,
        paymentType: 'paid',
        paymentDetails: {
          cardNumber: paymentData.cardNumber.replace(/\s/g, ''),
          expiryDate: paymentData.expiryDate,
          cvv: paymentData.cvv,
          cardholderName: paymentData.cardholderName,
          amount: paymentData.amount
        }
      };
      
      console.log('📤 Sending paid booking:', bookingData);
      const response = await post('attractions/book', bookingData);
      console.log('📥 Payment response:', response);
      
      if (!response.success) throw new Error(response.message || 'Payment failed');
      
      Alert.alert(
        'Payment Successful! 🎉', 
        `Your payment of ${paymentData.amount} for ${paymentModal.item.name} is confirmed for ${paymentData.peopleCount} ${paymentData.peopleCount === 1 ? 'person' : 'people'}!`
      );
      setPaymentModal({ visible: false, item: null, peopleData: null });
      
      console.log('🔄 Refreshing cart after successful payment...');
      await loadPurchasedAttractions();
    } catch (e) {
      console.error('❌ Payment error:', e);
      Alert.alert('Payment Error', e.message || 'Cannot complete payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchCity.trim()) fetchAttractionsByCity(searchCity);
  };

  const CartButton = useMemo(() => (
    <AnimatedCartButton
      purchasedItems={purchasedItems}
      onPress={() => {
        console.log('🛒 Opening cart with', purchasedItems.length, 'items');
        setCartModal(true);
      }}
    />
  ), [purchasedItems.length]);

  const Header = useMemo(() => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🔍 Search Attractions by City</Text>
          {currentCity ? <Text style={styles.headerSubtitle}>Current location: {currentCity}</Text> : null}
        </View>
        {CartButton}
      </View>
      
      {loadingCart && (
        <View style={styles.cartLoadingIndicator}>
          <ActivityIndicator size="small" color="#2ea44f" />
          <Text style={styles.cartLoadingText}>Loading cart...</Text>
        </View>
      )}
    </View>
  ), [currentCity, CartButton, loadingCart]);

  const SearchControls = useMemo(() => (
    <View style={styles.controls}>
      <Text style={styles.ctrlLabel}>Search City</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchCity}
          onChangeText={setSearchCity}
          placeholder="Enter city name (e.g., Amsterdam, Paris, New York)"
          placeholderTextColor="#999"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={[styles.searchBtn, loadingList && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={loadingList || !searchCity.trim()}
        >
          <Ionicons name={loadingList ? 'hourglass-outline' : 'search'} size={18} color="#fff" />
          <Text style={styles.searchText}>{loadingList ? 'Searching...' : 'Search'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.quickLabel}>Quick search:</Text>
        {['Amsterdam', 'Paris', 'London', 'New York'].map((city) => (
          <TouchableOpacity
            key={city}
            style={[styles.quickChip, styles.ml8]}
            onPress={() => {
              setSearchCity(city);
              fetchAttractionsByCity(city);
            }}
          >
            <Text style={styles.quickChipText}>{city}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {items.length > 0 && (
        <Text style={styles.resultsCount}>Found {items.length} attractions in {searchCity}</Text>
      )}
    </View>
  ), [searchCity, loadingList, fetchAttractionsByCity, items.length]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={{ flex: 1, paddingRight: 50 }}>
          <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
          {!!item.address && <Text style={styles.placeAddress} numberOfLines={1}>{item.address}</Text>}
          {!!item.city && <Text style={styles.placeCity} numberOfLines={1}>{item.city}</Text>}
          {!!item.description && <Text style={styles.placeDescription} numberOfLines={2}>{item.description}</Text>}

          <View style={styles.metaRow}>
            {item.rating && <View style={styles.metaPill}><Ionicons name="star" size={14} /><Text style={styles.metaText}>{stars(item.rating)}</Text></View>}
            {item.category && <View style={[styles.metaPill, styles.ml8]}><Ionicons name="pricetag-outline" size={14} /><Text style={styles.metaText}>{item.category}</Text></View>}
            {item.openingHours && <View style={[styles.metaPill, styles.ml8]}><Ionicons name="time-outline" size={14} /><Text style={styles.metaText}>Open</Text></View>}
          </View>

          {Array.isArray(item.availability) && item.availability.length > 0 && (
            <View style={[styles.metaRow, { marginTop: 6 }]}>
              {item.availability.slice(0, 3).map((slot, idx) => (
                <View key={slot + idx} style={[styles.timePill, idx > 0 && styles.ml8]}>
                  <Ionicons name="time-outline" size={12} />
                  <Text style={styles.timeText}>{slot}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.ticketBtn, !item.bookable && styles.ticketBtnDisabled]}
          onPress={() => onPressTicket(item)}
          disabled={!item.bookable}
          accessibilityLabel={item.bookable ? 'Book tickets' : 'Not bookable'}
        >
          <Ionicons name="ticket-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {item.bookable ? (
        <View style={styles.bookRow}>
          <Ionicons name="checkmark-circle-outline" size={14} />
          <Text style={styles.bookText}>
            {item.price === 0 ? 'Free - Bookable' : item.price != null ? `From ${item.price}/person` : 'Available to book'}
          </Text>
        </View>
      ) : (
        <View style={styles.unavailableRow}>
          <Ionicons name="close-circle-outline" size={14} />
          <Text style={styles.unavailableText}>Not available to book</Text>
        </View>
      )}
    </View>
  );

  if (loadingLoc) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Detecting your location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Header}
      {SearchControls}

      {loadingList ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 8 }}>Searching attractions for {searchCity}…</Text>
        </View>
      ) : items.length === 0 && !errorText ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.errorTitle}>Search for Attractions</Text>
          <Text style={styles.errorText}>Enter a city name above to find attractions</Text>
        </View>
      ) : items.length === 0 && errorText ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Ionicons name="database-outline" size={48} color="#ccc" />
          <Text style={styles.errorTitle}>No Attractions Found</Text>
          <Text style={styles.errorText}>{errorText}</Text>
          <Text style={styles.errorHint}>Try searching for a different city or add attractions to your database.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        />
      )}

      <PeopleSelectionModal
        visible={peopleModal.visible}
        item={peopleModal.item}
        onClose={() => setPeopleModal({ visible: false, item: null })}
        onConfirm={handlePeopleSelection}
      />

      <PaymentModal
        visible={paymentModal.visible}
        item={paymentModal.item}
        peopleData={paymentModal.peopleData}
        onClose={() => setPaymentModal({ visible: false, item: null, peopleData: null })}
        onConfirm={handlePaymentConfirm}
        loading={paymentLoading}
      />

      <CartModal
        visible={cartModal}
        purchasedItems={purchasedItems}
        onClose={() => setCartModal(false)}
      />
    </View>
  );
}

/* =====================
   Complete Styles (Updated with People Selection Components)
   ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // Header Styles
  header: {
    paddingTop: 90,
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexDirection: 'column',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flexDirection: 'row', alignItems: 'center' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  
  cartLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f8f0',
    borderRadius: 20,
    marginHorizontal: 40,
  },
  cartLoadingText: {
    fontSize: 13,
    color: '#2ea44f',
    marginLeft: 8,
    fontWeight: '600',
  },

  // People Selection Modal Styles
  peopleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  peopleModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  peopleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  peopleModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  peopleCloseButton: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  
  // Attraction Info Section
  attractionInfo: {
    backgroundColor: '#f8fffe',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  attractionInfoName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 4,
  },
  attractionInfoCity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  pricePerPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pricePerPersonLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  pricePerPersonValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2ea44f',
  },
  freePrice: {
    color: '#ff6b35',
  },
  
  // People Counter Section
  peopleCounter: {
    marginBottom: 24,
  },
  peopleCounterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  quickSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickSelectButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickSelectButtonActive: {
    backgroundColor: '#e8f5e8',
    borderColor: '#2ea44f',
  },
  quickSelectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  quickSelectButtonTextActive: {
    color: '#2ea44f',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  counterButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  peopleInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2ea44f',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    minWidth: 80,
    color: '#1a1a1a',
  },
  peopleLimit: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Price Calculator Section
  priceCalculator: {
    backgroundColor: '#f0f8f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  calculatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  calculatorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b5e20',
    marginLeft: 8,
  },
  calculationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calculationText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2ea44f',
  },
  totalPriceFree: {
    color: '#ff6b35',
  },
  savingsText: {
    fontSize: 12,
    color: '#2ea44f',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  
  // People Modal Buttons
  peopleModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  peopleCancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peopleCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  peopleConfirmButton: {
    flex: 2,
    backgroundColor: '#2ea44f',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2ea44f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  peopleConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 6,
  },
  
  // Enhanced Cart Button Styles
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ea44f',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    position: 'relative',
    minWidth: 100,
    shadowColor: '#2ea44f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cartButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4757',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Enhanced Cart Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '85%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 15,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
  },
  sortButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 8,
    marginRight: 8,
  },
  closeButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 8,
  },
  
  // Sort Menu Styles
  sortMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  sortOptionActive: {
    backgroundColor: '#f0f8f0',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#2ea44f',
    fontWeight: '600',
  },
  
  // Empty Cart State
  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyCartIcon: {
    backgroundColor: '#f8f8f8',
    borderRadius: 50,
    padding: 20,
    marginBottom: 16,
  },
  emptyCartTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ea44f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: '#2ea44f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  
  // Attractions List
  attractionsList: {
    flex: 1,
    showsVerticalScrollIndicator: false,
  },
  
  // City Sections
  citySection: {
    marginBottom: 24,
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fffe',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e3f2fd',
    shadowColor: '#2ea44f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b5e20',
  },
  cityCount: {
    fontSize: 13,
    color: '#2ea44f',
    fontWeight: '600',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  // Enhanced Attraction Items (Updated for People Count)
  attractionItem: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  attractionContent: {
    padding: 16,
  },
  attractionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  attractionMainInfo: {
    flex: 1,
  },
  attractionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    lineHeight: 22,
  },
  attractionMeta: {
    marginTop: 6,
    gap: 6,
  },
  attractionFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f8f8f8',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2ea44f',
  },
  freeText: {
    color: '#ff6b35',
    fontWeight: '800',
  },
  pricePerPersonText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  paidBadge: {
    backgroundColor: '#2ea44f',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  paidBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  
  // Summary Footer
  summaryFooter: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2ea44f',
    textAlign: 'center',
  },
  summaryValueHighlight: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1b5e20',
    textAlign: 'center',
  },

  // Search Controls
  controls: { paddingHorizontal: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ml8: { marginLeft: 8 },
  ctrlLabel: { fontWeight: '600', marginBottom: 6 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  searchBtn: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a66c2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchBtnDisabled: { backgroundColor: '#9aa0a6' },
  searchText: { color: '#fff', marginLeft: 6, fontWeight: '600' },
  quickLabel: { fontSize: 12, color: '#666', marginRight: 4 },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  quickChipText: { fontSize: 11, fontWeight: '600', color: '#0a66c2' },
  resultsCount: {
    fontSize: 12,
    color: '#2ea44f',
    marginTop: 8,
    fontWeight: '600',
  },
  
  // Card Styles
  card: {
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardMain: { flexDirection: 'row', alignItems: 'flex-start' },
  placeName: { fontSize: 16, fontWeight: '700' },
  placeAddress: { fontSize: 13, color: '#666', marginTop: 2 },
  placeCity: { fontSize: 12, color: '#888', marginTop: 1, fontStyle: 'italic' },
  placeDescription: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
    lineHeight: 16,
  },
  metaRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f7f8',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  metaText: { fontSize: 11, color: '#333', marginLeft: 4 },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#0a66c2',
    marginLeft: 4,
    fontWeight: '600',
  },
  ticketBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#2ea44f',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ticketBtnDisabled: { backgroundColor: '#9aa0a6' },
  bookRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  bookText: { fontSize: 13, color: '#1b5e20', fontWeight: '600', marginLeft: 6 },
  unavailableRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  unavailableText: { fontSize: 13, color: '#9a0007', fontWeight: '600', marginLeft: 6 },
  errorTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 4 },
  errorHint: { fontSize: 12, color: '#999', textAlign: 'center', fontStyle: 'italic' },
  
  // Updated Payment Modal Styles (with booking details)
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    width: '90%',
    maxHeight: '85%',
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  paymentCloseButton: {
    padding: 8,
  },
  bookingDetails: {
    backgroundColor: '#f8fffe',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  priceSection: {
    backgroundColor: '#f0f8f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2ea44f',
  },
  priceCalculation: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  paymentForm: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
    marginRight: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  payButton: {
    flex: 1,
    backgroundColor: '#2ea44f',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#9aa0a6',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
});