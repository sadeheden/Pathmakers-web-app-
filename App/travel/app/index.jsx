// app/index.jsx
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    // הוסף delay קטן כדי לוודא שה-layout נטען
    const timer = setTimeout(() => {
      router.replace('/(tabs)/intro');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return null; // רק מפנה, לא מציג כלום
}