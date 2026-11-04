// Сравниваем только явно заданные формы; чтение не преобразуется в кандзи автоматически.
export function normalizeAnswer(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase().replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '').replace(/\s+/gu, ' ');
}

export function matchesAnswer(answer: string, written: string, reading: string | null, alternatives: string[] = []): boolean {
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && [written, reading, ...alternatives].some((value) => value != null && normalizeAnswer(value) === normalized);
}
