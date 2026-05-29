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
    <div className="safe-area-container max-w-md mx-auto justify-between py-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-3 mb-6">
        <button
          onClick={onBack}
          className="text-caption text-neutral-400 active:opacity-60 transition-opacity cursor-pointer"
        >
          ✕ Back
        </button>
        <span className="text-caption-caps text-amber-500">
          Settings
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-1 pb-10">
        {/* Sync Info */}
        <div className="premium-card space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-body font-medium">Family Code</span>
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
        <div className="space-y-3">
          <label className="text-caption-caps block pl-1">
            Partner Name
          </label>
          <div className="flex space-x-3">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="premium-input flex-1 text-left"
            />
            <button
              onClick={handleSaveName}
              className="btn-secondary w-auto px-6"
            >
              Update
            </button>
          </div>
        </div>

        {/* Export Data */}
        <div className="space-y-3">
          <label className="text-caption-caps block pl-1">
            Data & Backup management
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportCSV}
              className="btn-secondary py-3 text-caption font-semibold"
            >
              Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="btn-secondary py-3 text-caption font-semibold"
            >
              Export JSON
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
              className="w-full py-4 bg-amber-500/10 text-caption font-semibold text-amber-500 rounded-2xl active:bg-amber-500/20 transition-colors cursor-pointer"
            >
              {isImporting ? 'Importing database records...' : '↑ Import JSON Backup'}
            </button>
            {importStatus && (
              <p className="text-caption text-center text-amber-500/80 mt-3 bg-amber-950/20 py-2.5 rounded-xl border border-amber-900/30">
                {importStatus}
              </p>
            )}
          </div>
        </div>

        {/* Maintenance */}
        <div className="space-y-3">
          <label className="text-caption-caps block pl-1 text-red-500">
            Danger Zone
          </label>
          <button
            onClick={handleClearCache}
            className="w-full text-left py-4 px-5 bg-red-950/20 border border-red-950 text-body font-semibold text-red-400 rounded-2xl active:bg-red-950/30 transition-colors cursor-pointer"
          >
            Clear Offline Database Cache
          </button>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full text-center py-4 bg-red-950/30 text-body font-semibold text-red-400 rounded-3xl active:bg-red-950/40 mt-6 transition-colors cursor-pointer"
      >
        Leave Family Sync Space
      </button>
    </div>
  );
}
