import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { useHaptics } from '../hooks/mobile';
import { sessionsService } from '../services/sessionsService';
import { useQueryClient } from '@tanstack/react-query';
import { Droplet } from 'lucide-react';

interface RecoveryProps {
  onResume: () => void;
  onDiscard: () => void;
}

export function SessionRecoveryScreen({ onResume, onDiscard }: RecoveryProps) {
  const activeTimer = useAppStore((state) => state.activeTimer);
  const clearTimer = useAppStore((state) => state.clearTimer);
  const partnerName = useAppStore((state) => state.partnerName);
  const familyId = useAppStore((state) => state.familyId);
  const { triggerHaptic } = useHaptics();
  const queryClient = useQueryClient();

  const [elapsedMins, setElapsedMins] = useState(0);

  useEffect(() => {
    if (!activeTimer) return;
    const startMs = new Date(activeTimer.startedAt).getTime();
    const nowMs = Date.now();
    const totalSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000) + activeTimer.accumulatedSeconds);
    setElapsedMins(Math.floor(totalSecs / 60));
  }, [activeTimer]);

  if (!activeTimer) return null;

  const handleEndSession = async () => {
    triggerHaptic([20, 50, 20]);
    const startMs = new Date(activeTimer.startedAt).getTime();
    const nowMs = Date.now();
    const totalSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000) + activeTimer.accumulatedSeconds);

    const newSession = await sessionsService.createSession({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now(),
      family_id: familyId!,
      type: activeTimer.side,
      side: activeTimer.side,
      started_at: activeTimer.startedAt,
      ended_at: new Date().toISOString(),
      duration_s: totalSecs,
      volume_ml: null,
      notes: 'Recovered session',
      recorded_by: partnerName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    queryClient.setQueryData(['sessions', familyId], (old: any) => {
      const list = old ? [...old] : [];
      return [newSession, ...list];
    });

    clearTimer();
    onDiscard();
  };

  const handleDiscard = () => {
    triggerHaptic([30, 10, 30]);
    if (confirm('Discard this session?')) { clearTimer(); onDiscard(); }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '0 32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          background: 'rgba(255,159,10,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Droplet size={36} strokeWidth={1.5} color="var(--accent-orange)" />
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 300, color: 'var(--text-primary)', marginBottom: 8 }}>
        Session in progress
      </h1>
      <p style={{ fontSize: 17, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'capitalize' }}>
        {activeTimer.side} side
      </p>
      <p style={{ fontSize: 15, color: 'var(--text-tertiary)', marginBottom: 40 }}>
        Started ~{elapsedMins} {elapsedMins === 1 ? 'minute' : 'minutes'} ago
      </p>

      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={onResume}
          style={{
            width: '100%',
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
          Resume
        </button>
        <button
          onClick={handleEndSession}
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
          End & Save
        </button>
        <button
          onClick={handleDiscard}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 12,
            border: 'none',
            background: 'transparent',
            color: 'var(--accent-red)',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
