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
      <div className="space-y-4 text-center my-auto">
        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
          {/* Soft glow background */}
          <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
          {/* Main icon container */}
          <div className="relative flex items-center justify-center w-20 h-20 rounded-[24px] bg-neutral-900 border border-neutral-800 shadow-2xl">
            <span className="text-4xl filter drop-shadow-md">🍼</span>
          </div>
        </div>
        <h1 className="text-title tracking-tight text-neutral-100">Milk Tracker</h1>
        <p className="text-body text-neutral-400 max-w-[280px] mx-auto leading-relaxed">
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
