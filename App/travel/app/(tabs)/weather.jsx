import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

// Function that generates fake weather for a city by name
function generateFakeWeather(cityName) {
  const icons = ['01d', '02d', '03d', '09d', '10d', '11d', '13d'];
  const descriptions = [
    'Sunny and pleasant',
    'Partly cloudy',
    'Light rain',
    'Stormy',
    'Cloudy',
    'Heavy rain',
    'Light snow',
  ];
  
  const hash = cityName
    ? cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0;
  
  const temp = 15 + (hash % 20); // between 15 and 35 degrees
  const icon = icons[hash % icons.length];
  const description = descriptions[hash % descriptions.length];
  
  return { temp, icon, description };
}

// Function that generates a weekly forecast
function generateWeeklyForecast(cityName) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const forecast = [];
  
  for (let i = 0; i < 7; i++) {
    const dayHash = cityName ? cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0) + i * 123, 0) : i * 123;
    
    const icons = ['01d', '02d', '03d', '09d', '10d', '11d', '13d', '04d'];
    const descriptions = [
      'Sunny and pleasant',
      'Partly cloudy', 
      'Light rain',
      'Stormy',
      'Cloudy',
      'Heavy rain',
      'Light snow',
      'Heavy clouds'
    ];
    
    const minTemp = 10 + (dayHash % 15);
    const maxTemp = minTemp + 5 + (dayHash % 10);
    const icon = icons[dayHash % icons.length];
    const description = descriptions[dayHash % descriptions.length];
    
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    
    forecast.push({
      day: i === 0 ? 'Today' : daysOfWeek[futureDate.getDay()],
      date: futureDate.toLocaleDateString('en-US'),
      minTemp,
      maxTemp,
      icon,
      description
    });
  }
  
  return forecast;
}

// Function simulating location permission with a list of cities
function simulateLocationPermission() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cities = [
        'Paris', 'London', 'New York', 'Tokyo', 'Rome', 'Los Angeles', 
        'Berlin', 'Barcelona', 'Dubai', 'Amsterdam', 'San Francisco', 
        'Madrid', 'Seoul'
      ];
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      resolve({ granted: true, city: randomCity });
    }, 2000);
  });
}

export default function WeatherByLocation() {
  const [city, setCity] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [weeklyForecast, setWeeklyForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const requestLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await simulateLocationPermission();
      
      if (!result.granted) {
        setError('Location permission denied. Please try again or enter a city manually.');
        setLoading(false);
        return;
      }

      const cityName = result.city;
      setCity(cityName);
      
      const fakeWeather = generateFakeWeather(cityName);
      setCurrentWeather(fakeWeather);
      
      const forecast = generateWeeklyForecast(cityName);
      setWeeklyForecast(forecast);
      
    } catch (error) {
      setError('Unable to get location or weather data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>Loading weekly weather forecast...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, styles.errorContainer]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={requestLocation} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentWeather || !weeklyForecast) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>No weather information found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Current Weather */}
      <View style={styles.currentWeatherContainer}>
        <Text style={styles.title}>Weather in {city}</Text>
        <View style={styles.weatherBox}>
          <Image
            source={{ uri: `https://openweathermap.org/img/wn/${currentWeather.icon}@4x.png` }}
            style={styles.weatherIcon}
          />
          <View>
            <Text style={styles.tempText}>{currentWeather.temp.toFixed(1)}°C</Text>
            <Text style={styles.descText}>{currentWeather.description}</Text>
          </View>
        </View>
      </View>

      {/* Weekly Forecast */}
      <View style={styles.weeklyForecastContainer}>
        <Text style={styles.subTitle}>7-Day Forecast</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weeklyScroll}>
          {weeklyForecast.map((day, index) => (
            <View key={index} style={styles.dayContainer}>
              <Text style={styles.dayText}>{day.day}</Text>
              <View style={styles.iconBackground}>
                <Image
                  source={{ uri: `https://openweathermap.org/img/wn/${day.icon}@2x.png` }}
                  style={styles.dayIcon}
                />
              </View>
              <View style={styles.temps}>
                <Text style={styles.maxTemp}>{day.maxTemp}°</Text>
                <Text style={styles.minTemp}>{day.minTemp}°</Text>
              </View>
              <Text style={styles.dayDesc}>{day.description}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Update Button */}
      <TouchableOpacity onPress={requestLocation} style={styles.updateButton}>
        <Text style={styles.updateButtonText}>🔄 Update Location</Text>
      </TouchableOpacity>

      <Text style={styles.note}>*Fake forecast for demonstration purposes</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#dbeafe',
    flexGrow: 1,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    padding: 20,
    width: '90%',
  },
  errorIcon: {
    fontSize: 64,
    color: '#dc2626',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 18,
    color: '#b91c1c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
  },
  currentWeatherContainer: {
    marginBottom: 32,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1e40af',
  },
  weatherBox: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    width: '100%',
  },
  weatherIcon: {
    width: 100,
    height: 100,
  },
  tempText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  descText: {
    fontSize: 18,
    marginTop: 6,
    color: '#374151',
  },
  weeklyForecastContainer: {
    width: '100%',
    marginBottom: 32,
  },
  subTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 16,
    textAlign: 'center',
  },
  weeklyScroll: {
    paddingLeft: 8,
  },
  dayContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    width: 90,
  },
  dayText: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e40af',
  },
  iconBackground: {
    backgroundColor: '#3b82f6',
    borderRadius: 50,
    padding: 8,
    marginBottom: 8,
  },
  dayIcon: {
    width: 40,
    height: 40,
  },
  temps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  maxTemp: {
    fontWeight: 'bold',
    color: '#2563eb',
  },
  minTemp: {
    color: '#6b7280',
  },
  dayDesc: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  updateButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 12,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});