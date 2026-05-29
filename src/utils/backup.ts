import { Session } from '../types';
import { sessionsService } from '../services/sessionsService';

export function exportToCSV(sessions: Session[], familyCode: string): void {
  if (sessions.length === 0) return;

  const headers = [
    'ID',
    'Type',
    'Side',
    'Started At',
    'Ended At',
    'Duration (s)',
    'Volume (ml)',
    'Notes',
    'Recorded By',
  ];

  const rows = sessions.map(s => [
    s.id,
    s.type,
    s.side || '',
    s.started_at,
    s.ended_at || '',
    s.duration_s !== null ? s.duration_s.toString() : '',
    s.volume_ml !== null ? s.volume_ml.toString() : '',
    (s.notes || '').replace(/"/g, '""'),
    s.recorded_by,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `milk_tracker_${familyCode.toLowerCase()}_export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(sessions: Session[], familyIdHash: string, familyCode: string): void {
  const data = {
    version: 1,
    exported_at: new Date().toISOString(),
    family_id_hash: familyIdHash,
    sessions,
  };

  const jsonContent = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', jsonContent);
  link.setAttribute('download', `milk_tracker_${familyCode.toLowerCase()}_backup.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function importFromJSON(
  fileContent: string,
  familyId: string,
  onProgress?: (index: number, total: number) => void
): Promise<{ success: boolean; importedCount: number; error?: string }> {
  try {
    const data = JSON.parse(fileContent);

    // Validate Schema structure
    if (data.version !== 1) {
      return { success: false, importedCount: 0, error: 'Unsupported file version schema' };
    }

    if (!Array.isArray(data.sessions)) {
      return { success: false, importedCount: 0, error: 'Sessions structure not found in backup file' };
    }

    const sessions: Session[] = data.sessions;
    let importedCount = 0;

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];

      // Re-map family ID to avoid writing foreign sync entries to user session space
      const safeSession: Session = {
        ...session,
        family_id: familyId,
        updated_at: new Date().toISOString(),
      };

      await sessionsService.updateSession(safeSession);
      importedCount++;

      if (onProgress) {
        onProgress(i + 1, sessions.length);
      }
    }

    return { success: true, importedCount };
  } catch (e: any) {
    return { success: false, importedCount: 0, error: e.message || 'Malformed backup file format' };
  }
}
