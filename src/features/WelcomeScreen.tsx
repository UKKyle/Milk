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
    <div className="safe-area-container max-w-sm mx-auto justify-center px-6">
      
      <div className="w-full flex flex-col items-center justify-center space-y-12 my-auto">
        
        {/* Hero Header - Ultra Minimal */}
        <div className="space-y-6 text-center">
          <svg className="w-12 h-12 mx-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.5C16.1421 21.5 19.5 18.1421 19.5 14C19.5 9.85786 12 2.5 12 2.5C12 2.5 4.5 9.85786 4.5 14C4.5 18.1421 7.85786 21.5 12 21.5Z" />
          </svg>
          <div className="space-y-2">
            <h1 className="text-large-title tracking-tight font-light text-[var(--text-primary)]">
              Milk
            </h1>
            <p className="text-body text-[var(--text-secondary)] font-light">
              Your shared feeding space.
            </p>
          </div>
        </div>

        {/* Auth Input Fields */}
        <form onSubmit={handleLogin} className="space-y-6 w-full">
          <div className="space-y-4">
            <input
              type="text"
              required
              placeholder="Family Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="premium-input uppercase tracking-widest text-center h-[56px]"
            />
            <input
              type="text"
              required
              placeholder="Your Name"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              className="premium-input text-center h-[56px]"
            />
          </div>

          {error && (
            <div className="text-[var(--accent-red)] text-caption text-center animate-pulse">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full h-[56px] bg-[var(--text-primary)] text-[var(--bg-base)] font-semibold rounded-[14px] active:scale-95 transition-transform flex items-center justify-center text-[17px] tracking-tight mt-8 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Setting up...' : 'Continue'}
          </button>
        </form>

      </div>
    </div>
  );
}
