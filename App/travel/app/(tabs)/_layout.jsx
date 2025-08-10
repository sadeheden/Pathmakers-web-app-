// (tabs)/_layout.jsx
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './home';
import MapScreen from './map';
import DiaryScreen from './diary';
import ProfileScreen from './profile';
import RealChat from './RealChat';
import WeatherScreen from './weather';
import SupportScreen from './Support';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator(); // 👈 NEW

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="RealChat" component={RealChat} />
      <HomeStack.Screen name="Weather" component={WeatherScreen} />
    </HomeStack.Navigator>
  );
}

function TabsLayout() {
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
        tabBarIcon: ({ color, focused }) => {
          const iconSize = 28;

          if (route.name === 'Profile') {
            return (
              <Image
                source={{ uri: profileImage || 'https://i.pravatar.cc/150?img=12' }}
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

          let iconName = 'ellipse';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Map') iconName = 'map';
          else if (route.name === 'Diary') iconName = 'calendar';

          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Diary" component={DiaryScreen} options={{ tabBarLabel: 'Planner' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {/* ❌ No Support here */}
    </Tab.Navigator>
  );
}

export default function RootLayout() {
  return (
    <RootStack.Navigator>
      <RootStack.Screen
        name="Tabs"
        component={TabsLayout}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Support"
        component={SupportScreen}
        options={{
          presentation: 'modal',     // nice slide-up on iOS
          headerShown: true,
          title: 'Support',
        }}
      />
    </RootStack.Navigator>
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
