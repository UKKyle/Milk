import { useState, useEffect } from 'react';
import { useAppStore } from './store';
import { WelcomeScreen } from './features/WelcomeScreen';
import { DashboardScreen } from './features/DashboardScreen';
import { TimerScreen } from './features/TimerScreen';
import { QuickAddScreen } from './features/QuickAddScreen';
import { HistoryScreen } from './features/HistoryScreen';
import { SettingsScreen } from './features/SettingsScreen';
import { SessionRecoveryScreen } from './features/SessionRecoveryScreen';
import { processOfflineQueue } from './services/sync';
import { useHaptics } from './hooks/mobile';
import { supabase, hasValidSupabaseConfig } from './services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Session } from './types';

export function App() {
  const familyId = useAppStore((state) => state.familyId);
  const activeTimer = useAppStore((state) => state.activeTimer);
  const setSyncStatus = useAppStore((state) => state.setSyncStatus);

  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'timer' | 'quickadd' | 'history' | 'settings' | 'recovery'>('dashboard');
  const { triggerHaptic } = useHaptics();
  const queryClient = useQueryClient();

  // Active recovery checks
  useEffect(() => {
    if (familyId && activeTimer) {
      setCurrentScreen('recovery');
    } else {
      setCurrentScreen('dashboard');
    }
  }, [familyId, activeTimer]);

  // Online / offline indicators and sync queue processing
  useEffect(() => {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      setSyncStatus({ isOnline });
      if (isOnline) {
        triggerHaptic([10, 30]);
        processOfflineQueue((status) => {
          setSyncStatus(status);
        });
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial check
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [setSyncStatus, triggerHaptic]);

  // Periodic offline queue processor
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        processOfflineQueue((status) => {
          setSyncStatus(status);
        });
      }
    }, 30000); // Check queue every 30 seconds

    return () => clearInterval(interval);
  }, [setSyncStatus]);

  // Supabase real-time updates subscription
  useEffect(() => {
    if (!familyId || !hasValidSupabaseConfig) return;

    const channel = supabase
      .channel(`realtime-sessions:${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `family_id=eq.${familyId}`,
        },
        async (payload) => {
          // Perform real-time cache reconcile actions (reconciliation design constraints)
          queryClient.setQueryData(['sessions', familyId], (oldData: any) => {
            const list: Session[] = oldData ? [...oldData] : [];
            const newRow = payload.new as Session;
            const oldRow = payload.old as Session;

            if (payload.eventType === 'INSERT') {
              // Only insert if it doesn't already exist in the list (prevent duplicate local creations)
              if (!list.some((s) => s.id === newRow.id)) {
                return [newRow, ...list];
              }
            } else if (payload.eventType === 'UPDATE') {
              return list.map((s) => (s.id === newRow.id ? newRow : s));
            } else if (payload.eventType === 'DELETE') {
              return list.filter((s) => s.id !== oldRow.id);
            }
            return list;
          });

          // Sync cache locally to IndexedDB as well
          const { saveLocalSession, deleteLocalSession } = await import('./services/db');
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            await saveLocalSession(payload.new as Session);
          } else if (payload.eventType === 'DELETE') {
            await deleteLocalSession((payload.old as any).id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, queryClient]);

  if (!familyId) {
    return (
      <main className="min-h-screen flex flex-col justify-between bg-[#0d0d0d] text-neutral-100 font-sans antialiased">
        <WelcomeScreen />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-[#0d0d0d] text-neutral-100 font-sans antialiased">
      {currentScreen === 'recovery' && (
        <SessionRecoveryScreen
          onResume={() => setCurrentScreen('timer')}
          onDiscard={() => setCurrentScreen('dashboard')}
        />
      )}

      {currentScreen === 'dashboard' && (
        <DashboardScreen onNavigate={(screen) => setCurrentScreen(screen as any)} />
      )}

      {currentScreen === 'timer' && (
        <TimerScreen onBack={() => setCurrentScreen('dashboard')} />
      )}

      {currentScreen === 'quickadd' && (
        <QuickAddScreen onBack={() => setCurrentScreen('dashboard')} />
      )}

      {currentScreen === 'history' && (
        <HistoryScreen onBack={() => setCurrentScreen('dashboard')} />
      )}

      {currentScreen === 'settings' && (
        <SettingsScreen onBack={() => setCurrentScreen('dashboard')} />
      )}
    </main>
  );
}
