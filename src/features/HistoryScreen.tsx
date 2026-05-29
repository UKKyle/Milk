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
    <div className="flex-1 flex flex-col justify-between p-6 max-w-md mx-auto w-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-2 mb-4">
        <button
          onClick={onBack}
          className="text-caption text-neutral-400 active:opacity-60 transition-opacity"
        >
          ✕ Back
        </button>
        <span className="text-caption uppercase tracking-wider text-amber-500 font-medium">
          Feeding History
        </span>
        <div className="w-10" />
      </div>

      {isLoading ? (
        <div className="my-auto flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-neutral-800 border-t-amber-500 animate-spin" />
        </div>
      ) : dayGroups.length === 0 ? (
        <div className="my-auto text-center space-y-2">
          <p className="text-body text-neutral-500">No records found</p>
          <p className="text-caption">Your logged sessions will appear here.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {dayGroups.map(([day, items]) => (
            <div key={day} className="space-y-2.5">
              <h3 className="text-caption text-neutral-500 font-medium sticky top-0 bg-neutral-950/80 backdrop-blur-sm py-1.5 z-10">
                {day}
              </h3>
              
              <div className="space-y-2">
                {items.map((session) => (
                  <div
                    key={session.id}
                    className="premium-card p-4 flex items-center justify-between border border-neutral-900/50 relative group"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getFeedTypeIcon(session.type)}</span>
                      <div>
                        <p className="text-body font-normal text-neutral-200">
                          {getSideText(session)}
                        </p>
                        <p className="text-caption text-neutral-500">
                          {new Date(session.started_at).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {session.recorded_by && ` • ${session.recorded_by}`}
                        </p>
                        {session.notes && (
                          <p className="text-caption italic text-neutral-400 mt-1">
                            "{session.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3.5">
                      <div className="text-right">
                        {session.volume_ml ? (
                          <p className="text-body font-medium text-neutral-300">{session.volume_ml}ml</p>
                        ) : (
                          <p className="text-body font-medium text-neutral-300">{getDurationText(session)}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="text-red-500/75 hover:text-red-400 p-1.5 active:scale-90 transition-transform cursor-pointer"
                        title="Delete log"
                      >
                        🗑️
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
