import React, { useState } from 'react';
import { useAppStore } from '../store';
import { deriveFamilyId, getOrCreateDeviceId } from '../services/sessionsService';
import { useHaptics } from '../hooks/mobile';
import { Droplet } from 'lucide-react';

export function WelcomeScreen() {
  const [code, setCode] = useState('');
  const [partner, setPartner] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setFamily = useAppStore((state) => state.setFamily);
  const setPartnerName = useAppStore((state) => state.setPartnerName);
  const { triggerHaptic } = useHaptics();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setError(null);
    triggerHaptic(15);

    try {
      const familyId = await deriveFamilyId(code);
      const { sessionsService } = await import('../services/sessionsService');
      await sessionsService.bootstrapFamily(familyId);
      await getOrCreateDeviceId();

      setFamily(code, familyId);
      setPartnerName(partner.trim() || 'Partner 1');
      triggerHaptic([10, 30, 10]);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '0 32px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <Droplet size={36} strokeWidth={1.5} color="var(--accent-orange)" />
        </div>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 300,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}
        >
          Milk
        </h1>
        <p
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
          }}
        >
          Track feeds together, effortlessly.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 340 }}>
        <div className="ios-list-group" style={{ marginBottom: 16 }}>
          <div className="ios-list-item" style={{ cursor: 'default' }}>
            <input
              type="text"
              required
              placeholder="Family Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 17,
                fontWeight: 400,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            />
          </div>
          <div className="ios-list-item" style={{ cursor: 'default' }}>
            <input
              type="text"
              placeholder="Your Name"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 17,
                fontWeight: 400,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {error && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--accent-red)',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 12,
            border: 'none',
            background: 'var(--accent-orange)',
            color: '#000',
            fontSize: 17,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            opacity: isLoading ? 0.6 : 1,
            transition: 'opacity 0.2s, transform 0.1s',
          }}
        >
          {isLoading ? 'Connecting...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
