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
        <h1 className="text-title tracking-tight text-neutral-100">Today</h1>
        <div className="flex items-center space-x-3">
          {syncStatus.failedCount > 0 && (
            <span className="text-red-400 text-caption animate-pulse">
              ⚠️ {syncStatus.failedCount} pending
            </span>
          )}
          <button
            onClick={() => {
              triggerHaptic(5);
              onNavigate('settings');
            }}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-neutral-900 text-lg active:scale-95 transition-transform cursor-pointer"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Hero Last Feed Block */}
      <div className="my-auto py-8 space-y-10 flex flex-col items-center">
        <div className="text-center space-y-2.5">
          <p className="text-caption-caps">Last feed</p>
          {isLoading ? (
            <div className="h-16 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-neutral-900 border-t-amber-500 animate-spin" />
            </div>
          ) : lastFeed ? (
            <div className="space-y-1">
              <h2 className="text-3xl font-light text-neutral-100 tracking-tight">
                {getSideText(lastFeed)}
                {getDurationText(lastFeed) && ` • ${getDurationText(lastFeed)}`}
              </h2>
              <p className="text-body text-neutral-400">{getFeedTimeText(lastFeed.started_at)}</p>
            </div>
          ) : (
            <p className="text-body text-neutral-500">No feeds recorded yet</p>
          )}
        </div>

        {/* Start Feeding Button */}
        <button
          onClick={handleStartFeeding}
          className="w-52 h-52 rounded-full border border-amber-500/10 bg-amber-500/5 text-amber-500 active:scale-95 transition-all duration-300 shadow-[0_0_50px_rgba(255,159,10,0.03)] flex flex-col items-center justify-center space-y-3 cursor-pointer"
        >
          <span className="text-4xl">🤱</span>
          <span className="font-semibold text-lg tracking-tight">Start Feed</span>
        </button>
      </div>

      {/* Recents list */}
      <div className="space-y-4 w-full mt-auto">
        <div className="flex items-center justify-between">
          <span className="text-caption-caps">Recent activity</span>
          <button
            onClick={() => onNavigate('history')}
            className="text-caption text-amber-500/90 active:opacity-60 transition-opacity font-semibold cursor-pointer"
          >
            See all
          </button>
        </div>

        <div className="space-y-3">
          {sessions.slice(0, 3).map((session) => (
            <div
              key={session.id}
              className="premium-card flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <span className="text-2xl bg-neutral-900 w-12 h-12 rounded-xl flex items-center justify-center">
                  {getFeedTypeIcon(session.type)}
                </span>
                <div>
                  <p className="text-body font-semibold text-neutral-100 capitalize">
                    {getSideText(session)}
                  </p>
                  <p className="text-caption">
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
                  <p className="text-body font-bold text-neutral-200">{session.volume_ml}ml</p>
                ) : (
                  <p className="text-body font-bold text-neutral-200">{getDurationText(session)}</p>
                )}
              </div>
            </div>
          ))}

          {sessions.length === 0 && !isLoading && (
            <div className="text-center py-8 text-caption text-neutral-600">
              Tap above to record your first session.
            </div>
          )}
        </div>

        {/* Quick Add Quick Actions Panel */}
        <button
          onClick={() => {
            triggerHaptic(5);
            onNavigate('quickadd');
          }}
          className="w-full text-center py-4.5 bg-neutral-900/60 border border-dashed border-neutral-800 text-caption font-semibold rounded-2xl text-neutral-400 active:bg-neutral-900 transition-colors cursor-pointer"
        >
          + Quick Record Entry
        </button>
      </div>
    </div>
  );
}
