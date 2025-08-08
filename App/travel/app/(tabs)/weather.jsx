import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Thermometer, 
  Wind, 
  Droplets, 
  Eye, 
  Sunrise, 
  Sunset, 
  RefreshCw,
  CloudRain,
  Sun,
  Cloud,
  CloudSnow,
  Zap,
  Navigation,
  Calendar
} from 'lucide-react';

// Weather icons mapping
const weatherIcons = {
  '01d': Sun,
  '01n': Sun,
  '02d': Cloud,
  '02n': Cloud,
  '03d': Cloud,
  '03n': Cloud,
  '04d': Cloud,
  '09d': CloudRain,
  '10d': CloudRain,
  '11d': Zap,
  '13d': CloudSnow
};

// Generate fake weather data
function generateFakeWeather(cityName) {
  const icons = ['01d', '02d', '03d', '09d', '10d', '11d', '13d', '04d'];
  const descriptions = [
    'Sunny and pleasant',
    'Partly cloudy',
    'Light rain',
    'Stormy',
    'Cloudy',
    'Heavy rain',
    'Light snow',
    'Overcast'
  ];
  
  const hash = cityName ? cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  
  const temp = 15 + (hash % 20);
  const icon = icons[hash % icons.length];
  const description = descriptions[hash % descriptions.length];
  const humidity = 40 + (hash % 40);
  const windSpeed = 5 + (hash % 15);
  const visibility = 8 + (hash % 7);
  const uvIndex = 1 + (hash % 10);
  
  return { 
    temp, 
    icon, 
    description, 
    humidity, 
    windSpeed, 
    visibility, 
    uvIndex,
    feelsLike: temp + (hash % 6 - 3),
    pressure: 1000 + (hash % 50)
  };
}

function generateWeeklyForecast(cityName) {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const forecast = [];
  
  for (let i = 0; i < 7; i++) {
    const dayHash = cityName ? cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0) + i * 123, 0) : i * 123;
    
    const icons = ['01d', '02d', '03d', '09d', '10d', '11d', '13d', '04d'];
    const descriptions = ['Sunny', 'Partly cloudy', 'Light rain', 'Stormy', 'Cloudy', 'Heavy rain', 'Snow', 'Overcast'];
    
    const minTemp = 10 + (dayHash % 15);
    const maxTemp = minTemp + 5 + (dayHash % 10);
    const icon = icons[dayHash % icons.length];
    const description = descriptions[dayHash % descriptions.length];
    const precipitationChance = dayHash % 100;
    
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    
    forecast.push({
      day: i === 0 ? 'Today' : daysOfWeek[futureDate.getDay()],
      date: futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      minTemp,
      maxTemp,
      icon,
      description,
      precipitationChance
    });
  }
  
  return forecast;
}

function simulateLocationPermission() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cities = [
        'New York', 'Los Angeles', 'London', 'Paris', 'Tokyo', 'Dubai', 
        'Sydney', 'Berlin', 'Barcelona', 'Amsterdam', 'Singapore', 'Mumbai'
      ];
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      resolve({ granted: true, city: randomCity });
    }, 1500);
  });
}

const WeatherApp = () => {
  const [city, setCity] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [weeklyForecast, setWeeklyForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const requestLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await simulateLocationPermission();
      
      if (!result.granted) {
        setError('Location permission denied');
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
      setError('Unable to get weather data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  // Background gradient based on weather
  const getBackgroundGradient = () => {
    if (!currentWeather) return 'from-blue-400 via-purple-500 to-pink-500';
    
    const weatherType = currentWeather.icon;
    const temp = currentWeather.temp;
    
    if (weatherType.includes('01')) return 'from-yellow-400 via-orange-500 to-red-500'; // Sunny
    if (weatherType.includes('02') || weatherType.includes('03')) return 'from-blue-300 via-blue-400 to-blue-600'; // Cloudy
    if (weatherType.includes('09') || weatherType.includes('10')) return 'from-gray-400 via-gray-600 to-gray-800'; // Rainy
    if (weatherType.includes('11')) return 'from-purple-800 via-gray-900 to-black'; // Stormy
    if (weatherType.includes('13')) return 'from-blue-100 via-blue-200 to-blue-400'; // Snow
    
    return temp > 25 ? 'from-orange-400 via-red-500 to-pink-600' : 'from-blue-400 via-purple-500 to-indigo-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 text-center">
          <RefreshCw className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Getting Your Weather</h3>
          <p className="text-white/80">Fetching current location and forecast...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 via-pink-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Location Error</h3>
          <p className="text-white/80 mb-6">{error}</p>
          <button
            onClick={requestLocation}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-200 backdrop-blur-sm border border-white/20"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const WeatherIcon = weatherIcons[currentWeather?.icon] || Cloud;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getBackgroundGradient()} transition-all duration-1000`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 text-white/90 mb-2">
            <MapPin className="w-5 h-5" />
            <span className="font-medium">{city}</span>
          </div>
          <p className="text-white/70 text-sm">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p className="text-white/70 text-sm">
            {currentTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>

        {/* Current Weather Card */}
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl">
                <WeatherIcon className="w-12 h-12 text-white" />
              </div>
              <div>
                <h1 className="text-6xl font-bold text-white mb-2">
                  {currentWeather?.temp}°
                </h1>
                <p className="text-white/80 text-lg capitalize">
                  {currentWeather?.description}
                </p>
                <p className="text-white/60 text-sm">
                  Feels like {currentWeather?.feelsLike}°
                </p>
              </div>
            </div>
            <button
              onClick={requestLocation}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all duration-200 border border-white/20"
            >
              <RefreshCw className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Weather Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
              <Wind className="w-6 h-6 text-white/80 mx-auto mb-2" />
              <p className="text-white/60 text-xs uppercase tracking-wider">Wind</p>
              <p className="text-white font-semibold">{currentWeather?.windSpeed} km/h</p>
            </div>
            
            <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
              <Droplets className="w-6 h-6 text-white/80 mx-auto mb-2" />
              <p className="text-white/60 text-xs uppercase tracking-wider">Humidity</p>
              <p className="text-white font-semibold">{currentWeather?.humidity}%</p>
            </div>
            
            <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
              <Eye className="w-6 h-6 text-white/80 mx-auto mb-2" />
              <p className="text-white/60 text-xs uppercase tracking-wider">Visibility</p>
              <p className="text-white font-semibold">{currentWeather?.visibility} km</p>
            </div>
            
            <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
              <Navigation className="w-6 h-6 text-white/80 mx-auto mb-2" />
              <p className="text-white/60 text-xs uppercase tracking-wider">Pressure</p>
              <p className="text-white font-semibold">{currentWeather?.pressure} hPa</p>
            </div>
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">7-Day Forecast</h2>
          </div>
          
          <div className="space-y-3">
            {weeklyForecast?.map((day, index) => {
              const DayIcon = weatherIcons[day.icon] || Cloud;
              const isToday = index === 0;
              
              return (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-200 hover:bg-white/10 ${
                    isToday ? 'bg-white/20' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12">
                      <p className={`font-medium ${isToday ? 'text-white' : 'text-white/80'}`}>
                        {day.day}
                      </p>
                      <p className="text-white/60 text-xs">{day.date}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-xl">
                        <DayIcon className="w-6 h-6 text-white/80" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm">{day.description}</p>
                        {day.precipitationChance > 30 && (
                          <p className="text-white/60 text-xs">
                            {day.precipitationChance}% chance of rain
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex gap-2">
                      <span className="text-white font-semibold">{day.maxTemp}°</span>
                      <span className="text-white/60">{day.minTemp}°</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/40 text-xs">
            *Simulated weather data for demonstration purposes
          </p>
        </div>
      </div>
    </div>
  );
};

export default WeatherApp;