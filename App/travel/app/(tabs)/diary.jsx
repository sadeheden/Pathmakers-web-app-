import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { 
  Edit3, 
  Save, 
  X, 
  BookOpen, 
  Calendar as CalendarIcon, 
  MapPin, 
  Globe,
  Camera,
  Star,
  Clock,
  Route
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

// City coordinates for the map
const cityCoordinates = {
  'Tel Aviv': { lat: 32.0853, lng: 34.7818, country: 'Israel' },
  'Phuket': { lat: 7.8804, lng: 98.3923, country: 'Thailand' },
  'Paris': { lat: 48.8566, lng: 2.3522, country: 'France' },
  'Dubai': { lat: 25.2048, lng: 55.2708, country: 'UAE' },
  'London': { lat: 51.5074, lng: -0.1278, country: 'UK' },
  'Turkey': { lat: 39.9334, lng: 32.8597, country: 'Turkey' },
  'Amsterdam': { lat: 52.3676, lng: 4.9041, country: 'Netherlands' }
};

// --- Helpers ---
const toISO = (d) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);

const buildDateRange = (start, end) => {
  if (!start || !end) return [];
  const out = [];
  let cur = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (cur <= last) {
    out.push(toISO(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
};

const cityMappings = {
  '68022f445f7300b11f986829': 'Tel Aviv',
  '68022f445f7300b11f986837': 'Phuket',
  '68022f445f7300b11f986838': 'Paris',
  '68022f445f7300b11f986839': 'Dubai',
  '68022f445f7300b11f98683a': 'London',
  '68022f445f7300b11f98683b': 'Turkey',
  '68022f445f7300b11f98683c': 'Amsterdam',
};

const isObjectId = (s) => typeof s === 'string' && /^[0-9a-f]{24}$/i.test(s);
const getCityName = (cityName, cityId) =>
  cityName && !isObjectId(cityName) ? cityName : cityMappings[cityId] || cityName || 'Unknown';

// Native MapView Component
const InteractiveMap = ({ trips, onLocationSelect }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showRoute, setShowRoute] = useState(true);

  // Get user location
  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      
      let location = await Location.getCurrentPositionAsync();
      setCurrentLocation(location);
    } catch (error) {
      setErrorMsg('Error getting location: ' + error.message);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  // Calculate center of all trips for initial map view
  const getMapRegion = () => {
    if (!trips.length) {
      // Default to Tel Aviv if no trips
      return {
        latitude: 32.0853,
        longitude: 34.7818,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    // Calculate bounds for all trip locations
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    trips.forEach(trip => {
      const coord = cityCoordinates[trip.city];
      if (coord) {
        minLat = Math.min(minLat, coord.lat);
        maxLat = Math.max(maxLat, coord.lat);
        minLng = Math.min(minLng, coord.lng);
        maxLng = Math.max(maxLng, coord.lng);
      }
    });

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max((maxLat - minLat) * 1.2, 0.05);
    const deltaLng = Math.max((maxLng - minLng) * 1.2, 0.05);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    };
  };

  // Generate route coordinates for polyline
  const getRouteCoordinates = () => {
    return trips
      .map(trip => {
        const coord = cityCoordinates[trip.city];
        return coord ? { latitude: coord.lat, longitude: coord.lng } : null;
      })
      .filter(Boolean);
  };

  return (
    <View style={styles.mapContainer}>
      {errorMsg ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : (
        <MapView 
          style={styles.map}
          region={getMapRegion()}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
        >
          {/* Trip markers */}
          {trips.map((trip, index) => {
            const coord = cityCoordinates[trip.city];
            if (!coord) return null;

            return (
              <Marker
                key={trip.id}
                coordinate={{ latitude: coord.lat, longitude: coord.lng }}
                title={trip.city}
                description={`${coord.country} • ${Math.ceil((new Date(trip.end) - new Date(trip.start)) / (1000 * 60 * 60 * 24)) + 1} days`}
                pinColor={trip.color}
                onPress={() => {
                  setSelectedMarker(trip);
                  onLocationSelect && onLocationSelect(trip);
                }}
              />
            );
          })}

          {/* Route polyline */}
          {showRoute && trips.length > 1 && (
            <Polyline
              coordinates={getRouteCoordinates()}
              strokeColor="#6366f1"
              strokeWidth={3}
              strokePattern={[1, 10, 15, 10]}
              geodesic={true}
            />
          )}
        </MapView>
      )}

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={[styles.mapControlButton, showRoute && styles.activeMapControl]}
          onPress={() => setShowRoute(!showRoute)}
        >
          <Route size={16} color={showRoute ? '#ffffff' : '#374151'} />
          <Text style={[
            styles.mapControlText, 
            showRoute && styles.activeMapControlText
          ]}>
            Route
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selected location details */}
      {selectedMarker && (
        <View style={styles.locationDetails}>
          <View style={styles.locationHeader}>
            <View style={[styles.locationColorIndicator, { backgroundColor: selectedMarker.color }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>{selectedMarker.city}</Text>
              <Text style={styles.locationCountry}>
                {cityCoordinates[selectedMarker.city]?.country}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedMarker(null)}
              style={styles.closeLocationButton}
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.locationStats}>
            <View style={styles.locationStat}>
              <Camera size={16} color="#6366f1" />
              <Text style={styles.locationStatText}>{selectedMarker.photos || 0} photos</Text>
            </View>
            <View style={styles.locationStat}>
              <Star size={16} color="#6366f1" />
              <Text style={styles.locationStatText}>{selectedMarker.notes || 0} notes</Text>
            </View>
            <View style={styles.locationStat}>
              <Clock size={16} color="#6366f1" />
              <Text style={styles.locationStatText}>
                {Math.ceil((new Date(selectedMarker.end) - new Date(selectedMarker.start)) / (1000 * 60 * 60 * 24)) + 1} days
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {!currentLocation && !errorMsg && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <Globe size={40} color="#6366f1" />
            <Text style={styles.loadingText}>Loading Map...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default function DiaryCalendarScreen() {
  const [currentView, setCurrentView] = useState('calendar'); // 'calendar' or 'map'
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [tripStart, setTripStart] = useState(null);
  const [tripEnd, setTripEnd] = useState(null);
  const [tripLabel, setTripLabel] = useState(null);
  const [trips, setTrips] = useState([]);

  const isBetween = (date, start, end) => {
    if (!date || !start || !end) return false;
    return date >= start && date <= end;
  };

  // Load notes from AsyncStorage when screen loads
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const storedData = await AsyncStorage.getItem('markedDates');
        if (storedData) {
          setMarkedDates(JSON.parse(storedData));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadNotes();
  }, []);

  // Fetch latest order and set trip info
  useEffect(() => {
    const loadTripFromOrders = async () => {
      try {
        const raw = await AsyncStorage.getItem('token');
        const token = raw?.replace(/^"|"$/g, '') || null;
        if (!token) return;

        const resp = await fetch('https://pathmakers-web-app-app-travel.onrender.com/api/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          console.log('Orders fetch failed:', await resp.text());
          return;
        }

        const data = await resp.json();
        const orders = Array.isArray(data?.orders) ? data.orders : [];
        if (!orders.length) return;

        const palette = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
        let colorIdx = 0;

        const toTrip = (o) => {
          const destName = getCityName(o.destination_city_name, o.destination_city_id);
          const label = destName ? `Trip to ${destName}` : 'Your Trip';

          const explicitStart = o.trip_start || o.start_date || null;
          const explicitEnd = o.trip_end || o.end_date || null;

          let startIso, endIso;
          if (explicitStart && explicitEnd) {
            startIso = String(explicitStart).slice(0, 10);
            endIso = String(explicitEnd).slice(0, 10);
          } else if (o.created_at) {
            const created = new Date(o.created_at);
            const start = toISO(created);
            const endD = new Date(created);
            endD.setDate(endD.getDate() + 6);
            const end = toISO(endD);
            startIso = start; endIso = end;
          } else {
            return null;
          }

          const color = palette[colorIdx++ % palette.length];
          
          // Add sample data for map display
          const photos = Math.floor(Math.random() * 50) + 10;
          const notes = Math.floor(Math.random() * 20) + 5;
          
          return { 
            id: colorIdx,
            start: startIso, 
            end: endIso, 
            label, 
            color,
            city: destName,
            photos,
            notes
          };
        };

        const allTrips = orders.map(toTrip).filter(Boolean);
        setTrips(allTrips);

        const today = toISO(new Date());
        const upcoming = allTrips
          .filter(t => t.end >= today)
          .sort((a,b) => a.start.localeCompare(b.start))[0] || allTrips[0];

        if (upcoming) {
          setTripLabel(upcoming.label);
          setTripStart(upcoming.start);
          setTripEnd(upcoming.end);
        }
      } catch (e) {
        console.log('Failed to load trip from orders:', e?.message);
      }
    };

    loadTripFromOrders();
  }, []);

  // Save to AsyncStorage when updating
  const saveToStorage = async (newData) => {
    try {
      await AsyncStorage.setItem('markedDates', JSON.stringify(newData));
    } catch (error) {
      Alert.alert('Error', 'Unable to save your note');
    }
  };

  const onDayPress = (day) => {
    const dateStr = day.dateString;
    setSelectedDate(dateStr);

    const existing = markedDates[dateStr]?.note || '';

    let initialText = existing;
    if (!existing) {
      const inTrip = trips.find(t => dateStr >= t.start && dateStr <= t.end);
      if (inTrip) initialText = inTrip.label;
    }

    setNoteText(initialText);
    setModalVisible(true);
  };

  const saveNote = () => {
    const trimmed = noteText.trim();
    if (trimmed) {
      const updated = {
        ...markedDates,
        [selectedDate]: {
          ...(markedDates[selectedDate] || {}),
          note: trimmed,
          marked: true,
          textColor: '#568fdaff',
        },
      };
      setMarkedDates(updated);
      saveToStorage(updated);
    } else {
      const updated = { ...markedDates };
      delete updated[selectedDate];
      setMarkedDates(updated);
      saveToStorage(updated);
    }
    setModalVisible(false);
    setNoteText('');
  };

  const deleteNote = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = { ...markedDates };
            delete updated[selectedDate];
            setMarkedDates(updated);
            saveToStorage(updated);
            setModalVisible(false);
            setNoteText('');
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Build trip period marks
  const tripMarks = (() => {
    if (!trips.length) return {};
    const out = {};
    trips.forEach((t) => {
      const days = buildDateRange(t.start, t.end);
      days.forEach((d, i) => {
        out[d] = {
          ...(out[d] || {}),
          color: t.color,
          textColor: '#ffffff',
          startingDay: i === 0,
          endingDay: i === days.length - 1,
        };
      });
    });
    return out;
  })();

  // Merge trip band with notes
  const mergedMarkedDates = (() => {
    const merged = { ...tripMarks };
    Object.keys(markedDates).forEach((d) => {
      merged[d] = {
        ...(merged[d] || {}),
        ...(markedDates[d] || {}),
        marked: true,
      };
    });
    return merged;
  })();

  return (
    <LinearGradient colors={['#f8fafc', '#e2e8f0', '#cbd5e1']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Spacing */}
        <View style={styles.topSpacing} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>My Travel Diary</Text>
          </View>
          <Text style={styles.subtitle}>
            {tripLabel ? tripLabel : 'Capture your daily moments'}
          </Text>
          
          {/* View Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                currentView === 'calendar' && styles.activeToggleButton
              ]}
              onPress={() => setCurrentView('calendar')}
            >
              <CalendarIcon size={20} color={currentView === 'calendar' ? '#ffffff' : '#64748b'} />
              <Text style={[
                styles.toggleButtonText,
                currentView === 'calendar' && styles.activeToggleButtonText
              ]}>
                Calendar
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.toggleButton,
                currentView === 'map' && styles.activeToggleButton
              ]}
              onPress={() => setCurrentView('map')}
            >
              <Globe size={20} color={currentView === 'map' ? '#ffffff' : '#64748b'} />
              <Text style={[
                styles.toggleButtonText,
                currentView === 'map' && styles.activeToggleButtonText
              ]}>
                Map
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Area */}
        {currentView === 'calendar' ? (
          <>
            {/* Calendar Container */}
            <View style={styles.calendarContainer}>
              <Calendar
                markedDates={mergedMarkedDates}
                markingType="period"
                onDayPress={onDayPress}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'transparent',
                  textSectionTitleColor: '#64748b',
                  selectedDayBackgroundColor: '#8384a1ff',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#6366f1',
                  dayTextColor: '#1e293b',
                  textDisabledColor: '#cbd5e1',
                  dotColor: '#6366f1',
                  selectedDotColor: '#ffffff',
                  arrowColor: '#6366f1',
                  disabledArrowColor: '#cbd5e1',
                  monthTextColor: '#1e293b',
                  indicatorColor: '#6366f1',
                  textDayFontFamily: 'System',
                  textMonthFontFamily: 'System',
                  textDayHeaderFontFamily: 'System',
                  textDayFontWeight: '500',
                  textMonthFontWeight: '600',
                  textDayHeaderFontWeight: '600',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 13,
                }}
                style={styles.calendar}
              />
            </View>

            {/* Notes Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>
                {Object.keys(markedDates).filter((k) => !!markedDates[k]?.note).length} notes this month
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Map View */}
            <InteractiveMap 
              trips={trips} 
              onLocationSelect={(trip) => {
                // Optional: handle location selection
              }} 
            />
            
            {/* Map Statistics */}
            <View style={styles.mapStatsContainer}>
              <View style={styles.mapStatItem}>
                <MapPin size={20} color="#6366f1" />
                <Text style={styles.mapStatNumber}>{trips.length}</Text>
                <Text style={styles.mapStatLabel}>Cities</Text>
              </View>
              
              <View style={styles.mapStatItem}>
                <Camera size={20} color="#6366f1" />
                <Text style={styles.mapStatNumber}>
                  {trips.reduce((sum, trip) => sum + (trip.photos || 0), 0)}
                </Text>
                <Text style={styles.mapStatLabel}>Photos</Text>
              </View>
              
              <View style={styles.mapStatItem}>
                <BookOpen size={20} color="#6366f1" />
                <Text style={styles.mapStatNumber}>
                  {Object.keys(markedDates).filter((k) => !!markedDates[k]?.note).length}
                </Text>
                <Text style={styles.mapStatLabel}>Notes</Text>
              </View>
              
              <View style={styles.mapStatItem}>
                <Clock size={20} color="#6366f1" />
                <Text style={styles.mapStatNumber}>
                  {trips.reduce((sum, trip) => {
                    const start = new Date(trip.start);
                    const end = new Date(trip.end);
                    return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                  }, 0)}
                </Text>
                <Text style={styles.mapStatLabel}>Days</Text>
              </View>
            </View>
          </>
        )}

        {/* Modal for notes (only shown in calendar view) */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)']}
              style={styles.modalBackground}
            >
              <View style={styles.modalContent}>
                
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Edit3 size={20} color="#6366f1" />
                    <Text style={styles.modalTitle}>
                      {selectedDate ? formatDate(selectedDate) : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <X size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Note Input */}
                <ScrollView style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="What happened today? Write your thoughts here..."
                    placeholderTextColor="#94a3b8"
                    value={noteText}
                    onChangeText={setNoteText}
                    multiline
                    textAlignVertical="top"
                    autoFocus
                  />
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                 <TouchableOpacity
                    onPress={saveNote}
                    style={[styles.actionButton, styles.saveButton]}
                  >
                    <LinearGradient
                      colors={['#6366f1', '#4f46e5']}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.saveButtonText}>Save Note</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {selectedDate && markedDates[selectedDate]?.note && (
                    <TouchableOpacity
                      onPress={deleteNote}
                      style={[styles.actionButton, styles.deleteButton]}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </LinearGradient>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Top Spacing
  topSpacing: {
    height: 50,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 25,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  activeToggleButton: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  activeToggleButtonText: {
    color: '#ffffff',
  },
  
  // Calendar
  calendarContainer: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  calendar: {
    borderRadius: 15,
  },
  
  // Summary
  summaryContainer: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },

  // Map Styles
  mapContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
  },
  loadingSpinner: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  mapControls: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    gap: 8,
    zIndex: 1000,
  },
  mapControlButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeMapControl: {
    backgroundColor: '#6366f1',
  },
  mapControlText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  activeMapControlText: {
    color: '#ffffff',
  },
  locationDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  locationCountry: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  closeLocationButton: {
    padding: 4,
  },
  locationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  locationStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationStatText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },

  // Map Statistics
  mapStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mapStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  mapStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  mapStatLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    padding: 0,
    maxHeight: '55%',
    minHeight: '32%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // Modal Header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  
  // Input
  inputContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#ffffff',
  },
  input: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
    minHeight: 180,
    textAlignVertical: 'top',
  },
  
  // Buttons
  buttonContainer: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  actionButton: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  saveButton: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
});