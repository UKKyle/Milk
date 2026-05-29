import { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { useHaptics } from '../hooks/mobile';
import { useQuery } from '@tanstack/react-query';
import { sessionsService } from '../services/sessionsService';
import { exportToCSV, exportToJSON, importFromJSON } from '../utils/backup';
import * as localDb from '../services/db';

interface SettingsProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsProps) {
  const familyId = useAppStore((state) => state.familyId);
  const familyCode = useAppStore((state) => state.familyCode);
  const partnerName = useAppStore((state) => state.partnerName);
  const setPartnerName = useAppStore((state) => state.setPartnerName);
  const logout = useAppStore((state) => state.logout);
  const syncStatus = useAppStore((state) => state.syncStatus);

  const [nameInput, setNameInput] = useState(partnerName);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { triggerHaptic } = useHaptics();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Retrieve cached sessions list for export processes
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', familyId],
    queryFn: () => sessionsService.getSessions(familyId!),
    enabled: !!familyId,
  });

  const handleSaveName = () => {
    triggerHaptic(10);
    setPartnerName(nameInput.trim() || 'Partner 1');
    alert('Partner name updated!');
  };

  const handleExportCSV = () => {
    triggerHaptic(15);
    exportToCSV(sessions, familyCode || 'family');
  };

  const handleExportJSON = () => {
    triggerHaptic(15);
    exportToJSON(sessions, familyId || '', familyCode || 'family');
  };

  const handleImportClick = () => {
    triggerHaptic(5);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Reading backup file...');
    triggerHaptic(10);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        const result = await importFromJSON(content, familyId!);
        if (result.success) {
          triggerHaptic([20, 50, 20]);
          setImportStatus(`Success! Imported ${result.importedCount} session records.`);
          // Flush react-query cached views
          window.location.reload();
        } else {
          triggerHaptic([30, 30]);
          setImportStatus(`Import failed: ${result.error}`);
        }
      } catch (err: any) {
        setImportStatus(`Malformed backup: ${err.message}`);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleClearCache = async () => {
    triggerHaptic([40, 40]);
    if (confirm('Warning: This will wipe your offline logs cache. Ready?')) {
      await localDb.clearLocalSessions();
      alert('Offline database cached elements cleared successfully.');
      window.location.reload();
    }
  };

  const handleLogout = () => {
    triggerHaptic([30, 10, 30]);
    if (confirm('Leave this family sync space?')) {
      logout();
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 max-w-md mx-auto w-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-2 mb-4">
        <button
          onClick={onBack}
          className="text-caption text-neutral-400 active:opacity-60 transition-opacity"
        >
          ✕ Back
        </button>
        <span className="text-caption uppercase tracking-wider text-amber-500 font-medium">
          Settings
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {/* Sync Info */}
        <div className="premium-card p-4 space-y-2 border border-neutral-900">
          <div className="flex justify-between items-center">
            <span className="text-body font-medium text-neutral-200">Family Code</span>
            <span className="text-body font-bold text-amber-500 tracking-wider uppercase">
              {familyCode}
            </span>
          </div>
          <div className="flex justify-between items-center text-caption">
            <span>Online Sync status</span>
            <span className={syncStatus.isOnline ? 'text-green-400' : 'text-neutral-500'}>
              {syncStatus.isOnline ? '● Connected' : '○ Offline'}
            </span>
          </div>
          {syncStatus.failedCount > 0 && (
            <div className="text-caption text-red-400 bg-red-950/20 py-2 px-3 rounded-lg border border-red-900/35">
              ⚠️ {syncStatus.failedCount} operations are waiting in the sync queue.
            </div>
          )}
        </div>

        {/* Profile Settings */}
        <div className="space-y-2">
          <label className="text-caption text-neutral-500 uppercase tracking-wider block">
            Partner Name
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-2.5 text-body focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={handleSaveName}
              className="bg-neutral-850 border border-neutral-800 text-caption font-semibold px-4 rounded-xl active:bg-neutral-800"
            >
              Update
            </button>
          </div>
        </div>

        {/* Export Data */}
        <div className="space-y-2.5">
          <label className="text-caption text-neutral-500 uppercase tracking-wider block">
            Data & Backup management
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportCSV}
              className="py-3 bg-neutral-900/40 border border-neutral-800 rounded-xl text-caption text-neutral-200 active:bg-neutral-800"
            >
              Export CSV Logs
            </button>
            <button
              onClick={handleExportJSON}
              className="py-3 bg-neutral-900/40 border border-neutral-800 rounded-xl text-caption text-neutral-200 active:bg-neutral-800"
            >
              Export JSON Backup
            </button>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="w-full py-3 bg-amber-500/5 border border-dashed border-amber-500/20 text-caption text-amber-500 rounded-xl active:bg-amber-500/10 cursor-pointer"
            >
              {isImporting ? 'Importing database records...' : '↑ Import JSON Backup'}
            </button>
            {importStatus && (
              <p className="text-caption text-center text-amber-500/80 mt-2 bg-amber-950/10 py-2 rounded-xl">
                {importStatus}
              </p>
            )}
          </div>
        </div>

        {/* Maintenance */}
        <div className="space-y-2">
          <label className="text-caption text-neutral-500 uppercase tracking-wider block">
            Danger Zone
          </label>
          <button
            onClick={handleClearCache}
            className="w-full text-left py-3.5 px-4 bg-red-950/10 border border-red-950 text-caption text-red-400 rounded-xl active:bg-red-950/20 cursor-pointer"
          >
            Clear Offline Database Cache
          </button>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full text-center py-4 bg-red-950/20 border border-red-900/35 text-body font-semibold text-red-400 rounded-2xl active:bg-red-950/40 mt-6 cursor-pointer"
      >
        Leave Family Sync Space
      </button>
    </div>
  );
}
