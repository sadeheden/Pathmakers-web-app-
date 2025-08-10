// app/(tabs)/weather.jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StatusBar, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import {
  MapPin, Wind, Droplets, Eye, RefreshCw,
  CloudRain, Sun, Cloud, CloudSnow, Zap, Navigation, Calendar,
  Sunrise, Sunset, CloudDrizzle, CloudLightning
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Enhanced weather icons
const weatherIcons = {
  '01d': Sun,
  '01n': Sun,
  '02d': Cloud,
  '02n': Cloud,
  '03d': Cloud,
  '03n': Cloud,
  '04d': Cloud,
  '09d': CloudDrizzle,
  '10d': CloudRain,
  '11d': CloudLightning,
  '13d': CloudSnow
};

// Map WMO weather codes to icon keys
function mapWmoToIcon(code, isDay = true) {
  if (code === 0) return isDay ? '01d' : '01n';
  if ([1,2,3].includes(code)) return isDay ? '02d' : '02n';
  if ([45,48].includes(code)) return '04d';
  if ([51,53,55,56,57].includes(code)) return '09d';
  if ([61,63,65,66,67,80,81,82].includes(code)) return '10d';
  if ([71,73,75,77,85,86].includes(code)) return '13d';
  if ([95,96,97,98,99].includes(code)) return '11d';
  return '04d';
}

function describe(code) {
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    56: 'Freezing drizzle', 57: 'Freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    66: 'Freezing rain', 67: 'Heavy freezing rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
    85: 'Snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Severe thunderstorm'
  };
  return map[code] || 'Cloudy';
}

// Get light neutral gradient colors based on weather
function getWeatherGradient(weatherCode, temp) {
  if (weatherCode === 0) { // Clear
    return ['#d1d5db', '#9ca3af', '#6b7280'];
  }
  if ([61,63,65,80,81,82].includes(weatherCode)) { // Rain
    return ['#9ca3af', '#6b7280', '#4b5563'];
  }
  if ([71,73,75,85,86].includes(weatherCode)) { // Snow
    return ['#f3f4f6', '#d1d5db', '#9ca3af'];
  }
  if ([95,96,97].includes(weatherCode)) { // Thunder
    return ['#6b7280', '#4b5563', '#374151'];
  }
  // Default cloudy
  return ['#d1d5db', '#9ca3af', '#6b7280'];
}

const WeatherApp = () => {
  const [city, setCity] = useState('Tel Aviv, Israel');
  const [currentWeather, setCurrentWeather] = useState(null);
  const [weeklyForecast, setWeeklyForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mock weather data for demo
  useEffect(() => {
    const mockCurrentWeather = {
      temp: 28,
      icon: '01d',
      description: 'Sunny',
      humidity: 45,
      windSpeed: 12,
      visibility: 10,
      uvIndex: 8,
      feelsLike: 32,
      pressure: 1013,
      sunrise: '06:24',
      sunset: '19:45'
    };

    const mockForecast = [
      { day: 'Today', date: 'Aug 10', minTemp: 22, maxTemp: 28, icon: '01d', description: 'Sunny', precipitationChance: 0 },
      { day: 'Mon', date: 'Aug 11', minTemp: 24, maxTemp: 30, icon: '02d', description: 'Partly cloudy', precipitationChance: 10 },
      { day: 'Tue', date: 'Aug 12', minTemp: 23, maxTemp: 27, icon: '10d', description: 'Light rain', precipitationChance: 85 },
      { day: 'Wed', date: 'Aug 13', minTemp: 21, maxTemp: 25, icon: '10d', description: 'Rain', precipitationChance: 90 },
      { day: 'Thu', date: 'Aug 14', minTemp: 22, maxTemp: 26, icon: '02d', description: 'Partly cloudy', precipitationChance: 20 },
      { day: 'Fri', date: 'Aug 15', minTemp: 24, maxTemp: 29, icon: '01d', description: 'Sunny', precipitationChance: 5 },
      { day: 'Sat', date: 'Aug 16', minTemp: 25, maxTemp: 31, icon: '01d', description: 'Sunny', precipitationChance: 0 }
    ];

    setTimeout(() => {
      setCurrentWeather(mockCurrentWeather);
      setWeeklyForecast(mockForecast);
      setLoading(false);
    }, 1500);

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const refreshWeather = () => {
    setLoading(true);
    setTimeout(() => {
      setCurrentWeather(prev => ({
        ...prev,
        temp: prev.temp + (Math.random() - 0.5) * 4
      }));
      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <LinearGradient colors={['#f3f4f6', '#d1d5db', '#9ca3af']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" />
          <View style={styles.centered}>
            <View style={styles.loadingIcon}>
              <RefreshCw size={64} color="white" style={{ transform: [{ rotate: '45deg' }] }} />
            </View>
            <Text style={styles.loadingTitle}>Getting Your Weather</Text>
            <Text style={styles.loadingSubtitle}>Fetching current location and forecast...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#9ca3af', '#6b7280']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" />
          <View style={[styles.centered, { paddingHorizontal: 16 }]}>
            <View style={styles.errorIcon}>
              <MapPin size={40} color="white" />
            </View>
            <Text style={styles.errorTitle}>Location Error</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity onPress={refreshWeather} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const WeatherIcon = weatherIcons[currentWeather?.icon] || Cloud;
  const gradientColors = getWeatherGradient(0, currentWeather?.temp || 25);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.locationRow}>
              <MapPin size={20} color="rgba(255,255,255,0.9)" />
              <Text style={styles.cityName}>{city}</Text>
            </View>
            <Text style={styles.dateText}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={styles.timeText}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* Current Weather Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.mainWeatherRow}>
                <View style={styles.weatherIconContainer}>
                  <WeatherIcon size={56} color="white" />
                </View>
                <View style={styles.tempContainer}>
                  <Text style={styles.temperature}>
                    {Math.round(currentWeather?.temp)}°
                  </Text>
                  <Text style={styles.description}>
                    {currentWeather?.description}
                  </Text>
                  <Text style={styles.feelsLike}>
                    Feels like {currentWeather?.feelsLike}°
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={refreshWeather} style={styles.refreshButton}>
                <RefreshCw size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Weather Details Grid */}
            <View style={styles.detailsGrid}>
              {[
                { icon: Wind, label: 'Wind Speed', value: `${currentWeather?.windSpeed} km/h` },
                { icon: Droplets, label: 'Humidity', value: `${currentWeather?.humidity}%` },
                { icon: Eye, label: 'Visibility', value: `${currentWeather?.visibility} km` },
                { icon: Navigation, label: 'Pressure', value: `${currentWeather?.pressure} hPa` },
              ].map(({ icon: Icon, label, value }, i) => (
                <View key={i} style={styles.detailCard}>
                  <View style={styles.detailIcon}>
                    <Icon size={24} color="white" />
                  </View>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ))}
            </View>

            {/* Sun Times */}
            <View style={styles.sunTimesContainer}>
              <View style={styles.sunTimeItem}>
                <Sunrise size={20} color="#fcd34d" />
                <View style={styles.sunTimeText}>
                  <Text style={styles.sunTimeLabel}>Sunrise</Text>
                  <Text style={styles.sunTimeValue}>{currentWeather?.sunrise}</Text>
                </View>
              </View>
              <View style={styles.sunTimeItem}>
                <Sunset size={20} color="#fb923c" />
                <View style={styles.sunTimeText}>
                  <Text style={styles.sunTimeLabel}>Sunset</Text>
                  <Text style={styles.sunTimeValue}>{currentWeather?.sunset}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 7-Day Forecast */}
          <View style={styles.forecastCard}>
            <View style={styles.forecastHeader}>
              <Calendar size={22} color="rgba(255,255,255,0.9)" />
              <Text style={styles.forecastTitle}>7-Day Forecast</Text>
            </View>

            <View style={styles.forecastList}>
              {weeklyForecast?.map((day, index) => {
                const DayIcon = weatherIcons[day.icon] || Cloud;
                const isToday = index === 0;
                return (
                  <View
                    key={index}
                    style={[
                      styles.forecastItem,
                      isToday && styles.todayForecast
                    ]}
                  >
                    <View style={styles.forecastLeft}>
                      <View style={styles.dayContainer}>
                        <Text style={styles.dayName}>{day.day}</Text>
                        <Text style={styles.dayDate}>{day.date}</Text>
                      </View>
                      
                      <View style={styles.forecastIconRow}>
                        <View style={styles.forecastIconContainer}>
                          <DayIcon size={20} color="white" />
                        </View>
                        <View style={styles.forecastDescription}>
                          <Text style={styles.forecastDescriptionText}>
                            {day.description}
                          </Text>
                          {day.precipitationChance > 20 && (
                            <View style={styles.precipitationRow}>
                              <Droplets size={12} color="#d1d5db" />
                              <Text style={styles.precipitationText}>
                                {day.precipitationChance}%
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.forecastRight}>
                      <View style={styles.tempRow}>
                        <Text style={styles.maxTemp}>
                          {day.maxTemp}°
                        </Text>
                        <Text style={styles.minTemp}>
                          {day.minTemp}°
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Weather data powered by Open-Meteo
            </Text>
            <Text style={styles.footerSubtext}>
              Last updated: {currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Loading styles
  loadingIcon: {
    marginBottom: 16,
  },
  loadingTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
  },
  
  // Error styles
  errorIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cityName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  dateText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  timeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  
  // Hero card styles
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  mainWeatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weatherIconContainer: {
    backgroundColor: 'rgba(241, 231, 231, 0.4)',
    padding: 16,
    borderRadius: 16,
    marginRight: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tempContainer: {
    flex: 1,
  },
  temperature: {
    color: 'white',
    fontSize: 72,
    fontWeight: 'bold',
    lineHeight: 72,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 20,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  feelsLike: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  refreshButton: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Details grid styles
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  detailCard: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailIcon: {
    marginBottom: 12,
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  detailValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Sun times styles
  sunTimesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 16,
    borderRadius: 16,
  },
  sunTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sunTimeText: {
    alignItems: 'flex-start',
  },
  sunTimeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  sunTimeValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Forecast styles
  forecastCard: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  forecastTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  forecastList: {
    gap: 12,
  },
  forecastItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 246, 246, 0.15)',
    padding: 16,
    borderRadius: 16,
  },
  todayForecast: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  forecastLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayContainer: {
    width: 56,
  },
  dayName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  dayDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  forecastIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  forecastIconContainer: {
    backgroundColor: 'rgba(121, 95, 95, 0.2)',
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  forecastDescription: {
    flex: 1,
  },
  forecastDescriptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  precipitationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  precipitationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  forecastRight: {
    alignItems: 'flex-end',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  maxTemp: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  minTemp: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Footer styles
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 16,
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  footerSubtext: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    marginTop: 4,
  },
});

export default WeatherApp;