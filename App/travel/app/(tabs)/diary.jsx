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
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit3, Save, X, BookOpen, Calendar as CalendarIcon } from 'lucide-react-native';

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

// Fallback city name mapping (same idea as in profile.jsx)
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

export default function DiaryCalendarScreen() {
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');

  // ---- Trip state (auto-filled from orders API) ----
  const [tripStart, setTripStart] = useState(null);
  const [tripEnd, setTripEnd] = useState(null);
  const [tripLabel, setTripLabel] = useState(null);
// is a YYYY-MM-DD inside [start, end] (inclusive)?
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

  // Fetch latest order and set trip info (destination + dates)
  useEffect(() => {
    const loadTripFromOrders = async () => {
      try {
        // read token like profile.jsx (and clean any quotes)
        const raw = await AsyncStorage.getItem('token');
        const token = raw?.replace(/^"|"$/g, '') || null;
        if (!token) return; // user not logged-in yet

        const resp = await fetch('https://pathmakers-web-app-app-travel.onrender.com/api/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!resp.ok) {
          // swallow error to avoid breaking the screen
          console.log('Orders fetch failed:', await resp.text());
          return;
        }

        const data = await resp.json();
        const orders = Array.isArray(data?.orders) ? data.orders : [];

        if (!orders.length) return;

        // take the most recent order
        const latest = orders[0];

        // destination label
        const destName = getCityName(latest.destination_city_name, latest.destination_city_id);
        setTripLabel(destName ? `Have fun in ${destName}` : 'Your Trip');

        // choose dates:
        // 1) if backend later provides trip_start/trip_end, use them
        // 2) else fallback: created_at as start + 6 days window
        const explicitStart = latest.trip_start || latest.start_date || null;
        const explicitEnd = latest.trip_end || latest.end_date || null;

        if (explicitStart && explicitEnd) {
          setTripStart(String(explicitStart).slice(0, 10));
          setTripEnd(String(explicitEnd).slice(0, 10));
        } else if (latest.created_at) {
          const created = new Date(latest.created_at);
          const startIso = toISO(created);
          const end = new Date(created);
          end.setDate(end.getDate() + 6);
          const endIso = toISO(end);
          setTripStart(startIso);
          setTripEnd(endIso);
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

  // If no saved note and the clicked day is inside the trip range,
  // prefill the popup with the destination (from your tripLabel).
  let initialText = existing;
  if (!existing && tripStart && tripEnd && isBetween(dateStr, tripStart, tripEnd)) {
    // try to extract the destination name from "Trip to XYZ"
    const dest =
      (tripLabel && tripLabel.replace(/^Trip to\s*/i, '').trim()) || 'your destination';
    initialText = `Trip to ${dest}`;
  }

  setNoteText(initialText);
  setModalVisible(true);
};


  const saveNote = () => {
    if (noteText.trim()) {
      const updated = {
        ...markedDates,
        [selectedDate]: {
          ...(markedDates[selectedDate] || {}),
          marked: true,
          selected: true,
          note: noteText.trim(),
          selectedColor: '#6366f1',
          selectedTextColor: '#ffffff',
        },
      };
      setMarkedDates(updated);
      saveToStorage(updated);
    } else {
      // Remove the note if text is empty
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
    if (!tripStart || !tripEnd) return {};
    const days = buildDateRange(tripStart, tripEnd);
    const out = {};
    const color = '#8ac0fdff';
    const textColor = '#1f2937';
    days.forEach((d, i) => {
      out[d] = {
        ...(out[d] || {}),
        color,
        textColor,
        startingDay: i === 0,
        endingDay: i === days.length - 1,
      };
    });
    return out;
  })();

  // Merge trip band with notes (keep your saved note visuals)
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
           
            <Text style={styles.title}>My Diary</Text>
           
          </View>
          <Text style={styles.subtitle}>
            {tripLabel ? tripLabel : 'Capture your daily moments'}
          </Text>
        </View>

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
              selectedDayBackgroundColor: '#6366f1',
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

        {/* Modal */}
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
                      <Save size={18} color="#ffffff" />
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
