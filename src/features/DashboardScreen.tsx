import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { sessionsService } from '../services/sessionsService';
import { useHaptics } from '../hooks/mobile';
import { Session } from '../types';

interface DashboardProps {
  onNavigate: (screen: 'timer' | 'history' | 'settings' | 'quickadd') => void;
}

export function DashboardScreen({ onNavigate }: DashboardProps) {
  const familyId = useAppStore((state) => state.familyId);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const startTimer = useAppStore((state) => state.startTimer);
  const { triggerHaptic } = useHaptics();

  // Load feed sessions via reactive TanStack query
  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['sessions', familyId],
    queryFn: () => sessionsService.getSessions(familyId!),
    enabled: !!familyId,
    refetchInterval: 10000, // Background updates
  });

  // Calculate Last Feed metrics
  const lastFeed = sessions.find(
    (s) => s.type === 'left' || s.type === 'right' || s.type === 'bottle'
  );

  const getFeedTimeText = (startedAt: string) => {
    const elapsedMs = new Date().getTime() - new Date(startedAt).getTime();
    const mins = Math.floor(elapsedMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(startedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const getSideText = (feed: Session) => {
    if (feed.type === 'bottle') return `Bottle (${feed.volume_ml}ml)`;
    if (feed.type === 'pump') return `Pump (${feed.volume_ml}ml)`;
    return feed.side === 'left' ? 'Left' : 'Right';
  };

  const getDurationText = (feed: Session) => {
    if (!feed.duration_s) return '';
    const mins = Math.floor(feed.duration_s / 60);
    return `${mins} min`;
  };

  const handleStartFeeding = () => {
    triggerHaptic(15);
    onNavigate('timer');
  };

  const getFeedTypeIcon = (type: string) => {
    switch (type) {
      case 'bottle':
        return '🍼';
      case 'pump':
        return '⚙️';
      default:
        return '🤱';
    }
  };

  return (
    <div className="safe-area-container max-w-md mx-auto justify-between py-6">
      {/* Header */}
      <div className="flex items-center justify-between py-3">
        <h1 className="text-large-title font-semibold">Today</h1>
        <div className="flex items-center space-x-3">
          {syncStatus.failedCount > 0 && (
            <span className="text-[var(--accent-red)] text-caption animate-pulse">
              ⚠️ {syncStatus.failedCount} pending
            </span>
          )}
          <button
            onClick={() => {
              triggerHaptic(5);
              onNavigate('settings');
            }}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--bg-surface)] text-lg active:scale-95 transition-transform cursor-pointer"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Hero Last Feed Block */}
      <div className="my-auto py-8 space-y-10 flex flex-col items-center">
        <div className="text-center space-y-2.5">
          <p className="text-caption uppercase tracking-wider text-[var(--text-secondary)]">Last feed</p>
          {isLoading ? (
            <div className="h-16 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-[var(--bg-surface)] border-t-[var(--accent-orange)] animate-spin" />
            </div>
          ) : lastFeed ? (
            <div className="space-y-1">
              <h2 className="text-[40px] font-light tracking-tight text-[var(--text-primary)] capitalize">
                {getSideText(lastFeed)}
              </h2>
              <p className="text-body text-[var(--text-secondary)]">
                {getFeedTimeText(lastFeed.started_at)} {lastFeed.recorded_by && ` • ${lastFeed.recorded_by}`}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <h2 className="text-[40px] font-light tracking-tight text-[var(--text-primary)]">
                No logs
              </h2>
              <p className="text-body text-[var(--text-secondary)]">
                Tap below to start tracking
              </p>
            </div>
          )}
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartFeeding}
          className="relative group cursor-pointer"
        >
          <div className="absolute inset-0 bg-[var(--accent-orange)] rounded-full blur-xl opacity-20 group-active:opacity-40 transition-opacity" />
          <div className="relative w-32 h-32 rounded-full bg-[var(--bg-surface-elevated)] flex flex-col items-center justify-center active:scale-95 transition-transform shadow-2xl border border-[var(--border-color)]">
            <span className="text-4xl filter drop-shadow-md mb-1">🍼</span>
            <span className="text-headline text-[var(--accent-orange)] mt-2">Start</span>
          </div>
        </button>
      </div>

      {/* Recent Activity List Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-headline text-[var(--text-primary)]">Recent</h3>
          {sessions.length > 0 && (
            <button
              onClick={() => {
                triggerHaptic(5);
                onNavigate('history');
              }}
              className="text-body text-[var(--accent-orange)] active:opacity-60 cursor-pointer"
            >
              See All
            </button>
          )}
        </div>

        {sessions.length === 0 && !isLoading ? (
          <div className="premium-card py-10 text-center">
            <p className="text-body text-[var(--text-secondary)]">
              Your feeding history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="premium-card flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-2xl w-10 h-10 flex items-center justify-center bg-[var(--bg-base)] rounded-xl">
                    {getFeedTypeIcon(session.type)}
                  </span>
                  <div>
                    <p className="text-headline capitalize text-[var(--text-primary)]">
                      {getSideText(session)}
                    </p>
                    <p className="text-caption mt-1">
                      {new Date(session.started_at).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {session.recorded_by && ` • ${session.recorded_by}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {session.volume_ml ? (
                    <p className="text-headline text-[var(--text-primary)]">{session.volume_ml}ml</p>
                  ) : (
                    <p className="text-headline text-[var(--text-primary)]">{getDurationText(session)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            triggerHaptic(10);
            onNavigate('quickadd');
          }}
          className="btn-secondary mt-2"
        >
          Quick Add Manual Log
        </button>
      </div>
    </div>
  );
}
