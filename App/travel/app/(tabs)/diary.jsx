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

export default function DiaryCalendarScreen() {
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');

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

  // Save to AsyncStorage when updating
  const saveToStorage = async (newData) => {
    try {
      await AsyncStorage.setItem('markedDates', JSON.stringify(newData));
    } catch (error) {
      Alert.alert('Error', 'Unable to save your note');
    }
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    const existing = markedDates[day.dateString]?.note || '';
    setNoteText(existing);
    setModalVisible(true);
  };

  const saveNote = () => {
    if (noteText.trim()) {
      const updated = {
        ...markedDates,
        [selectedDate]: {
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

  return (
    <LinearGradient colors={['#f8fafc', '#e2e8f0', '#cbd5e1']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Spacing */}
        <View style={styles.topSpacing} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <BookOpen size={28} color="#6366f1" />
            <Text style={styles.title}>My Diary</Text>
            <CalendarIcon size={28} color="#6366f1" />
          </View>
          <Text style={styles.subtitle}>Capture your daily moments</Text>
        </View>

        {/* Calendar Container */}
        <View style={styles.calendarContainer}>
          <Calendar
            markedDates={markedDates}
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
            {Object.keys(markedDates).length} notes this month
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

                  {markedDates[selectedDate]?.note && (
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