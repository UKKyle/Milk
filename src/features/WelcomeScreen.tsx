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
    <div className="safe-area-container max-w-sm mx-auto justify-between py-12 px-6">
      {/* Spacer */}
      <div />

      {/* Hero Header - Ultra Minimal */}
      <div className="space-y-6 text-center mt-12 mb-auto">
        <svg className="w-12 h-12 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.5C16.1421 21.5 19.5 18.1421 19.5 14C19.5 9.85786 12 2.5 12 2.5C12 2.5 4.5 9.85786 4.5 14C4.5 18.1421 7.85786 21.5 12 21.5Z" />
        </svg>
        <div className="space-y-2">
          <h1 className="text-[40px] leading-tight font-light tracking-tight text-neutral-50">
            Milk
          </h1>
          <p className="text-body text-neutral-500 max-w-[240px] mx-auto font-light">
            Your shared feeding space.
          </p>
        </div>
      </div>

      {/* Auth Input Fields */}
      <form onSubmit={handleLogin} className="space-y-6 w-full mb-8">
        <div className="space-y-4">
          <input
            type="text"
            required
            placeholder="Family Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-14 bg-neutral-900 border-none rounded-2xl px-5 text-body text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all uppercase tracking-widest text-center"
          />
          <input
            type="text"
            required
            placeholder="Your Name"
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            className="w-full h-14 bg-neutral-900 border-none rounded-2xl px-5 text-body text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all text-center"
          />
        </div>

        {error && (
          <div className="text-red-400 text-caption text-center animate-pulse">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full h-14 bg-neutral-100 text-neutral-950 font-medium rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center text-body mt-8 disabled:opacity-50"
        >
          {isLoading ? 'Setting up...' : 'Continue'}

        </button>
      </form>
    </div>
  );
}
