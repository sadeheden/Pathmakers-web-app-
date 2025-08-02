import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [destinationText, setDestinationText] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [loadingDest, setLoadingDest] = useState(false);
  const [distanceKm, setDistanceKm] = useState(null); // ✅ חדש
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use the map.');
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
    })();
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // רדיוס כדור הארץ בק"מ
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // מרחק בק"מ
  };

  const handleSetDestination = async () => {
    if (!destinationText.trim()) return;
    if (loadingDest) return;

    setLoadingDest(true);
    try {
      let geo = await Location.geocodeAsync(destinationText);
      if (geo.length > 0) {
        const coords = {
          latitude: geo[0].latitude,
          longitude: geo[0].longitude,
        };
        setDestinationCoords(coords);

        // ✅ חישוב מרחק
        if (location) {
          const dist = calculateDistance(
            location.latitude,
            location.longitude,
            coords.latitude,
            coords.longitude
          );
          setDistanceKm(dist.toFixed(2));
        }
      } else {
        Alert.alert('Not Found', 'Could not find the destination.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to get coordinates.');
    }
    setLoadingDest(false);
  };

  const onChangeDestinationText = (text) => {
    setDestinationText(text);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleSetDestination();
    }, 1000);
  };

  const clearDestinationText = () => {
    setDestinationText('');
    setDestinationCoords(null);
    setDistanceKm(null); // ✅ ניקוי גם של המרחק
  };

  // ✅ זמן משוער לפי מהירות
  const getEstimatedTime = (speedKmh) => {
    if (!distanceKm) return null;
    const timeHours = distanceKm / speedKmh;
    const minutes = Math.round(timeHours * 60);
    return `${minutes} דקות`;
  };

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          showsUserLocation={true}
        >
          {destinationCoords && (
            <>
              <Marker coordinate={destinationCoords} title="Destination" />
              <Polyline
                coordinates={[
                  { latitude: location.latitude, longitude: location.longitude },
                  destinationCoords,
                ]}
                strokeColor="#0000FF"
                strokeWidth={4}
              />
            </>
          )}
        </MapView>
      ) : (
        <View style={styles.loading}>
          <Text>Loading location...</Text>
        </View>
      )}

      {/* ✅ תיבת מידע על היעד */}
      {destinationCoords && distanceKm && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📍 {destinationText}</Text>
          <Text>מרחק: {distanceKm} ק"מ</Text>
          <Text>⏱️ זמן בהליכה (5 קמ"ש): {getEstimatedTime(5)}</Text>
          <Text>🚗 זמן בנסיעה (50 קמ"ש): {getEstimatedTime(50)}</Text>
        </View>
      )}

      {/* תיבת קלט */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter destination"
          value={destinationText}
          onChangeText={onChangeDestinationText}
          editable={!loadingDest}
          returnKeyType="done"
        />
        {destinationText.length > 0 && (
          <TouchableOpacity onPress={clearDestinationText} style={{ marginHorizontal: 8 }}>
            <Ionicons name="close-circle" size={24} color="#aaa" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleSetDestination} disabled={loadingDest}>
          <Ionicons name="navigate-outline" size={28} color={loadingDest ? '#aaa' : '#1E90FF'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  infoBox: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  infoTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
});
