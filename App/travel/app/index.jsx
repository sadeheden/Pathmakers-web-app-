import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    setTimeout(() => {
      router.replace('/splash');
    }, 100);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>loading...</Text>
    </View>
  );
}
