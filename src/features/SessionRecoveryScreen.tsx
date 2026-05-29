import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { useHaptics } from '../hooks/mobile';
import { sessionsService } from '../services/sessionsService';
import { useQueryClient } from '@tanstack/react-query';

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
    const nowMs = new Date().getTime();
    const totalSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000) + activeTimer.accumulatedSeconds);
    setElapsedMins(Math.floor(totalSecs / 60));
  }, [activeTimer]);

  if (!activeTimer) return null;

  const handleEndSession = async () => {
    triggerHaptic([20, 50, 20]);
    const startMs = new Date(activeTimer.startedAt).getTime();
    const nowMs = new Date().getTime();
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
      notes: 'Recovered background session',
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
    if (confirm('Discard your interrupted active session?')) {
      clearTimer();
      onDiscard();
    }
  };

  return (
    <div className="safe-area-container justify-center max-w-sm mx-auto w-full text-center space-y-8">
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 text-amber-500 text-3xl mb-4 animate-pulse">
          🤱
        </div>
        <h1 className="text-title">You were feeding</h1>
        <p className="text-body font-medium text-neutral-300 capitalize">
          {activeTimer.side} side
        </p>
        <p className="text-caption">
          Started about {elapsedMins} {elapsedMins === 1 ? 'min' : 'mins'} ago
        </p>
      </div>

      <div className="space-y-4 pt-6">
        <button
          onClick={onResume}
          className="w-full btn-primary block text-center cursor-pointer"
        >
          Resume Session
        </button>
        <button
          onClick={handleEndSession}
          className="btn-secondary w-full py-4 text-body cursor-pointer"
        >
          End Session Now
        </button>
        <button
          onClick={handleDiscard}
          className="w-full py-3.5 text-caption text-red-400 rounded-xl active:text-red-300 transition-colors cursor-pointer"
        >
          Discard Session
        </button>
      </div>
    </div>
  );
}
