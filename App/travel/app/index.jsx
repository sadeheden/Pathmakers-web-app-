// app/index.jsx
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    // מתחיל מ intro
    router.replace('/(tabs)/intro');
  }, []);

  return null; // רק מפנה, לא מציג כלום
}