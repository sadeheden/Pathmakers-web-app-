import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Platform } from 'react-native';
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
      } catch (err) {
        console.error('Error loading profile image:', err);
      }
    };
    loadUserImage();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarLabelStyle: {
          fontSize: 12,
          paddingBottom: Platform.OS === 'ios' ? 8 : 4,
        },
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ color, size, focused }) => {
          const iconSize = 28;

          if (route.name === 'Profile') {
            return (
              <Image
                source={{
                  uri: profileImage || 'https://i.pravatar.cc/150?img=12',
                }}
                style={{
                  width: iconSize,
                  height: iconSize,
                  borderRadius: iconSize / 2,
                  borderWidth: focused ? 2 : 1,
                  borderColor: focused ? '#007AFF' : '#ccc',
                }}
              />
            );
          }

          let iconName = '';
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

          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Weather" component={WeatherScreen} />
      <Tab.Screen name="Diary" component={DiaryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#dcdcdc',
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 5,
  },
});
