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
    <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full">
      <div className="space-y-2 text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-title">Milk Tracker</h1>
        <p className="text-caption">A calm, shared feeding space for you and your partner.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-caption block mb-2">Family Code</label>
            <input
              type="text"
              required
              placeholder="e.g. OURBABY"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3.5 text-body focus:outline-none focus:border-amber-500/50 transition-colors uppercase tracking-wider text-center"
            />
          </div>

          <div>
            <label className="text-caption block mb-2">Your Name</label>
            <input
              type="text"
              required
              placeholder="Partner 1"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3.5 text-body focus:outline-none focus:border-amber-500/50 transition-colors text-center"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-caption text-center bg-red-950/20 py-2.5 px-3 rounded-xl border border-red-900/30">
            {error}
          </div>
        )}

        <button type="submit" disabled={isLoading} className="w-full btn-primary block text-center">
          {isLoading ? 'Setting up family space...' : 'Access family space'}
        </button>
      </form>
    </div>
  );
}
