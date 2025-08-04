import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './home';
import MapScreen from './map';
import WeatherScreen from './weather';
import DiaryScreen from './diary';
import ProfileScreen from './profile';

const Tab = createBottomTabNavigator();

export default function TabsLayout() {
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    const loadUserImage = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');
        if (userDataJson) {
          const user = JSON.parse(userDataJson);
          setProfileImage(user?.profile_image);
        }
      } catch (e) {
        console.error('Error loading profile image', e);
      }
    };
    loadUserImage();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:  '#007AFF',
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Profile') {
            return (
              <Image
                source={{
                  uri: profileImage || 'https://i.pravatar.cc/150?img=12',
                }}
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: focused ? 2 : 1,
                  borderColor: focused ? '#4CAF50' : '#ccc',
                }}
              />
            );
          }

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
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'פרופיל' }} />
    </Tab.Navigator>
  );
}
