import React, { useEffect, useState } from 'react';

// פונקציה שמייצרת מזג אוויר מזויף לעיר לפי השם
function generateFakeWeather(cityName) {
  const icons = ['01d', '02d', '03d', '09d', '10d', '11d', '13d'];
  const descriptions = [
    'שמשי ונעים',
    'מעונן חלקית',
    'גשום קל',
    'סוער',
    'מעונן',
    'גשם כבד',
    'שלג קל',
  ];
  
  const hash = cityName
    ? cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0;
  
  const temp = 15 + (hash % 20); // בין 15 ל-35 מעלות
  const icon = icons[hash % icons.length];
  const description = descriptions[hash % descriptions.length];
  
  return { temp, icon, description };
}

// פונקציה שמייצרת תחזית שבועית
function generateWeeklyForecast(cityName) {
  const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const forecast = [];
  
  for (let i = 0; i < 7; i++) {
    // יוצרים hash שונה לכל יום
    const dayHash = cityName ? cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0) + i * 123, 0) : i * 123;
    
    const icons = ['01d', '02d', '03d', '09d', '10d', '11d', '13d', '04d'];
    const descriptions = [
      'שמשי ונעים',
      'מעונן חלקית', 
      'גשום קל',
      'סוער',
      'מעונן',
      'גשם כבד',
      'שלג קל',
      'מעונן כבד'
    ];
    
    const minTemp = 10 + (dayHash % 15); // 10-25
    const maxTemp = minTemp + 5 + (dayHash % 10); // +5-15 מעל המינימום
    const icon = icons[dayHash % icons.length];
    const description = descriptions[dayHash % descriptions.length];
    
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    
    forecast.push({
      day: i === 0 ? 'היום' : daysOfWeek[futureDate.getDay()],
      date: futureDate.toLocaleDateString('he-IL'),
      minTemp,
      maxTemp,
      icon,
      description
    });
  }
  
  return forecast;
}

// פונקציה שמדמה קבלת מיקום עם ערים ישראליות
function simulateLocationPermission() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cities = [
        'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'נתניה', 
        'פתח תקווה', 'אשדוד', 'ראשון לציון', 'רמת גן', 'בני ברק'
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
        setError('אין הרשאה לגישה למיקום. נסה שוב או הכנס עיר באופן ידני.');
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
      setError('לא ניתן לקבל את המיקום או מזג האוויר.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 bg-gradient-to-br from-blue-50 to-sky-100 p-8 rounded-xl shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg text-gray-700">טוען תחזית מזג אוויר שבועית...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 bg-gradient-to-br from-red-50 to-pink-100 p-8 rounded-xl shadow-lg">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <p className="text-lg text-red-700 text-center mb-4">{error}</p>
        <button 
          onClick={requestLocation}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!currentWeather || !weeklyForecast) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-lg">
        <p className="text-lg text-gray-700">לא נמצא מידע על מזג האוויר.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
      {/* מזג אוויר נוכחי */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          מזג אוויר ב־{city}
        </h1>
        
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md mb-4">
          <div className="flex items-center justify-center gap-4">
            <img
              src={`https://openweathermap.org/img/wn/${currentWeather.icon}@4x.png`}
              alt="weather icon"
              className="w-20 h-20"
            />
            <div>
              <p className="text-4xl font-bold text-blue-600">
                {currentWeather.temp.toFixed(1)}°C
              </p>
              <p className="text-lg text-gray-700">
                {currentWeather.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* תחזית שבועית */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">תחזית ל-7 ימים</h2>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20">
          <div className="flex justify-between gap-2 overflow-x-auto">
            {weeklyForecast.map((day, index) => (
              <div 
                key={index}
                className="text-center flex-1 min-w-[80px] p-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 hover:transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="font-bold text-sm text-gray-800 mb-2">
                  {day.day}
                </div>
                
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-md">
                  <img
                    src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                    alt="weather icon"
                    className="w-10 h-10"
                  />
                </div>
                
                <div className="mb-2">
                  <div className="font-bold text-blue-600 text-lg">
                    {day.maxTemp}°
                  </div>
                  <div className="text-gray-500 text-sm">
                    {day.minTemp}°
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 leading-tight px-1">
                  {day.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* כפתורים */}
      <div className="text-center">
        <button 
          onClick={requestLocation}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md mb-4"
        >
          🔄 עדכן מיקום
        </button>
        
        <p className="text-sm text-gray-500">
          *תחזית מדומה למטרות הדגמה
        </p>
      </div>
    </div>
  );
}