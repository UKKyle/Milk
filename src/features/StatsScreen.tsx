import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { sessionsService } from '../services/sessionsService';
import { Session } from '../types';

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

export function StatsScreen() {
  const familyId = useAppStore((state) => state.familyId);

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['sessions', familyId],
    queryFn: () => sessionsService.getSessions(familyId!),
    enabled: !!familyId,
    refetchInterval: 10000,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      date,
      key: getLocalDateKey(date),
      label: formatDayLabel(date),
      value: 0,
      isToday: getLocalDateKey(date) === getLocalDateKey(today),
    };
  });

  const totalsByDay = new Map<string, number>();
  for (const session of sessions) {
    const value = session.volume_ml || 0;
    const key = getLocalDateKey(new Date(session.started_at));
    totalsByDay.set(key, (totalsByDay.get(key) || 0) + value);
  }

  const chartDays = days.map((day) => ({
    ...day,
    value: totalsByDay.get(day.key) || 0,
  }));

  const maxValue = Math.max(1, ...chartDays.map((day) => day.value));
  const weekTotal = chartDays.reduce((sum, day) => sum + day.value, 0);

  return (
    <div
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 24,
        minHeight: '100vh',
      }}
    >
      <h1
        style={{
          fontSize: 34,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          marginBottom: 24,
        }}
      >
        Stats
      </h1>

      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 16,
          padding: '20px',
          marginBottom: 24,
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
          Last 7 Days
        </p>
        <p
          style={{
            fontSize: 34,
            fontWeight: 200,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {weekTotal.toLocaleString()} ml
        </p>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>
          Dynamic daily feed totals
        </p>
      </div>

      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 16,
          padding: '20px 16px 16px',
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 16,
          }}
        >
          Daily Volume
        </p>

        {isLoading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading stats...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 10,
              alignItems: 'end',
            }}
          >
            {chartDays.map((day) => {
              const barHeight = day.value === 0 ? 8 : Math.max(12, Math.round((day.value / maxValue) * 160));

              return (
                <div key={day.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      height: 180,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 28,
                        height: barHeight,
                        borderRadius: 999,
                        background: day.isToday ? 'var(--accent-orange)' : 'var(--accent-blue)',
                        transition: 'height 0.25s ease',
                        minHeight: day.value === 0 ? 4 : undefined,
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginTop: 10,
                    }}
                  >
                    {day.value.toLocaleString()}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: day.isToday ? 'var(--accent-orange)' : 'var(--text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    {day.label}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
