import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { useHaptics, useWakeLock } from '../hooks/mobile';
import { sessionsService } from '../services/sessionsService';
import { useQueryClient } from '@tanstack/react-query';
import { X, Minus, Plus as PlusIcon } from 'lucide-react';

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
  const [volume, setVolume] = useState<number>(0);
  
  const { triggerHaptic } = useHaptics();
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const queryClient = useQueryClient();

  // Start timer on mount if not already active
  useEffect(() => {
    if (!activeTimer) {
      startTimer('left'); // side doesn't matter for bottle, just need a value
    }
  }, [activeTimer, startTimer]);

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
      type: 'bottle',
      side: null,
      started_at: activeTimer.startedAt,
      ended_at: new Date().toISOString(),
      duration_s: finalDuration,
      volume_ml: volume > 0 ? volume : null,
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
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Bottle Feed</span>
        <div style={{ width: 80 }} />
      </div>

      {/* Timer Display */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        <p
          style={{
            fontSize: 80,
            fontWeight: 200,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {formatTime(seconds)}
        </p>

        {/* Inline Volume Stepper */}
        <div style={{ width: '100%', maxWidth: 280 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', marginBottom: 12 }}>Volume</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => { triggerHaptic(5); setVolume((v) => Math.max(0, v - 10)); }}
              style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--bg-surface)', border: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Minus size={18} strokeWidth={1.5} />
            </button>
            <span style={{ fontSize: 34, fontWeight: 200, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {volume}
              <span style={{ fontSize: 17, fontWeight: 300, color: 'var(--text-secondary)', marginLeft: 4 }}>ml</span>
            </span>
            <button
              type="button"
              onClick={() => { triggerHaptic(5); setVolume((v) => v + 10); }}
              style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--bg-surface)', border: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <PlusIcon size={18} strokeWidth={1.5} />
            </button>
          </div>
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
