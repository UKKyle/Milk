import { useState, useEffect } from 'react';
import { useAppStore } from './store';
import { WelcomeScreen } from './features/WelcomeScreen';
import { DashboardScreen } from './features/DashboardScreen';
import { TimerScreen } from './features/TimerScreen';
import { QuickAddScreen } from './features/QuickAddScreen';
import { HistoryScreen } from './features/HistoryScreen';
import { StatsScreen } from './features/StatsScreen';
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
  const theme = useAppStore((state) => state.theme);
  const backgroundImage = useAppStore((state) => state.backgroundImage);
  const setSyncStatus = useAppStore((state) => state.setSyncStatus);

  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'stats' | 'timer' | 'quickadd' | 'history' | 'settings' | 'recovery'>('dashboard');
  const { triggerHaptic } = useHaptics();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  }, [theme]);

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
    const updateOnlineStatus = async () => {
      const isOnline = navigator.onLine;
      setSyncStatus({ isOnline });
      if (isOnline) {
        triggerHaptic([10, 30]);
        if (familyId && hasValidSupabaseConfig) {
          const { sessionsService } = await import('./services/sessionsService');
          await sessionsService.bootstrapFamily(familyId);
          await queryClient.invalidateQueries({ queryKey: ['sessions', familyId] });
        }
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
  }, [familyId, queryClient, setSyncStatus, triggerHaptic]);

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
      <main className="min-h-screen flex flex-col justify-between font-sans antialiased">
        <WelcomeScreen />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col font-sans antialiased pb-20" style={{ position: 'relative', isolation: 'isolate' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundColor: 'var(--bg-base)',
          backgroundImage: backgroundImage
            ? `linear-gradient(rgba(0,0,0,${theme === 'light' ? 0.18 : 0.28}), rgba(0,0,0,${theme === 'light' ? 0.18 : 0.28})), url("${backgroundImage}")`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: backgroundImage ? 'saturate(0.95)' : 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Overlays / Full Screen Modals */}
        {currentScreen === 'recovery' && (
          <div className="fixed inset-0 bg-[var(--bg-base)] z-50 overflow-y-auto">
            <SessionRecoveryScreen
              onResume={() => setCurrentScreen('timer')}
              onDiscard={() => setCurrentScreen('dashboard')}
            />
          </div>
        )}

        {currentScreen === 'timer' && (
          <div className="fixed inset-0 bg-[var(--bg-base)] z-50 overflow-y-auto">
            <TimerScreen onBack={() => setCurrentScreen('dashboard')} />
          </div>
        )}

        {currentScreen === 'quickadd' && (
          <div className="fixed inset-0 bg-[var(--bg-base)] z-50 overflow-y-auto">
            <QuickAddScreen onBack={() => setCurrentScreen('dashboard')} />
          </div>
        )}

        {/* Main Tab Content */}
        {currentScreen === 'dashboard' && <DashboardScreen onNavigate={(screen) => setCurrentScreen(screen as any)} />}
        {currentScreen === 'stats' && <StatsScreen />}
        {currentScreen === 'history' && <HistoryScreen onBack={() => setCurrentScreen('dashboard')} />}
        {currentScreen === 'settings' && <SettingsScreen onBack={() => setCurrentScreen('dashboard')} />}

        {/* iOS Bottom Tab Bar */}
        {['dashboard', 'stats', 'history', 'settings'].includes(currentScreen) && (
          <div className="ios-bottom-tabs">
            <button 
              className={`ios-tab-item ${currentScreen === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentScreen('dashboard')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={currentScreen === 'dashboard' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Dashboard
            </button>

            <button 
              className={`ios-tab-item ${currentScreen === 'stats' ? 'active' : ''}`}
              onClick={() => setCurrentScreen('stats')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={currentScreen === 'stats' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chart-column"><path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5" rx="1"/><rect x="12" y="9" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/></svg>
              Stats
            </button>
            
            <button 
              className={`ios-tab-item ${currentScreen === 'history' ? 'active' : ''}`}
              onClick={() => setCurrentScreen('history')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              History
            </button>

            <button 
              className={`ios-tab-item ${currentScreen === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentScreen('settings')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={currentScreen === 'settings' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Settings
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
