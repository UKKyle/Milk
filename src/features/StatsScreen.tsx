import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
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

function formatLongDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatMl(value: number): string {
  return `${value.toLocaleString()} ml`;
}

function formatOz(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} oz`;
}

export function StatsScreen() {
  const familyId = useAppStore((state) => state.familyId);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['sessions', familyId],
    queryFn: () => sessionsService.getSessions(familyId!),
    enabled: !!familyId,
    refetchInterval: 10000,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      date,
      key: getLocalDateKey(date),
      label: formatDayLabel(date),
      value: 0,
      isToday: getLocalDateKey(date) === getLocalDateKey(today),
    };
  }), [today]);

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

  useEffect(() => {
    if (selectedDayKey && chartDays.some((day) => day.key === selectedDayKey)) return;
    const defaultSelected = [...chartDays].reverse().find((day) => day.value > 0) || chartDays[chartDays.length - 1];
    setSelectedDayKey(defaultSelected?.key || null);
  }, [chartDays, selectedDayKey]);

  const selectedDay = chartDays.find((day) => day.key === selectedDayKey) || chartDays[chartDays.length - 1];
  const selectedDayDate = selectedDay?.date || today;
  const selectedDayValue = selectedDay?.value || 0;
  const selectedDayOz = selectedDayValue / 29.5735;
  const selectedDayLabel = selectedDay ? formatLongDayLabel(selectedDayDate) : 'Last 7 Days';

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
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 14 }}>
          {selectedDay ? selectedDayLabel : 'Tap a day below'}
        </p>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              ML
            </p>
            <p style={{ fontSize: 34, fontWeight: 200, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1 }}>
              {formatMl(selectedDayValue)}
            </p>
          </div>
          <div style={{ width: 1, background: 'var(--border-color)', margin: '4px 0' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              OZ
            </p>
            <p style={{ fontSize: 34, fontWeight: 200, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1 }}>
              {formatOz(selectedDayOz)}
            </p>
          </div>
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 14 }}>
          Week total: {formatMl(weekTotal)}
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
              const isSelected = selectedDayKey === day.key;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDayKey(day.key)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    opacity: isSelected ? 1 : 0.84,
                  }}
                  aria-pressed={isSelected}
                >
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
                        background: isSelected
                          ? 'var(--accent-orange)'
                          : day.isToday
                            ? 'var(--accent-orange)'
                            : 'var(--accent-blue)',
                        transition: 'height 0.25s ease',
                        minHeight: day.value === 0 ? 4 : undefined,
                        boxShadow: isSelected ? '0 0 0 3px rgba(255,159,10,0.18)' : 'none',
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isSelected ? 'var(--accent-orange)' : 'var(--text-primary)',
                      marginTop: 10,
                    }}
                  >
                    {day.value.toLocaleString()}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: isSelected || day.isToday ? 'var(--accent-orange)' : 'var(--text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    {day.label}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
