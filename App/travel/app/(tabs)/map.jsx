import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, Alert, TouchableOpacity, Platform, Linking } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const GEOAPIFY_KEY = 'YOUR_GEOAPIFY_API_KEY_HERE'; // ← replace me

const TAB_BAR_MARGIN = 40;       // space to clear your bottom tab
const SEARCH_BOX_HEIGHT = 56;    // ~ height of the search box
const GAP = 14;                  // gap between info box and search box

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [destinationText, setDestinationText] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [loadingDest, setLoadingDest] = useState(false);

  const [distanceKm, setDistanceKm] = useState(null);
  const [routeMode, setRouteMode] = useState('drive'); // 'drive' | 'walk' | 'bicycle'

  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const mapRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use the map.');
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
    })();
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fetch route from Geoapify and convert to RN coords
  const fetchRoute = async (from, to, mode = 'drive') => {
    try {
      const waypoints = `${from.latitude},${from.longitude}|${to.latitude},${to.longitude}`;
      const url = `https://api.geoapify.com/v1/routing?waypoints=${encodeURIComponent(waypoints)}&mode=${mode}&apiKey=${GEOAPIFY_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      const feature = json?.features?.[0];
      if (!feature) throw new Error('No route found');

      const coordsLngLat = feature.geometry.coordinates;
      const flat = Array.isArray(coordsLngLat?.[0]?.[0]) ? coordsLngLat.flat() : coordsLngLat;
      const polylineCoords = flat.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));

      setRouteCoords(polylineCoords);

      const distanceMeters = feature.properties?.distance;
      const timeSeconds = feature.properties?.time;
      setRouteInfo({ distanceMeters, timeSeconds, mode });

      if (mapRef.current && polylineCoords.length > 1) {
        mapRef.current.fitToCoordinates(polylineCoords, {
          edgePadding: { top: 100, right: 60, bottom: 180, left: 60 },
          animated: true,
        });
      }
    } catch (e) {
      console.log(e);
      Alert.alert('Routing error', 'Failed to get directions.');
      setRouteCoords([]);
      setRouteInfo(null);
    }
  };

  const handleSetDestination = async () => {
    if (!destinationText.trim() || loadingDest) return;
    setLoadingDest(true);
    try {
      const geo = await Location.geocodeAsync(destinationText);
      if (geo.length > 0) {
        const coords = { latitude: geo[0].latitude, longitude: geo[0].longitude };
        setDestinationCoords(coords);

        if (location) {
          const dist = calculateDistance(location.latitude, location.longitude, coords.latitude, coords.longitude);
          setDistanceKm(dist.toFixed(2));
          await fetchRoute(location, coords, routeMode);
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
    }, 800);
  };

  const clearDestinationText = () => {
    setDestinationText('');
    setDestinationCoords(null);
    setDistanceKm(null);
    setRouteCoords([]);
    setRouteInfo(null);
  };

  const getEstimatedTime = (speedKmh) => {
    if (!distanceKm) return null;
    const timeHours = distanceKm / speedKmh;
    const minutes = Math.round(timeHours * 60);
    return `${minutes} min`;
  };

  const formatMetersToKm = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);
  const formatSecondsToMin = (s) => `${Math.round(s / 60)} min`;

  // ---- OPEN EXTERNAL NAVIGATION ----
  const openExternalNavigation = async () => {
    if (!destinationCoords) return;

    const { latitude, longitude } = destinationCoords;
    const travelmode =
      routeMode === 'walk' ? 'walking' :
      routeMode === 'bicycle' ? 'bicycling' : 'driving';

    // Try Waze
    const waze = `waze://?ll=${latitude},${longitude}&navigate=yes`;
    if (await Linking.canOpenURL('waze://')) {
      return Linking.openURL(waze);
    }

    // Try Google Maps app
    const gmapsApp = Platform.select({
      ios: `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=${travelmode}`,
      android: `google.navigation:q=${latitude},${longitude}&mode=${travelmode === 'walking' ? 'w' : travelmode === 'bicycling' ? 'b' : 'd'}`,
    });

    const canOpenGmaps = await Linking.canOpenURL(
      Platform.OS === 'ios' ? 'comgooglemaps://' : 'google.navigation:'
    );
    if (canOpenGmaps) return Linking.openURL(gmapsApp);

    // Try Apple Maps (iOS)
    if (Platform.OS === 'ios') {
      const apple = `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=${
        travelmode === 'walking' ? 'w' : 'd'
      }`;
      return Linking.openURL(apple);
    }

    // Fallback: Google Maps web
    const gmapsWeb = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=${travelmode}`;
    return Linking.openURL(gmapsWeb);
  };

  const changeMode = async (mode) => {
    setRouteMode(mode);
    if (location && destinationCoords) {
      await fetchRoute(location, destinationCoords, mode);
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          showsUserLocation
        >
          {destinationCoords && <Marker coordinate={destinationCoords} title="Destination" />}

          {routeCoords.length > 1 ? (
            <Polyline coordinates={routeCoords} strokeColor="#0000FF" strokeWidth={4} />
          ) : (
            destinationCoords && (
              <Polyline
                coordinates={[
                  { latitude: location.latitude, longitude: location.longitude },
                  destinationCoords,
                ]}
                strokeColor="#0000FF"
                strokeWidth={4}
              />
            )
          )}
        </MapView>
      ) : (
        <View style={styles.loading}>
          <Text>Loading location...</Text>
        </View>
      )}

      {(destinationCoords && (distanceKm || routeInfo)) && (
        <View
          style={[
            styles.infoBox,
            { bottom: TAB_BAR_MARGIN + SEARCH_BOX_HEIGHT + GAP },
          ]}
          pointerEvents="box-none"
        >
          <Text style={styles.infoTitle}>📍 {destinationText}</Text>
          {distanceKm && <Text>Straight distance: {distanceKm} km</Text>}
          {routeInfo && (
            <>
              <Text>Route distance: {formatMetersToKm(routeInfo.distanceMeters)}</Text>
              <Text>ETA ({routeInfo.mode}): {formatSecondsToMin(routeInfo.timeSeconds)}</Text>
            </>
          )}
          {distanceKm && (
            <>
              <Text>Walk (5 km/h): {getEstimatedTime(5)}</Text>
              <Text>Drive (50 km/h): {getEstimatedTime(50)}</Text>
            </>
          )}
        </View>
      )}

      {/* Bottom bar: search + actions */}
      <View style={[styles.inputContainer, { bottom: TAB_BAR_MARGIN }]}>
        <TextInput
          style={styles.input}
          placeholder="Search destination (e.g., Eiffel Tower)"
          value={destinationText}
          onChangeText={onChangeDestinationText}
          editable={!loadingDest}
          returnKeyType="search"
        />
        {destinationText.length > 0 && (
          <TouchableOpacity onPress={clearDestinationText} style={{ marginHorizontal: 8 }}>
            <Ionicons name="close-circle" size={22} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleSetDestination} disabled={loadingDest} style={{ marginRight: 6 }}>
          <Ionicons name="search" size={24} color={loadingDest ? '#aaa' : '#1E90FF'} />
        </TouchableOpacity>

        {/* Mode toggle (optional) */}
        <TouchableOpacity onPress={() => changeMode('walk')} style={[styles.modeBtn, routeMode === 'walk' && styles.modeBtnActive]}>
          <Ionicons name="walk" size={18} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeMode('bicycle')} style={[styles.modeBtn, routeMode === 'bicycle' && styles.modeBtnActive]}>
          <Ionicons name="bicycle" size={18} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeMode('drive')} style={[styles.modeBtn, routeMode === 'drive' && styles.modeBtnActive]}>
          <Ionicons name="car" size={18} />
        </TouchableOpacity>

        {/* Start Navigation */}
        <TouchableOpacity onPress={openExternalNavigation} disabled={!destinationCoords} style={styles.navBtn}>
          <Ionicons name="navigate-outline" size={22} color={destinationCoords ? '#fff' : '#ccc'} />
          <Text style={[styles.navBtnText, { color: destinationCoords ? '#fff' : '#ccc' }]}>Start</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  inputContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'white',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 20,
    minHeight: SEARCH_BOX_HEIGHT,
  },

  input: { flex: 1, fontSize: 15 },

  modeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 3,
  },
  modeBtnActive: {
    backgroundColor: '#e0f0ff',
  },

  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E90FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 6,
  },
  navBtnText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },

  infoBox: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 10,
  },

  infoTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
});
