import { useState } from 'react';
import { useAppStore } from '../store';
import { useHaptics } from '../hooks/mobile';
import { sessionsService } from '../services/sessionsService';
import { useQueryClient } from '@tanstack/react-query';
import { X, Minus, Plus as PlusIcon } from 'lucide-react';

interface QuickAddProps {
  onBack: () => void;
}

export function QuickAddScreen({ onBack }: QuickAddProps) {
  const [volume, setVolume] = useState<number>(80);
  const [notes, setNotes] = useState('');
  const [startedAt, setStartedAt] = useState(() => {
    // Return current local time formatted for datetime-local input (YYYY-MM-DDTHH:mm)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [isLoading, setIsLoading] = useState(false);

  const familyId = useAppStore((state) => state.familyId);
  const partnerName = useAppStore((state) => state.partnerName);
  const { triggerHaptic } = useHaptics();
  const queryClient = useQueryClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    triggerHaptic([15, 30]);

    const sessionDate = new Date(startedAt).toISOString();

    const newSession = await sessionsService.createSession({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now(),
      family_id: familyId!,
      type: 'bottle',
      side: null,
      started_at: sessionDate,
      ended_at: sessionDate,
      duration_s: null,
      volume_ml: volume,
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--accent-orange)', fontSize: 17, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <X size={20} strokeWidth={1.5} /> Cancel
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Add Feed</span>
        <div style={{ width: 80 }} />
      </div>

      <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Volume Stepper / Input */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>Volume (ml)</p>
          <div className="ios-list-group" style={{ marginBottom: 0 }}>
            <div className="ios-list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => { triggerHaptic(5); setVolume((v) => Math.max(0, v - 10)); }} style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--bg-base)', border: '0.5px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Minus size={18} strokeWidth={1.5} />
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={volume || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVolume(val === '' ? 0 : parseInt(val, 10));
                  }}
                  style={{
                    fontSize: 44,
                    fontWeight: 200,
                    color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    textAlign: 'center',
                    width: '100px',
                    padding: 0,
                    margin: 0,
                  }}
                />
              </div>

              <button type="button" onClick={() => { triggerHaptic(5); setVolume((v) => v + 10); }} style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--bg-base)', border: '0.5px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <PlusIcon size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Time */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>Time</p>
          <div className="ios-list-group" style={{ marginBottom: 0 }}>
            <div className="ios-list-item" style={{ cursor: 'default' }}>
              <input
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 17, color: 'var(--text-primary)', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>Notes</p>
          <div className="ios-list-group" style={{ marginBottom: 0 }}>
            <div className="ios-list-item" style={{ cursor: 'default' }}>
              <input
                type="text"
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 17, color: 'var(--text-primary)', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          type="submit"
          disabled={isLoading}
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
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Saving...' : 'Save Feed'}
        </button>
      </form>
    </div>
  );
}
