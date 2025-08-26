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
import { OPENWEATHER_API_KEY } from '@env';

console.log('OPENWEATHER_API_KEY:', OPENWEATHER_API_KEY);

// Enhanced weather icons
const weatherIcons = {
  '01d': Sun, '01n': Sun,
  '02d': Cloud, '02n': Cloud,
  '03d': Cloud, '03n': Cloud,
  '04d': Cloud,
  '09d': CloudDrizzle, '09n': CloudDrizzle,
  '10d': CloudRain, '10n': CloudRain,
  '11d': CloudLightning, '11n': CloudLightning,
  '13d': CloudSnow, '13n': CloudSnow
};

// Gradient based on weather
function getWeatherGradient(weatherCode) {
  if (weatherCode === '01d') return ['#8bc4f0ff', '#2c8fdaff', '#8bc4f0ff'];
  if (['10d', '09d'].includes(weatherCode)) return ['#76c7ea', '#47b8e0', '#2c8fdaff'];
  if (['13d'].includes(weatherCode)) return ['#c0f0f8', '#32a1b3ff', '#50c7de'];
  if (['11d'].includes(weatherCode)) return ['#086175ff', '#289fc4', '#1c7aa8'];
  return ['#a0e9f0', '#5fdde5', '#2acfd6'];
}

const WeatherApp = () => {
  const [city, setCity] = useState('Loading...');
  const [currentWeather, setCurrentWeather] = useState(null);
  const [weeklyForecast, setWeeklyForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch current weather using free API
  const fetchCurrentWeather = async (lat, lon) => {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
    );
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Current weather API error: ${response.status} - ${text}`);
    }
    
    return await response.json();
  };

  // Fetch 5-day forecast using free API
  const fetchForecast = async (lat, lon) => {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
    );
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Forecast API error: ${response.status} - ${text}`);
    }
    
    return await response.json();
  };

  // Process forecast data to get daily forecasts
  const processForecastData = (forecastData) => {
    const dailyForecasts = {};
    
    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = {
          date: item.dt,
          temps: [],
          weather: item.weather[0],
          humidity: item.main.humidity,
          wind: item.wind.speed,
          pop: item.pop || 0
        };
      }
      dailyForecasts[date].temps.push(item.main.temp);
    });

    return Object.values(dailyForecasts).slice(0, 7).map((day, index) => ({
      day: index === 0 ? 'Today' : new Date(day.date * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      date: new Date(day.date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      minTemp: Math.min(...day.temps),
      maxTemp: Math.max(...day.temps),
      icon: day.weather.icon,
      description: day.weather.description,
      precipitationChance: day.pop * 100
    }));
  };

  // Fetch weather data
  const fetchWeather = async (lat, lon) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both current weather and forecast
      const [currentData, forecastData] = await Promise.all([
        fetchCurrentWeather(lat, lon),
        fetchForecast(lat, lon)
      ]);

      // Set city name
      setCity(`${currentData.name}, ${currentData.sys.country}`);

      // Set current weather
      setCurrentWeather({
        temp: currentData.main.temp,
        icon: currentData.weather[0].icon,
        description: currentData.weather[0].description,
        humidity: currentData.main.humidity,
        windSpeed: currentData.wind.speed,
        visibility: currentData.visibility / 1000,
        pressure: currentData.main.pressure,
        feelsLike: currentData.main.feels_like,
        sunrise: new Date(currentData.sys.sunrise * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        sunset: new Date(currentData.sys.sunset * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
      });

      // Process and set weekly forecast
      setWeeklyForecast(processForecastData(forecastData));
      setLoading(false);
      
    } catch (err) {
      console.log('Weather fetch error:', err);
      setError(`Failed to fetch weather data: ${err.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied. Please enable location access.');
          setLoading(false);
          return;
        }
        
        const location = await Location.getCurrentPositionAsync({});
        console.log('Location obtained:', location.coords);
        await fetchWeather(location.coords.latitude, location.coords.longitude);

        // Update time every minute
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
      } catch (err) {
        console.log('Location error:', err);
        setError(`Location error: ${err.message}`);
        setLoading(false);
      }
    })();
  }, []);

  const refreshWeather = async () => {
    try {
      setCurrentWeather(null);
      setWeeklyForecast(null);
      setLoading(true);
      
      const location = await Location.getCurrentPositionAsync({});
      await fetchWeather(location.coords.latitude, location.coords.longitude);
    } catch (err) {
      console.log('Refresh error:', err);
      setError(`Refresh failed: ${err.message}`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#f3f4f6', '#d1d5db', '#9ca3af']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" />
          <View style={styles.centered}>
            <RefreshCw size={64} color="white" style={{ transform: [{ rotate: '45deg' }] }} />
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
            <MapPin size={40} color="white" />
            <Text style={styles.errorTitle}>Weather Error</Text>
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
  const gradientColors = getWeatherGradient(currentWeather?.icon);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
                  <Text style={styles.temperature}>{Math.round(currentWeather?.temp)}°</Text>
                  <Text style={styles.description}>{currentWeather?.description}</Text>
                  <Text style={styles.feelsLike}>Feels like {Math.round(currentWeather?.feelsLike)}°</Text>
                </View>
              </View>
              <TouchableOpacity onPress={refreshWeather} style={styles.refreshButton}>
                <RefreshCw size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Weather Details Grid */}
            <View style={styles.detailsGrid}>
              {[
                { icon: Wind, label: 'Wind Speed', value: `${Math.round(currentWeather?.windSpeed * 3.6)} km/h` },
                { icon: Droplets, label: 'Humidity', value: `${currentWeather?.humidity}%` },
                { icon: Eye, label: 'Visibility', value: `${Math.round(currentWeather?.visibility)} km` },
                { icon: Navigation, label: 'Pressure', value: `${currentWeather?.pressure} hPa` },
              ].map(({ icon: Icon, label, value }, i) => (
                <View key={i} style={styles.detailCard}>
                  <Icon size={24} color="white" />
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
              <Text style={styles.forecastTitle}>5-Day Forecast</Text>
            </View>

            <View style={styles.forecastList}>
              {weeklyForecast?.map((day, index) => {
                const DayIcon = weatherIcons[day.icon] || Cloud;
                const isToday = index === 0;
                return (
                  <View key={index} style={[styles.forecastItem, isToday && styles.todayForecast]}>
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
                          <Text style={styles.forecastDescriptionText}>{day.description}</Text>
                          {day.precipitationChance > 20 && (
                            <View style={styles.precipitationRow}>
                              <Droplets size={12} color="#d1d5db" />
                              <Text style={styles.precipitationText}>{Math.round(day.precipitationChance)}%</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.forecastRight}>
                      <View style={styles.tempRow}>
                        <Text style={styles.maxTemp}>{Math.round(day.maxTemp)}°</Text>
                        <Text style={styles.minTemp}>{Math.round(day.minTemp)}°</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Weather data powered by OpenWeather</Text>
            <Text style={styles.footerSubtext}>
              Last updated: {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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