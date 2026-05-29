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
    <div className="safe-area-container max-w-md mx-auto justify-between py-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-3">
        <button
          onClick={onBack}
          className="text-body text-[var(--accent-orange)] active:opacity-60 transition-opacity cursor-pointer"
        >
          Cancel
        </button>
        <span className="text-headline text-[var(--text-primary)]">
          Feeding Session
        </span>
        <div className="w-16" /> {/* Spacer */}
      </div>

      {/* Main Timer Display */}
      <div className="my-auto text-center space-y-12">
        <div className="text-timer">{formatTime(seconds)}</div>

        {/* Side Selector Buttons (Pill Selector Style) */}
        <div className="pill-selector max-w-[280px] mx-auto">
          <button
            onClick={() => handleSideSwitch('left')}
            className={`pill-option ${selectedSide === 'left' ? 'pill-option-active' : ''}`}
          >
            Left Side
          </button>
          <button
            onClick={() => handleSideSwitch('right')}
            className={`pill-option ${selectedSide === 'right' ? 'pill-option-active' : ''}`}
          >
            Right Side
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4 w-full mt-auto">
        <button
          onClick={handlePauseToggle}
          className="btn-secondary"
        >
          {isPaused ? 'Resume Feeding' : 'Pause'}
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleDiscard}
            className="py-4 bg-[#ff453a20] text-[var(--accent-red)] font-semibold rounded-[14px] active:bg-[#ff453a40] transition-colors cursor-pointer text-[17px] tracking-tight"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
          >
            Save Session
          </button>
        </div>
      </div>
    </div>
  );
}
