import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { sessionsService } from '../services/sessionsService';
import { useHaptics } from '../hooks/mobile';
import { Session } from '../types';

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
    if (confirm('Delete this feed record permanently?')) {
      // Optimistic delete directly from local TanStack Query cache
      queryClient.setQueryData(['sessions', familyId], (old: any) => {
        return old ? old.filter((s: any) => s.id !== id) : [];
      });

      await sessionsService.deleteSession(id, familyId!);
    }
  };

  // Group sessions by day
  const groupSessionsByDay = (list: Session[]) => {
    const groups: { [key: string]: Session[] } = {};
    list.forEach((s) => {
      const dateStr = new Date(s.started_at).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(s);
    });
    return Object.entries(groups);
  };

  const getSideText = (feed: Session) => {
    if (feed.type === 'bottle') return `Bottle (${feed.volume_ml}ml)`;
    if (feed.type === 'pump') return `Pump (${feed.volume_ml}ml)`;
    return feed.side === 'left' ? 'Left Side' : 'Right Side';
  };

  const getDurationText = (feed: Session) => {
    if (!feed.duration_s) return '';
    const mins = Math.floor(feed.duration_s / 60);
    return `${mins} min`;
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

  const dayGroups = groupSessionsByDay(sessions);

  return (
    <div className="safe-area-container max-w-md mx-auto justify-between py-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-3 mb-4">
        <button
          onClick={onBack}
          className="text-caption text-neutral-400 active:opacity-60 transition-opacity cursor-pointer"
        >
          ✕ Back
        </button>
        <span className="text-caption-caps text-amber-500">
          Feeding History
        </span>
        <div className="w-10" />
      </div>

      {isLoading ? (
        <div className="my-auto flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-neutral-900 border-t-amber-500 animate-spin" />
        </div>
      ) : dayGroups.length === 0 ? (
        <div className="my-auto text-center space-y-2">
          <p className="text-body text-neutral-500">No records found</p>
          <p className="text-caption">Your logged sessions will appear here.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-10">
          {dayGroups.map(([day, items]) => (
            <div key={day} className="space-y-3">
              <h3 className="text-caption-caps sticky top-0 bg-black/80 backdrop-blur-md py-2 z-10">
                {day}
              </h3>
              
              <div className="space-y-3">
                {items.map((session) => (
                  <div
                    key={session.id}
                    className="premium-card flex items-center justify-between relative group"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl bg-neutral-900 w-12 h-12 rounded-xl flex items-center justify-center">
                        {getFeedTypeIcon(session.type)}
                      </span>
                      <div>
                        <p className="text-body font-semibold text-neutral-100 capitalize">
                          {getSideText(session)}
                        </p>
                        <p className="text-caption mt-0.5">
                          {new Date(session.started_at).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {session.recorded_by && ` • ${session.recorded_by}`}
                        </p>
                        {session.notes && (
                          <p className="text-caption italic text-neutral-400 mt-1.5">
                            "{session.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between h-full space-y-2">
                      {session.volume_ml ? (
                        <p className="text-body font-bold text-neutral-200">{session.volume_ml}ml</p>
                      ) : (
                        <p className="text-body font-bold text-neutral-200">{getDurationText(session)}</p>
                      )}
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="text-red-500/80 hover:text-red-400 active:scale-90 transition-transform cursor-pointer"
                        title="Delete log"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
