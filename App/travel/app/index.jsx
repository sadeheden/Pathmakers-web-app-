import { useEffect, useState } from 'react';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    // הוסף delay קטן כדי לוודא שה-layout נטען
    const timer = setTimeout(() => {
      router.replace('/(tabs)/splash');
    }, 100);

  useEffect(() => {
    const timers = [];

    // 1. Show splash for 2 seconds
    timers.push(setTimeout(() => setStep(1), 2000));

    // 2. Then show intro for 4 seconds
    timers.push(setTimeout(() => setStep(2), 6000));

    // 3. Then redirect to login
    timers.push(setTimeout(() => {
      router.replace('/(tabs)/login');
    }, 6100));

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (step === 1) {
      router.replace('/(tabs)/splash');
    } else if (step === 2) {
      router.replace('/(tabs)/intro');
    }
  }, [step]);

  return null;
}
