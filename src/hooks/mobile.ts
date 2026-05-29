import { useCallback, useRef } from 'react';

// Haptic interface for device vibration feedback
export function useHaptics() {
  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn('Vibration failed or was blocked by browser policies:', e);
      }
    }
  }, []);

  return { triggerHaptic };
}

// Active screen dimming prevention lock
export function useWakeLock() {
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = useCallback(async () => {
    if (
      typeof window !== 'undefined' &&
      'wakeLock' in navigator &&
      (navigator as any).wakeLock
    ) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('Screen Wake Lock request failed:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.warn('Screen Wake Lock release failed:', err);
      }
    }
  }, []);

  return { requestWakeLock, releaseWakeLock };
}
