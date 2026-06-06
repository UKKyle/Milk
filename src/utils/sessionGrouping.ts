import { Session } from '../types';

export function groupSessionsByDay(sessions: Session[]): { dateKey: string; date: Date; sessions: Session[] }[] {
  const grouped = sessions.reduce((acc: Record<string, Session[]>, session) => {
    const date = new Date(session.started_at);
    const dateKey = date.toDateString();
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(session);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([dateKey, sessionList]) => ({
      dateKey,
      date: new Date(dateKey),
      sessions: sessionList.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function calculateTimeGap(start: Date, end: Date): number {
  return Math.abs(end.getTime() - start.getTime());
}

export function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
