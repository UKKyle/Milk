import { useEffect, useState } from 'react';

interface TimeGapProps {
  milliseconds: number;
}

export function TimeGapIndicator({ milliseconds }: TimeGapProps) {
  const [displayTime, setDisplayTime] = useState('');

  useEffect(() => {
    const formatTime = (ms: number): string => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0 && minutes > 0) {
        return `${hours} Hrs ${minutes % 60} Mins`;
      } else if (hours > 0) {
        return `${hours} Hrs`;
      } else if (minutes > 0) {
        return `${minutes} Mins`;
      } else {
        const secs = seconds;
        return secs > 0 ? `${secs} Secs` : '< 1 Min';
      }
    };

    setDisplayTime(formatTime(milliseconds));
  }, [milliseconds]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 0',
        gap: '8px',
      }}
    >
      <div
        style={{
          flex: 1,
          height: '1px',
          background: 'var(--border-color-light)',
          minWidth: '40px',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          background: 'var(--bg-surface-elevated)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          ↓
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayTime}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          height: '1px',
          background: 'var(--border-color-light)',
          minWidth: '40px',
        }}
      />
    </div>
  );
}
