import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { sessionsService } from '../services/sessionsService';
import { useHaptics } from '../hooks/mobile';
import { Session } from '../types';
import { Plus, ChevronRight } from 'lucide-react';

interface DashboardProps {
  onNavigate: (screen: 'timer' | 'history' | 'settings' | 'quickadd') => void;
}

export function DashboardScreen({ onNavigate }: DashboardProps) {
  const familyId = useAppStore((state) => state.familyId);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const { triggerHaptic } = useHaptics();

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['sessions', familyId],
    queryFn: () => sessionsService.getSessions(familyId!),
    enabled: !!familyId,
    refetchInterval: 10000,
  });

  const lastFeed = sessions.find(
    (s) => s.type === 'left' || s.type === 'right' || s.type === 'bottle'
  );

  const getFeedTimeText = (startedAt: string) => {
    const elapsedMs = Date.now() - new Date(startedAt).getTime();
    const mins = Math.floor(elapsedMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours < 24) return `${hours}h ${remainingMins}m ago`;
    return new Date(startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

  // Today's summary
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySessions = sessions.filter((s) => new Date(s.started_at) >= todayStart);
  const todayCount = todaySessions.length;
  const todayVolume = todaySessions.reduce((sum, s) => sum + (s.volume_ml || 0), 0);
  const todayOunces = todayVolume / 29.5735;

  const formatMl = (value: number) => `${value.toLocaleString()} ml`;
  const formatOz = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} oz`;

  return (
    <div
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 24,
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
          Home
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
          Dashboard
        </h1>
      </div>

      {/* Sync Warning */}
      {syncStatus.failedCount > 0 && (
        <div
          style={{
            background: 'rgba(255,69,58,0.15)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 13,
            color: 'var(--accent-red)',
          }}
        >
          ⚠ {syncStatus.failedCount} changes waiting to sync
        </div>
      )}

      {/* Today's Total Hero Card */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 16,
          padding: '24px 20px',
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}
        >
          Today
        </p>
        {isLoading ? (
          <div style={{ padding: '16px 0' }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '2px solid var(--bg-surface-elevated)',
                borderTopColor: 'var(--accent-orange)',
                animation: 'spin 1s linear infinite',
                margin: '0 auto',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'center',
              gap: 0,
              marginTop: 8,
            }}
          >
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 12px 8px' }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 6,
                }}
              >
                ML
              </p>
              <p
                style={{
                  fontSize: 38,
                  fontWeight: 200,
                  letterSpacing: '-0.03em',
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {formatMl(todayVolume)}
              </p>
            </div>

            <div
              style={{
                width: 1,
                background: 'var(--border-color)',
                margin: '12px 0',
                opacity: 0.9,
              }}
            />

            <div style={{ flex: 1, textAlign: 'center', padding: '10px 12px 8px' }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 6,
                }}
              >
                OZ
              </p>
              <p
                style={{
                  fontSize: 38,
                  fontWeight: 200,
                  letterSpacing: '-0.03em',
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {formatOz(todayOunces)}
              </p>
            </div>
          </div>
        )}
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 12 }}>
          {todayCount > 0 ? `${todayCount} ${todayCount === 1 ? 'feed' : 'feeds'} today` : 'No feeds today'}
        </p>
      </div>

      {/* Time Since Last Feed Card */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 16,
          padding: '24px 20px',
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}
        >
          Time Since Last Feed
        </p>
        {lastFeed ? (
          <p
            style={{
              fontSize: 44,
              fontWeight: 200,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1.1,
            }}
          >
            {getFeedTimeText(lastFeed.started_at)}
          </p>
        ) : (
          <p
            style={{
              fontSize: 20,
              fontWeight: 300,
              color: 'var(--text-tertiary)',
              padding: '12px 0',
            }}
          >
            No feeds yet
          </p>
        )}
      </div>

      {/* Log Action */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => { triggerHaptic(10); onNavigate('quickadd'); }}
          style={{
            width: '100%',
            background: 'var(--accent-orange)',
            color: '#000',
            border: 'none',
            borderRadius: 14,
            padding: '18px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Plus size={28} strokeWidth={1.5} />
          <span style={{ fontSize: 17, fontWeight: 600 }}>Log Feed</span>
        </button>
      </div>

      <div className="ios-list-group">
        <div className="ios-list-item" style={{ cursor: 'default' }}>
          <span style={{ fontSize: 17, color: 'var(--text-primary)' }}>Total Feeds</span>
          <span style={{ fontSize: 17, color: 'var(--text-secondary)' }}>{todayCount}</span>
        </div>
        {todayVolume > 0 && (
          <div className="ios-list-item" style={{ cursor: 'default' }}>
            <span style={{ fontSize: 17, color: 'var(--text-primary)' }}>Total Volume</span>
            <span style={{ fontSize: 17, color: 'var(--text-secondary)' }}>{todayVolume} ml</span>
          </div>
        )}
      </div>

      {sessions.length > 0 && (
        <div className="ios-list-group">
          {sessions.slice(0, 4).map((session) => (
            <div className="ios-list-item" key={session.id} style={{ cursor: 'default' }}>
              <div>
                <p style={{ fontSize: 17, color: 'var(--text-primary)', fontWeight: 400 }}>
                  {getSideLabel(session)}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {new Date(session.started_at).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {session.recorded_by && ` · ${session.recorded_by}`}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 17, color: 'var(--text-secondary)' }}>
                  {getDetail(session)}
                </span>
              </div>
            </div>
          ))}
          <div
            className="ios-list-item"
            onClick={() => { triggerHaptic(5); onNavigate('history'); }}
            style={{ justifyContent: 'center', gap: 4 }}
          >
            <span style={{ fontSize: 15, color: 'var(--accent-orange)', fontWeight: 500 }}>
              View All History
            </span>
            <ChevronRight size={16} color="var(--accent-orange)" />
          </div>
        </div>
      )}
    </div>
  );
}
