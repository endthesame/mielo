import { getDatabase } from '../database/database';

export async function getVoiceEnabled(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'voice_enabled');
  return row?.value !== 'false';
}

export async function setVoiceEnabled(enabled: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', 'voice_enabled', String(enabled));
}
