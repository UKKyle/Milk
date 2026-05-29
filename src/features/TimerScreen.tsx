import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { useHaptics, useWakeLock } from '../hooks/mobile';
import { sessionsService } from '../services/sessionsService';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';

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

  useEffect(() => {
    if (activeTimer) {
      setSelectedSide(activeTimer.side);
    } else {
      startTimer(selectedSide);
    }
  }, [activeTimer, startTimer, selectedSide]);

  useEffect(() => {
    const isPaused = activeTimer?.pausedAt;
    if (activeTimer && !isPaused) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => { releaseWakeLock(); };
  }, [activeTimer, requestWakeLock, releaseWakeLock]);

  useEffect(() => {
    if (!activeTimer || activeTimer.pausedAt) return;
    const interval = setInterval(() => {
      const startMs = new Date(activeTimer.startedAt).getTime();
      const nowMs = Date.now();
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
      const now = new Date().toISOString();
      const startMs = new Date(activeTimer.startedAt).getTime();
      const nowMs = Date.now();
      const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000) + activeTimer.accumulatedSeconds);
      useAppStore.setState({
        activeTimer: { side, startedAt: now, accumulatedSeconds: elapsed }
      });
    }
  };

  const handlePauseToggle = () => {
    triggerHaptic(15);
    if (activeTimer?.pausedAt) { resumeTimer(); } else { pauseTimer(); }
  };

  const handleSave = async () => {
    if (!activeTimer) return;
    triggerHaptic([20, 50, 20]);
    const finalDuration = seconds;
    const newSession = await sessionsService.createSession({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now(),
      family_id: familyId!,
      type: selectedSide,
      side: selectedSide,
      started_at: activeTimer.startedAt,
      ended_at: new Date().toISOString(),
      duration_s: finalDuration,
      volume_ml: null,
      notes: null,
      recorded_by: partnerName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    queryClient.setQueryData(['sessions', familyId], (old: any) => {
      const list = old ? [...old] : [];
      return [newSession, ...list];
    });
    clearTimer();
    onBack();
  };

  const handleDiscard = () => {
    triggerHaptic([30, 10, 30]);
    if (confirm('Discard this session?')) { clearTimer(); onBack(); }
  };

  const isPaused = activeTimer?.pausedAt;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        paddingLeft: 20,
        paddingRight: 20,
      }}
    >
      {/* Nav Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 8 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-orange)',
            fontSize: 17,
            fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <X size={20} strokeWidth={1.5} /> Cancel
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Feeding</span>
        <div style={{ width: 80 }} />
      </div>

      {/* Timer Display */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p
          style={{
            fontSize: 80,
            fontWeight: 200,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
            lineHeight: 1,
            marginBottom: 32,
          }}
        >
          {formatTime(seconds)}
        </p>

        {/* Side Selector */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 8,
            padding: 2,
            width: 240,
          }}
        >
          {(['left', 'right'] as const).map((side) => (
            <button
              key={side}
              onClick={() => handleSideSwitch(side)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 6,
                border: 'none',
                fontSize: 13,
                fontWeight: selectedSide === side ? 600 : 400,
                color: 'var(--text-primary)',
                background: selectedSide === side ? 'var(--border-color)' : 'transparent',
                boxShadow: selectedSide === side ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize',
              }}
            >
              {side} side
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
        <button
          onClick={handlePauseToggle}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 12,
            border: 'none',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: 17,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            onClick={handleDiscard}
            style={{
              height: 50,
              borderRadius: 12,
              border: 'none',
              background: 'rgba(255,69,58,0.15)',
              color: 'var(--accent-red)',
              fontSize: 17,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            style={{
              height: 50,
              borderRadius: 12,
              border: 'none',
              background: 'var(--accent-orange)',
              color: '#000',
              fontSize: 17,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
