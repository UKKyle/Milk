import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { useHaptics, useWakeLock } from '../hooks/mobile';
import { sessionsService } from '../services/sessionsService';
import { useQueryClient } from '@tanstack/react-query';

interface TimerProps {
  onBack: () => void;
}

export function TimerScreen({ onBack }: TimerProps) {
  const activeTimer = useAppStore((state) => state.activeTimer);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const resumeTimer = useAppStore((state) => state.resumeTimer);
  const clearTimer = useAppStore((state) => state.clearTimer);
  const partnerName = useAppStore((state) => state.partnerName);
  const familyId = useAppStore((state) => state.familyId);

  const [seconds, setSeconds] = useState(0);
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('left');
  
  const { triggerHaptic } = useHaptics();
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const queryClient = useQueryClient();

  // Initialize side selector based on active state or preset
  useEffect(() => {
    if (activeTimer) {
      setSelectedSide(activeTimer.side);
    } else {
      startTimer(selectedSide);
    }
  }, [activeTimer, startTimer, selectedSide]);

  // Wake lock execution during active timer state
  useEffect(() => {
    const isPaused = activeTimer?.pausedAt;
    if (activeTimer && !isPaused) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [activeTimer, requestWakeLock, releaseWakeLock]);

  // Tick calculation logic accounting for tab suspension/backgrounding
  useEffect(() => {
    if (!activeTimer || activeTimer.pausedAt) return;

    const interval = setInterval(() => {
      const startMs = new Date(activeTimer.startedAt).getTime();
      const nowMs = new Date().getTime();
      const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000) + activeTimer.accumulatedSeconds);
      setSeconds(elapsed);
    }, 200);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSideSwitch = (side: 'left' | 'right') => {
    if (selectedSide === side) return;
    triggerHaptic([10, 20]);
    setSelectedSide(side);
    
    if (activeTimer) {
      // Accumulate existing progress before switching side settings
      const now = new Date().toISOString();
      const startMs = new Date(activeTimer.startedAt).getTime();
      const nowMs = new Date().getTime();
      const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000) + activeTimer.accumulatedSeconds);
      
      useAppStore.setState({
        activeTimer: {
          side,
          startedAt: now,
          accumulatedSeconds: elapsed,
        }
      });
    }
  };

  const handlePauseToggle = () => {
    triggerHaptic(15);
    if (activeTimer?.pausedAt) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  };

  const handleSave = async () => {
    if (!activeTimer) return;
    triggerHaptic([20, 50, 20]);

    // Calculate final duration seconds
    const finalDuration = seconds;
    const startedTime = activeTimer.startedAt;
    
    // Save to IndexedDB + Supabase (using session abstraction layers)
    const newSession = await sessionsService.createSession({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now(),
      family_id: familyId!,
      type: selectedSide,
      side: selectedSide,
      started_at: startedTime,
      ended_at: new Date().toISOString(),
      duration_s: finalDuration,
      volume_ml: null,
      notes: null,
      recorded_by: partnerName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Merge into local TanStack cache directly (realtime reconciliation guidelines)
    queryClient.setQueryData(['sessions', familyId], (old: any) => {
      const list = old ? [...old] : [];
      return [newSession, ...list];
    });

    clearTimer();
    onBack();
  };

  const handleDiscard = () => {
    triggerHaptic([30, 10, 30]);
    if (confirm('Are you sure you want to discard this feeding session?')) {
      clearTimer();
      onBack();
    }
  };

  const isPaused = activeTimer?.pausedAt;

  return (
    <div className="flex-1 flex flex-col justify-between p-6 max-w-md mx-auto w-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-2">
        <button
          onClick={onBack}
          className="text-caption text-neutral-400 active:opacity-60 transition-opacity"
        >
          ✕ Cancel
        </button>
        <span className="text-caption uppercase tracking-wider text-amber-500 font-medium">
          Feeding Session
        </span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Timer Display */}
      <div className="my-auto text-center space-y-10">
        <div className="text-timer text-neutral-100">{formatTime(seconds)}</div>

        {/* Side Selector Buttons */}
        <div className="inline-flex bg-neutral-900/60 p-1.5 rounded-2xl border border-neutral-800">
          <button
            onClick={() => handleSideSwitch('left')}
            className={`px-8 py-3 rounded-xl text-body font-medium transition-all ${
              selectedSide === 'left'
                ? 'bg-amber-500 text-neutral-900 shadow-md'
                : 'text-neutral-400 active:text-neutral-200'
            }`}
          >
            Left Side
          </button>
          <button
            onClick={() => handleSideSwitch('right')}
            className={`px-8 py-3 rounded-xl text-body font-medium transition-all ${
              selectedSide === 'right'
                ? 'bg-amber-500 text-neutral-900 shadow-md'
                : 'text-neutral-400 active:text-neutral-200'
            }`}
          >
            Right Side
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <button
          onClick={handlePauseToggle}
          className="w-full text-center py-4 bg-neutral-900 border border-neutral-800 text-body font-medium rounded-2xl active:bg-neutral-800 transition-colors"
        >
          {isPaused ? '▶ Resume Feeding' : '⏸ Pause'}
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleDiscard}
            className="py-4 bg-red-950/15 border border-red-900/30 text-red-400 font-medium rounded-2xl active:bg-red-950/30 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            className="py-4 bg-amber-500 text-neutral-900 font-semibold rounded-2xl active:opacity-90 transition-opacity"
          >
            Save Session
          </button>
        </div>
      </div>
    </div>
  );
}
