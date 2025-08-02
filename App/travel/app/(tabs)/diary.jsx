import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Button,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DiaryCalendarScreen() {
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');

  // טען מה־AsyncStorage כשנטען המסך
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const storedData = await AsyncStorage.getItem('markedDates');
        if (storedData) {
          setMarkedDates(JSON.parse(storedData));
        }
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
      }
    };
    loadNotes();
  }, []);

  // שמור ל־AsyncStorage כשמעדכנים
  const saveToStorage = async (newData) => {
    try {
      await AsyncStorage.setItem('markedDates', JSON.stringify(newData));
    } catch (error) {
      Alert.alert('שגיאה', 'לא ניתן לשמור את התזכורת');
    }
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    const existing = markedDates[day.dateString]?.note || '';
    setNoteText(existing);
    setModalVisible(true);
  };

  const saveNote = () => {
    const updated = {
      ...markedDates,
      [selectedDate]: {
        marked: true,
        selected: true,
        note: noteText,
        selectedColor: '#00adf5',
      },
    };
    setMarkedDates(updated);
    saveToStorage(updated); // שמור ב־AsyncStorage
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>יומן לוח חודשי</Text>
      <Calendar
        markedDates={markedDates}
        onDayPress={onDayPress}
        theme={{
          todayTextColor: '#00adf5',
          selectedDayBackgroundColor: '#00adf5',
          arrowColor: '#00adf5',
        }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedDate}</Text>
            <TextInput
              style={styles.input}
              placeholder="הזן תזכורת ליום הזה..."
              value={noteText}
              onChangeText={setNoteText}
              multiline
            />
            <Button title="שמור" onPress={saveNote} />
            <Button
              title="ביטול"
              color="red"
              onPress={() => setModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 10 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#00000055',
  },
  modalContent: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: { fontSize: 20, marginBottom: 10, textAlign: 'center' },
  input: {
    height: 100,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    padding: 8,
    textAlignVertical: 'top',
  },
});
