import { useEffect, useState } from 'react';

interface DateSeparatorProps {
  date: Date;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    const formatDisplayDate = (d: Date): string => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const isToday = d.toDateString() === today.toDateString();
      const isYesterday = d.toDateString() === yesterday.toDateString();

      if (isToday) {
        return 'Today';
      }
      if (isYesterday) {
        return 'Yesterday';
      }

      return d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    };

    setDisplayText(formatDisplayDate(date));
  }, [date]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 0',
        marginTop: '12px',
      }}
    >
      <div
        style={{
          flex: 1,
          height: '1px',
          background: 'var(--border-color-light)',
        }}
      />
      <div
        style={{
          margin: '0 16px',
          padding: '4px 12px',
          background: 'var(--bg-surface-elevated)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {displayText}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          height: '1px',
          background: 'var(--border-color-light)',
        }}
      />
    </div>
  );
}
