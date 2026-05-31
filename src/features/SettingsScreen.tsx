import { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { useHaptics } from '../hooks/mobile';
import { useQuery } from '@tanstack/react-query';
import { sessionsService } from '../services/sessionsService';
import { exportToCSV, exportToJSON, importFromJSON } from '../utils/backup';
import * as localDb from '../services/db';
import { ChevronRight, Upload, Download, Trash2, LogOut } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsProps) {
  const familyId = useAppStore((state) => state.familyId);
  const familyCode = useAppStore((state) => state.familyCode);
  const partnerName = useAppStore((state) => state.partnerName);
  const theme = useAppStore((state) => state.theme);
  const accentScheme = useAppStore((state) => state.accentScheme);
  const backgroundImage = useAppStore((state) => state.backgroundImage);
  const setPartnerName = useAppStore((state) => state.setPartnerName);
  const setTheme = useAppStore((state) => state.setTheme);
  const setAccentScheme = useAppStore((state) => state.setAccentScheme);
  const setBackgroundImage = useAppStore((state) => state.setBackgroundImage);
  const logout = useAppStore((state) => state.logout);
  const syncStatus = useAppStore((state) => state.syncStatus);

  const [nameInput, setNameInput] = useState(partnerName);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [backgroundStatus, setBackgroundStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { triggerHaptic } = useHaptics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', familyId],
    queryFn: () => sessionsService.getSessions(familyId!),
    enabled: !!familyId,
  });

  const handleSaveName = () => {
    triggerHaptic(10);
    setPartnerName(nameInput.trim() || 'Partner 1');
  };

  const handleThemeChange = (nextTheme: 'dark' | 'light') => {
    triggerHaptic(10);
    setTheme(nextTheme);
  };

  const handleAccentChange = (nextScheme: 'sunrise' | 'ocean' | 'plum' | 'forest') => {
    triggerHaptic(10);
    setAccentScheme(nextScheme);
  };

  const handleBackgroundPick = () => {
    triggerHaptic(5);
    backgroundInputRef.current?.click();
  };

  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBackgroundStatus('Please upload an image file.');
      return;
    }

    setBackgroundStatus('Applying background...');
    triggerHaptic(10);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        setBackgroundStatus('Could not read that image.');
        return;
      }

      setBackgroundImage(result);
      setBackgroundStatus('Background updated.');
      triggerHaptic([20, 40, 20]);
    };
    reader.onerror = () => {
      setBackgroundStatus('Could not read that image.');
    };
    reader.readAsDataURL(file);
  };

  const handleExportCSV = () => { triggerHaptic(15); exportToCSV(sessions, familyCode || 'family'); };
  const handleExportJSON = () => { triggerHaptic(15); exportToJSON(sessions, familyId || '', familyCode || 'family'); };
  const handleImportClick = () => { triggerHaptic(5); fileInputRef.current?.click(); };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportStatus('Reading backup...');
    triggerHaptic(10);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        const result = await importFromJSON(content, familyId!);
        if (result.success) {
          triggerHaptic([20, 50, 20]);
          setImportStatus(`Imported ${result.importedCount} records.`);
          window.location.reload();
        } else {
          setImportStatus(`Failed: ${result.error}`);
        }
      } catch (err: any) {
        setImportStatus(`Error: ${err.message}`);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleClearCache = async () => {
    triggerHaptic([40, 40]);
    if (confirm('Clear all offline data?')) {
      await localDb.clearLocalSessions();
      window.location.reload();
    }
  };

  const handleLogout = () => {
    triggerHaptic([30, 10, 30]);
    if (confirm('Leave this family space?')) { logout(); }
  };

  return (
    <div
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 100,
        minHeight: '100vh',
      }}
    >
      {/* Large Title */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 18,
          padding: '18px 20px',
          marginBottom: 24,
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.10)',
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          Preferences
        </p>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Settings
        </h1>
      </div>

      {/* Account Section */}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>
        Account
      </p>
      <div className="ios-list-group">
        <div className="ios-list-item" style={{ cursor: 'default' }}>
          <span style={{ fontSize: 17, color: 'var(--text-primary)' }}>Family Code</span>
          <span style={{ fontSize: 17, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{familyCode}</span>
        </div>
        <div className="ios-list-item" style={{ cursor: 'default' }}>
          <span style={{ fontSize: 17, color: 'var(--text-primary)' }}>Sync Status</span>
          <span style={{ fontSize: 15, color: syncStatus.isOnline ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
            {syncStatus.isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>
        {syncStatus.failedCount > 0 && (
          <div className="ios-list-item" style={{ cursor: 'default' }}>
            <span style={{ fontSize: 15, color: 'var(--accent-red)' }}>
              {syncStatus.failedCount} pending sync operations
            </span>
          </div>
        )}
      </div>

      {/* Profile Section */}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>
        Profile
      </p>
      <div className="ios-list-group">
        <div className="ios-list-item" style={{ cursor: 'default', gap: 12 }}>
          <span style={{ fontSize: 17, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Name</span>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleSaveName}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 17,
              color: 'var(--text-secondary)',
              fontFamily: 'inherit',
              textAlign: 'right',
            }}
          />
        </div>
      </div>

      {/* Appearance Section */}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>
        Appearance
      </p>
      <div className="ios-list-group">
        <div className="ios-list-item" style={{ cursor: 'default', display: 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 17, color: 'var(--text-primary)' }}>Theme</span>
            <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </div>
          <div className="pill-selector">
            <button
              type="button"
              className={`pill-option ${theme === 'dark' ? 'pill-option-active' : ''}`}
              onClick={() => handleThemeChange('dark')}
              aria-pressed={theme === 'dark'}
            >
              Dark
            </button>
            <button
              type="button"
              className={`pill-option ${theme === 'light' ? 'pill-option-active' : ''}`}
              onClick={() => handleThemeChange('light')}
              aria-pressed={theme === 'light'}
            >
              Light
            </button>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>
        Color Scheme
      </p>
      <div className="ios-list-group">
        <div className="ios-list-item" style={{ cursor: 'default', display: 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 17, color: 'var(--text-primary)' }}>Accent Palette</span>
            <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
              {accentScheme.charAt(0).toUpperCase() + accentScheme.slice(1)}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4, background: 'var(--bg-surface-elevated)', padding: 2, borderRadius: 8 }}>
            <button
              type="button"
              className={`pill-option ${accentScheme === 'sunrise' ? 'pill-option-active' : ''}`}
              onClick={() => handleAccentChange('sunrise')}
              aria-pressed={accentScheme === 'sunrise'}
            >
              Sunrise
            </button>
            <button
              type="button"
              className={`pill-option ${accentScheme === 'ocean' ? 'pill-option-active' : ''}`}
              onClick={() => handleAccentChange('ocean')}
              aria-pressed={accentScheme === 'ocean'}
            >
              Ocean
            </button>
            <button
              type="button"
              className={`pill-option ${accentScheme === 'plum' ? 'pill-option-active' : ''}`}
              onClick={() => handleAccentChange('plum')}
              aria-pressed={accentScheme === 'plum'}
            >
              Plum
            </button>
            <button
              type="button"
              className={`pill-option ${accentScheme === 'forest' ? 'pill-option-active' : ''}`}
              onClick={() => handleAccentChange('forest')}
              aria-pressed={accentScheme === 'forest'}
            >
              Forest
            </button>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>
        Background
      </p>
      <div className="ios-list-group">
        <input
          ref={backgroundInputRef}
          type="file"
          accept="image/*"
          onChange={handleBackgroundChange}
          style={{ display: 'none' }}
        />
        <div className="ios-list-item" style={{ cursor: 'default', display: 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 17, color: 'var(--text-primary)' }}>App Background</span>
            <span style={{ fontSize: 15, color: 'var(--text-secondary)', textAlign: 'right' }}>
              {backgroundImage ? 'Image set' : 'No image'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleBackgroundPick}
            className="btn-secondary"
            style={{ height: 44, padding: '0 16px', borderRadius: 12 }}
          >
            {backgroundImage ? 'Replace Background Image' : 'Upload Background Image'}
          </button>
          {backgroundStatus && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>
              {backgroundStatus}
            </p>
          )}
        </div>
      </div>

      {/* Data Section */}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>
        Data & Backup
      </p>
      <div className="ios-list-group">
        <div className="ios-list-item" onClick={handleExportCSV}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Download size={20} strokeWidth={1.5} color="var(--accent-blue)" />
            <span style={{ fontSize: 17, color: 'var(--text-primary)' }}>Export as CSV</span>
          </div>
          <ChevronRight size={18} color="var(--text-tertiary)" />
        </div>
        <div className="ios-list-item" onClick={handleExportJSON}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Download size={20} strokeWidth={1.5} color="var(--accent-blue)" />
            <span style={{ fontSize: 17, color: 'var(--text-primary)' }}>Export as JSON</span>
          </div>
          <ChevronRight size={18} color="var(--text-tertiary)" />
        </div>
        <div className="ios-list-item" onClick={handleImportClick}>
          <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Upload size={20} strokeWidth={1.5} color="var(--accent-blue)" />
            <span style={{ fontSize: 17, color: 'var(--text-primary)' }}>
              {isImporting ? 'Importing...' : 'Import JSON Backup'}
            </span>
          </div>
          <ChevronRight size={18} color="var(--text-tertiary)" />
        </div>
      </div>
      {importStatus && (
        <p style={{ fontSize: 13, color: 'var(--accent-orange)', textAlign: 'center', marginTop: -16, marginBottom: 24 }}>
          {importStatus}
        </p>
      )}

      {/* Danger Zone */}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 16px 8px' }}>
        Danger Zone
      </p>
      <div className="ios-list-group">
        <div className="ios-list-item" onClick={handleClearCache}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Trash2 size={20} strokeWidth={1.5} color="var(--accent-red)" />
            <span style={{ fontSize: 17, color: 'var(--accent-red)' }}>Clear Offline Cache</span>
          </div>
        </div>
        <div className="ios-list-item" onClick={handleLogout}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogOut size={20} strokeWidth={1.5} color="var(--accent-red)" />
            <span style={{ fontSize: 17, color: 'var(--accent-red)' }}>Leave Family Space</span>
          </div>
        </div>
      </div>
    </div>
  );
}
