import { Tabs } from 'expo-router';

export default  function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Login' }} />
      <Tabs.Screen name="register" options={{ title: 'Register' }} />
      <Tabs.Screen name="travel" options={{ title: 'Travel' }} />
    </Tabs>
  );
}
