type ModelFile = {
  readonly uri: string;
  readonly exists: boolean;
  readonly size: number;
  readonly modificationTime: number | null;
  digest(algorithm: 'SHA-256'): Promise<string>;
};

type Fingerprint = { uri: string; size: number; modified: number };

// Кэш живёт только до завершения процесса и не заменяет проверку при изменении файла.
export function createModelIntegrity(expectedSize: number, expectedHash: string) {
  let verified: Fingerprint | null = null;
  let generation = 0;

  function fingerprint(file: ModelFile): Fingerprint | null {
    if (!file.exists || file.size !== expectedSize || file.modificationTime == null) return null;
    return { uri: file.uri, size: file.size, modified: file.modificationTime };
  }
  function equal(a: Fingerprint | null, b: Fingerprint | null): boolean {
    return a !== null && b !== null && a.uri === b.uri && a.size === b.size && a.modified === b.modified;
  }
  function clear() { generation++; verified = null; }

  async function verify(file: ModelFile): Promise<boolean> {
    if (!file.exists || file.size !== expectedSize) { clear(); return false; }
    const before = fingerprint(file);
    if (equal(before, verified)) return true;
    const started = generation;
    const hash = await file.digest('SHA-256');
    const after = fingerprint(file);
    if (started !== generation || !file.exists || file.size !== expectedSize ||
      (before !== null && !equal(before, after)) || hash !== expectedHash) {
      clear();
      return false;
    }
    verified = before && after ? after : null;
    return true;
  }

  // Перенос не меняет содержимое, но отметку доверия сохраняем только при совпадении метаданных.
  function moved(from: Fingerprint | null, to: ModelFile) {
    const target = fingerprint(to);
    verified = from && target && from.size === target.size && from.modified === target.modified ? target : null;
  }

  return { verify, clear, fingerprint, moved };
}
