// app/index.jsx
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    const timers = [
      setTimeout(() => router.replace('/splash'), 0),       // Immediately show splash
      setTimeout(() => router.replace('/intro'), 2000),     // After 2s go to intro
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return null;
}
