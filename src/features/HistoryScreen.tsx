import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { sessionsService } from '../services/sessionsService';
import { useHaptics } from '../hooks/mobile';
import { Session } from '../types';
import { Trash2 } from 'lucide-react';

interface HistoryProps {
  onBack: () => void;
}

export function HistoryScreen({ onBack }: HistoryProps) {
  const familyId = useAppStore((state) => state.familyId);
  const { triggerHaptic } = useHaptics();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['sessions', familyId],
    queryFn: () => sessionsService.getSessions(familyId!),
    enabled: !!familyId,
  });

  const handleDelete = async (id: string) => {
    triggerHaptic([30, 20]);
    if (confirm('Delete this record?')) {
      queryClient.setQueryData(['sessions', familyId], (old: any) =>
        old ? old.filter((s: any) => s.id !== id) : []
      );
      await sessionsService.deleteSession(id, familyId!);
    }
  };

  const groupSessionsByDay = (list: Session[]) => {
    const groups: { [key: string]: Session[] } = {};
    list.forEach((s) => {
      const dateStr = new Date(s.started_at).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(s);
    });
    return Object.entries(groups);
  };

  const getSideLabel = (s: Session) => {
    if (s.type === 'bottle') return 'Bottle';
    if (s.type === 'pump') return 'Pump';
    return s.side === 'left' ? 'Left Breast' : 'Right Breast';
  };

  const getDetail = (s: Session) => {
    if (s.volume_ml) return `${s.volume_ml} ml`;
    if (s.duration_s) return `${Math.floor(s.duration_s / 60)} min`;
    return '';
  };

  const dayGroups = groupSessionsByDay(sessions);

  return (
    <div
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 100,
        minHeight: '100vh',
      }}
    >
      {/* Large Title */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 18,
          padding: '18px 20px',
          marginBottom: 24,
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.10)',
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          Archive
        </p>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          History
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>
          Showing the last 30 days only.
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2px solid var(--bg-surface-elevated)',
              borderTopColor: 'var(--accent-orange)',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      ) : dayGroups.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)' }}>No records yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            Your feeding history will appear here.
          </p>
        </div>
      ) : (
        dayGroups.map(([day, items]) => (
          <div key={day}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0 16px 8px',
              }}
            >
              {day}
            </p>
            <div className="ios-list-group">
              {items.map((session) => (
                <div className="ios-list-item" key={session.id} style={{ cursor: 'default' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 17, color: 'var(--text-primary)', fontWeight: 400 }}>
                      {getSideLabel(session)}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {new Date(session.started_at).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {session.recorded_by && ` · ${session.recorded_by}`}
                      {session.notes && ` — "${session.notes}"`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 17, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {getDetail(session)}
                    </span>
                    <button
                      onClick={() => handleDelete(session.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-red)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
