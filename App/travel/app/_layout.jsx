import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* לא מגדירים initialRouteName */}
      <Stack.Screen name="index" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="intro" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
