import { useState } from 'react';
import { useAppStore } from '../store';
import { useHaptics } from '../hooks/mobile';
import { sessionsService } from '../services/sessionsService';
import { useQueryClient } from '@tanstack/react-query';
import { SessionType } from '../types';
import { X, Minus, Plus as PlusIcon } from 'lucide-react';

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

  const types: { key: SessionType | 'breast'; label: string }[] = [
    { key: 'bottle', label: 'Bottle' },
    { key: 'breast', label: 'Breast' },
    { key: 'pump', label: 'Pump' },
  ];

  const segmentButton = (label: string, isActive: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 0',
        borderRadius: 6,
        border: 'none',
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        color: 'var(--text-primary)',
        background: isActive ? 'var(--border-color)' : 'transparent',
        boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.2s ease',
      }}
    >
      {label}
    </button>
  );

  const stepperRow = (label: string, value: number, unit: string, onDec: () => void, onInc: () => void) => (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>{label}</p>
      <div className="ios-list-group" style={{ marginBottom: 0 }}>
        <div className="ios-list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
          <button type="button" onClick={onDec} style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--bg-base)', border: '0.5px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Minus size={18} strokeWidth={1.5} />
          </button>
          <span style={{ fontSize: 34, fontWeight: 200, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {value}
            <span style={{ fontSize: 17, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>{unit}</span>
          </span>
          <button type="button" onClick={onInc} style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--bg-base)', border: '0.5px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <PlusIcon size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );

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
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Quick Add</span>
        <div style={{ width: 80 }} />
      </div>

      <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Type Selector */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>Type</p>
          <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: 8, padding: 2 }}>
            {types.map((t) => {
              const isActive = t.key === 'breast' ? isBreast : type === t.key;
              return segmentButton(t.label, isActive, () => {
                triggerHaptic(5);
                if (t.key === 'breast') { setType('left'); setSide('left'); }
                else { setType(t.key as SessionType); }
              });
            })}
          </div>
        </div>

        {/* Breast Side Sub-selector */}
        {isBreast && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: 8, padding: 2, maxWidth: 200, margin: '0 auto' }}>
              {(['left', 'right'] as const).map((s) =>
                segmentButton(s.charAt(0).toUpperCase() + s.slice(1), type === s, () => { triggerHaptic(5); setType(s); setSide(s); })
              )}
            </div>
          </div>
        )}

        {/* Volume */}
        {(type === 'bottle' || type === 'pump') &&
          stepperRow('Volume', volume, 'ml', () => { triggerHaptic(5); setVolume((v) => Math.max(10, v - 10)); }, () => { triggerHaptic(5); setVolume((v) => v + 10); })}

        {/* Duration */}
        {(type === 'pump' || isBreast) &&
          stepperRow('Duration', durationMins, 'min', () => { triggerHaptic(5); setDurationMins((d) => Math.max(1, d - 1)); }, () => { triggerHaptic(5); setDurationMins((d) => d + 1); })}

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
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
          {isLoading ? 'Saving...' : 'Save Record'}
        </button>
      </form>
    </div>
  );
}
