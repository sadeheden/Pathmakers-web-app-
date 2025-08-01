import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './home';
import MapScreen from './map';
import WeatherScreen from './weather'; // עדכן אם יש לך קובץ כזה
import DiaryScreen from './diary';     // עדכן אם יש לך קובץ כזה

const Tab = createBottomTabNavigator();

export default function TabsLayout() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Map':
              iconName = 'map';
              break;
            case 'Weather':
              iconName = 'cloud';
              break;
            case 'Diary':
              iconName = 'calendar';
              break;
            default:
              iconName = 'ellipse';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'בית' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'מפה' }} />
      <Tab.Screen name="Weather" component={WeatherScreen} options={{ title: 'מזג אוויר' }} />
      <Tab.Screen name="Diary" component={DiaryScreen} options={{ title: 'יומן' }} />
    </Tab.Navigator>
  );
}