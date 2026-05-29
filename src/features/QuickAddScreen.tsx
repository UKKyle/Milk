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

    // Optimistic merge into TanStack Query cache directly
    queryClient.setQueryData(['sessions', familyId], (old: any) => {
      const list = old ? [...old] : [];
      return [newSession, ...list];
    });

    onBack();
  };

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
          Quick Record
        </span>
        <div className="w-10" />
      </div>

      <form onSubmit={handleSave} className="my-auto space-y-6">
        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2 bg-neutral-900/60 p-1.5 rounded-2xl border border-neutral-800">
          {(['bottle', 'pump', 'left'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                triggerHaptic(5);
                setType(t);
                if (t === 'left') setSide('left');
              }}
              className={`py-3 rounded-xl text-caption capitalize font-medium transition-all ${
                type === t || (t === 'left' && (type === 'left' || type === 'right'))
                  ? 'bg-amber-500 text-neutral-900 shadow-md font-semibold'
                  : 'text-neutral-400 active:text-neutral-200'
              }`}
            >
              {t === 'left' ? '🤱 Breast' : t === 'bottle' ? '🍼 Bottle' : '⚙️ Pump'}
            </button>
          ))}
        </div>

        {/* Dynamic breast side selector */}
        {(type === 'left' || type === 'right') && (
          <div className="grid grid-cols-2 gap-2 bg-neutral-900/40 p-1 rounded-xl">
            {(['left', 'right'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  setType(s);
                  setSide(s);
                }}
                className={`py-2 rounded-lg text-caption capitalize font-medium transition-all ${
                  type === s
                    ? 'bg-neutral-800 text-amber-500 font-semibold'
                    : 'text-neutral-500 active:text-neutral-300'
                }`}
              >
                {s} Side
              </button>
            ))}
          </div>
        )}

        {/* Dynamic parameters inputs */}
        {(type === 'bottle' || type === 'pump') && (
          <div className="space-y-2">
            <label className="text-caption text-neutral-500 uppercase tracking-wider block">
              Volume (ml)
            </label>
            <div className="flex items-center justify-between bg-neutral-900/40 px-4 py-3 rounded-xl border border-neutral-850">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  setVolume(v => Math.max(10, v - 10));
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-900 text-neutral-200 border border-neutral-800 text-lg"
              >
                -
              </button>
              <span className="text-2xl font-light text-neutral-200">{volume} ml</span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  setVolume(v => v + 10);
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-900 text-neutral-200 border border-neutral-800 text-lg"
              >
                +
              </button>
            </div>
          </div>
        )}

        {(type === 'pump' || type === 'left' || type === 'right') && (
          <div className="space-y-2">
            <label className="text-caption text-neutral-500 uppercase tracking-wider block">
              Duration (minutes)
            </label>
            <div className="flex items-center justify-between bg-neutral-900/40 px-4 py-3 rounded-xl border border-neutral-850">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  setDurationMins(d => Math.max(1, d - 1));
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-900 text-neutral-200 border border-neutral-800 text-lg"
              >
                -
              </button>
              <span className="text-2xl font-light text-neutral-200">{durationMins} mins</span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  setDurationMins(d => d + 1);
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-900 text-neutral-200 border border-neutral-800 text-lg"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Notes input */}
        <div className="space-y-2">
          <label className="text-caption text-neutral-500 uppercase tracking-wider block">
            Notes (optional)
          </label>
          <input
            type="text"
            placeholder="Add feeding details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-neutral-900/40 border border-neutral-800 rounded-2xl px-4 py-3.5 text-body focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary block text-center mt-6 cursor-pointer"
        >
          {isLoading ? 'Saving Log...' : 'Save Feed Record'}
        </button>
      </form>
    </div>
  );
}
