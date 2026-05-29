import React, { useState } from 'react';
import { useAppStore } from '../store';
import { deriveFamilyId, getOrCreateDeviceId } from '../services/sessionsService';
import { useHaptics } from '../hooks/mobile';

export function WelcomeScreen() {
  const [code, setCode] = useState('');
  const [partner, setPartner] = useState('Partner 1');
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
      
      // Bootstrap family registration check on Supabase
      const { sessionsService } = await import('../services/sessionsService');
      await sessionsService.bootstrapFamily(familyId);

      // Force create device identifier if missing
      await getOrCreateDeviceId();

      setFamily(code, familyId);
      setPartnerName(partner.trim() || 'Partner 1');
      triggerHaptic([10, 30, 10]);
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication setup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="safe-area-container max-w-sm mx-auto justify-between py-12">
      {/* Spacer */}
      <div />

      {/* Hero Header */}
      <div className="space-y-3 text-center my-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-amber-500/10 text-amber-500 mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-title tracking-tight text-neutral-100">Milk Tracker</h1>
        <p className="text-body text-neutral-400 max-w-[280px] mx-auto">
          A calm, shared feeding space for you and your partner.
        </p>
      </div>

      {/* Auth Input Fields */}
      <form onSubmit={handleLogin} className="space-y-8 w-full mt-auto">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-caption-caps block pl-1">Family Code</label>
            <input
              type="text"
              required
              placeholder="OURBABY"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="premium-input uppercase tracking-widest text-center"
            />
          </div>

          <div className="space-y-2">
            <label className="text-caption-caps block pl-1">Your Name</label>
            <input
              type="text"
              required
              placeholder="Partner Name"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              className="premium-input text-center"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-caption text-center bg-red-950/20 py-3.5 px-4 rounded-2xl border border-red-900/30 animate-pulse">
            {error}
          </div>
        )}

        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? 'Setting up family...' : 'Access space'}
        </button>
      </form>
    </div>
  );
}
