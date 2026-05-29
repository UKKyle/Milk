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
    <div className="flex-1 flex flex-col justify-between p-6 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <h1 className="text-title tracking-tight font-semibold">Today</h1>
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
            className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-900 border border-neutral-800 text-neutral-400 active:scale-95 transition-transform"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Hero Last Feed Block */}
      <div className="my-auto py-10 space-y-12">
        <div className="text-center space-y-2">
          <p className="text-caption uppercase tracking-wider text-neutral-500">Last feed</p>
          {isLoading ? (
            <div className="h-16 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-neutral-800 border-t-amber-500 animate-spin" />
            </div>
          ) : lastFeed ? (
            <div className="space-y-1">
              <h2 className="text-2xl font-light text-neutral-200">
                {getSideText(lastFeed)}
                {getDurationText(lastFeed) && ` • ${getDurationText(lastFeed)}`}
              </h2>
              <p className="text-caption text-neutral-400">{getFeedTimeText(lastFeed.started_at)}</p>
            </div>
          ) : (
            <p className="text-body text-neutral-500">No feeds recorded yet</p>
          )}
        </div>

        {/* Start Feeding Button */}
        <div className="flex justify-center">
          <button
            onClick={handleStartFeeding}
            className="w-48 h-48 rounded-full border border-amber-500/10 bg-amber-500/5 text-amber-500 text-title font-light active:scale-95 transition-all duration-300 shadow-[0_0_40px_rgba(245,158,11,0.02)] flex flex-col items-center justify-center space-y-2 hover:bg-amber-500/10 cursor-pointer"
          >
            <span>🤱</span>
            <span className="font-medium text-lg">Start Feed</span>
          </button>
        </div>
      </div>

      {/* Recents list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-caption text-neutral-500 uppercase tracking-wider font-medium">
          <span>Recent activity</span>
          <button
            onClick={() => onNavigate('history')}
            className="text-amber-500/80 active:opacity-60 transition-opacity lowercase font-normal"
          >
            See all
          </button>
        </div>

        <div className="space-y-2.5">
          {sessions.slice(0, 3).map((session) => (
            <div
              key={session.id}
              className="premium-card p-4 flex items-center justify-between text-body border border-neutral-900/50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getFeedTypeIcon(session.type)}</span>
                <div>
                  <p className="text-body font-normal text-neutral-200 capitalize">
                    {getSideText(session)}
                  </p>
                  <p className="text-caption text-neutral-500">
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
                  <p className="text-body font-medium text-neutral-300">{session.volume_ml}ml</p>
                ) : (
                  <p className="text-body font-medium text-neutral-300">{getDurationText(session)}</p>
                )}
              </div>
            </div>
          ))}

          {sessions.length === 0 && !isLoading && (
            <div className="text-center py-6 text-caption text-neutral-600">
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
          className="w-full text-center py-4 bg-neutral-900/40 border border-dashed border-neutral-800 text-caption rounded-2xl text-neutral-400 active:bg-neutral-900 transition-colors"
        >
          + Quick Add Bottle / Pump / Manual Feed
        </button>
      </div>
    </div>
  );
}
