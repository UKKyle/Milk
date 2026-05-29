import { useState } from 'react';
import { useAppStore } from '../store';
import { useHaptics } from '../hooks/mobile';
import { sessionsService } from '../services/sessionsService';
import { useQueryClient } from '@tanstack/react-query';
import { SessionType } from '../types';

interface QuickAddProps {
  onBack: () => void;
}

export function QuickAddScreen({ onBack }: QuickAddProps) {
  const [type, setType] = useState<SessionType>('bottle');
  const [side, setSide] = useState<'left' | 'right' | null>(null);
  const [volume, setVolume] = useState<number>(80);
  const [durationMins, setDurationMins] = useState<number>(10);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const familyId = useAppStore((state) => state.familyId);
  const partnerName = useAppStore((state) => state.partnerName);

  const { triggerHaptic } = useHaptics();
  const queryClient = useQueryClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    triggerHaptic([15, 30]);

    const newSession = await sessionsService.createSession({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now(),
      family_id: familyId!,
      type,
      side: type === 'pump' || type === 'bottle' ? null : side,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration_s: type === 'pump' || type === 'left' || type === 'right' ? durationMins * 60 : null,
      volume_ml: type === 'bottle' || type === 'pump' ? volume : null,
      notes: notes.trim() || null,
      recorded_by: partnerName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    queryClient.setQueryData(['sessions', familyId], (old: any) => {
      const list = old ? [...old] : [];
      return [newSession, ...list];
    });

    onBack();
  };

  const isBreast = type === 'left' || type === 'right';

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
        <span className="text-headline text-[var(--text-primary)]">Quick Record</span>
        <div className="w-16" />
      </div>

      <form onSubmit={handleSave} className="flex-1 flex flex-col justify-center space-y-8 w-full py-6">
        {/* Type selector — pill style */}
        <div className="pill-selector">
          {(['bottle', 'pump', 'left'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                triggerHaptic(5);
                setType(t);
                if (t === 'left') setSide('left');
              }}
              className={`pill-option ${
                type === t || (t === 'left' && isBreast)
                  ? 'pill-option-active'
                  : ''
              }`}
            >
              {t === 'left' ? '🤱 Breast' : t === 'bottle' ? '🍼 Bottle' : '⚙️ Pump'}
            </button>
          ))}
        </div>

        {/* Breast side sub-selector */}
        {isBreast && (
          <div className="pill-selector max-w-[240px] mx-auto">
            {(['left', 'right'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  setType(s);
                  setSide(s);
                }}
                className={`pill-option capitalize ${type === s ? 'pill-option-active' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Volume stepper */}
        {(type === 'bottle' || type === 'pump') && (
          <div className="space-y-2.5">
            <label className="text-caption uppercase tracking-wider text-[var(--text-secondary)] block pl-1">Volume (ml)</label>
            <div className="premium-card flex items-center justify-between">
              <button
                type="button"
                onClick={() => { triggerHaptic(5); setVolume(v => Math.max(10, v - 10)); }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] text-xl font-light active:scale-90 transition-transform cursor-pointer border border-[var(--border-color)]"
              >
                −
              </button>
              <span className="text-large-title tabular-nums">{volume}<span className="text-body text-[var(--text-secondary)] ml-1">ml</span></span>
              <button
                type="button"
                onClick={() => { triggerHaptic(5); setVolume(v => v + 10); }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] text-xl font-light active:scale-90 transition-transform cursor-pointer border border-[var(--border-color)]"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Duration stepper */}
        {(type === 'pump' || isBreast) && (
          <div className="space-y-2.5">
            <label className="text-caption uppercase tracking-wider text-[var(--text-secondary)] block pl-1">Duration</label>
            <div className="premium-card flex items-center justify-between">
              <button
                type="button"
                onClick={() => { triggerHaptic(5); setDurationMins(d => Math.max(1, d - 1)); }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] text-xl font-light active:scale-90 transition-transform cursor-pointer border border-[var(--border-color)]"
              >
                −
              </button>
              <span className="text-large-title tabular-nums">{durationMins}<span className="text-body text-[var(--text-secondary)] ml-1">min</span></span>
              <button
                type="button"
                onClick={() => { triggerHaptic(5); setDurationMins(d => d + 1); }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] text-xl font-light active:scale-90 transition-transform cursor-pointer border border-[var(--border-color)]"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2.5">
          <label className="text-caption uppercase tracking-wider text-[var(--text-secondary)] block pl-1">Notes (optional)</label>
          <input
            type="text"
            placeholder="Add details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="premium-input text-left"
          />
        </div>

        {/* Submit */}
        <button type="submit" disabled={isLoading} className="btn-primary mt-4">
          {isLoading ? 'Saving...' : 'Save Record'}
        </button>
      </form>
    </div>
  );
}
