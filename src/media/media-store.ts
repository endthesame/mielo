import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { getDatabase } from '../database/database';

const images = new Directory(Paths.document, 'media', 'images');

export function imageUri(fileName: string): string {
  // Идентификатор берётся только из нашей базы, не из абсолютного пути устройства.
  if (!/^[a-f0-9-]+\.(jpg|png|webp|heic)$/i.test(fileName)) throw new Error('Некорректное имя изображения.');
  return new File(images, fileName).uri;
}

export function deleteImageFiles(fileNames: string[]): void {
  for (const fileName of fileNames) {
    try { const file = new File(imageUri(fileName)); if (file.exists) file.delete(); }
    catch (error) { console.warn('Не удалось удалить изображение:', error); }
  }
}

export async function getImage(wordId: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ local_uri: string }>(`SELECT m.local_uri FROM media_assets m
    JOIN vocabulary_media vm ON vm.media_id = m.id WHERE vm.vocabulary_id = ?`, wordId);
  return row ? imageUri(row.local_uri) : null;
}

export async function replaceImage(wordId: string, sourceUri: string, mimeType: string | undefined): Promise<string> {
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
  const extension = extensions[mimeType ?? ''] ?? 'jpg';
  const id = randomUUID();
  const fileName = `${id}.${extension}`;
  images.create({ intermediates: true, idempotent: true });
  const newFile = new File(imageUri(fileName));
  new File(sourceUri).copy(newFile);
  let previous: string | null = null;
  let committed = false;
  try {
    const db = await getDatabase();
    await db.withExclusiveTransactionAsync(async (tx) => {
      const word = await tx.getFirstAsync('SELECT id FROM vocabulary_items WHERE id = ? AND deleted_at IS NULL', wordId);
      if (!word) throw new Error('Слово не найдено.');
      const old = await tx.getFirstAsync<{ id: string; local_uri: string }>(`SELECT m.id, m.local_uri FROM media_assets m
        JOIN vocabulary_media vm ON vm.media_id = m.id WHERE vm.vocabulary_id = ?`, wordId);
      if (old) {
        previous = old.local_uri;
        await tx.runAsync('DELETE FROM vocabulary_media WHERE vocabulary_id = ?', wordId);
        await tx.runAsync('DELETE FROM media_assets WHERE id = ?', old.id);
      }
      await tx.runAsync('INSERT INTO media_assets (id, kind, local_uri, mime_type, created_at) VALUES (?, ?, ?, ?, ?)', id, 'image', fileName, mimeType ?? null, new Date().toISOString());
      await tx.runAsync('INSERT INTO vocabulary_media (vocabulary_id, media_id) VALUES (?, ?)', wordId, id);
    });
    committed = true;
  } finally {
    if (!committed && newFile.exists) newFile.delete();
  }
  if (previous) {
    try { const old = new File(imageUri(previous)); if (old.exists) old.delete(); }
    catch (error) { console.warn('Не удалось удалить старое изображение:', error); }
  }
  return newFile.uri;
}

export async function removeImage(wordId: string): Promise<void> {
  const db = await getDatabase();
  let previous: string | null = null;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<{ id: string; local_uri: string }>(`SELECT m.id, m.local_uri FROM media_assets m
      JOIN vocabulary_media vm ON vm.media_id = m.id WHERE vm.vocabulary_id = ?`, wordId);
    if (!row) return;
    previous = row.local_uri;
    await tx.runAsync('DELETE FROM vocabulary_media WHERE vocabulary_id = ?', wordId);
    await tx.runAsync('DELETE FROM media_assets WHERE id = ?', row.id);
  });
  if (previous) {
    try { const file = new File(imageUri(previous)); if (file.exists) file.delete(); }
    catch (error) { console.warn('Не удалось удалить изображение:', error); }
  }
}
