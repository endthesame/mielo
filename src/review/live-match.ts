import { normalizeAnswer } from './evaluate-answer';

// Fuzzy matching allows one substitution, insertion, or deletion for words of at least five characters.
function oneEditApart(left: string, right: string): boolean {
  const a = Array.from(left), b = Array.from(right);
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
}

export function matchLiveAnswer(answer: string, variants: (string | null)[]): 'exact' | 'fuzzy' | null {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return null;
  for (const variant of variants) {
    if (!variant) continue;
    const expected = normalizeAnswer(variant);
    if (!expected) continue;
    if (normalized === expected) return 'exact';
    if (Array.from(expected).length >= 5 && Array.from(normalized).length >= 5 &&
        !expected.startsWith(normalized) && !normalized.startsWith(expected) && oneEditApart(normalized, expected)) return 'fuzzy';
  }
  return null;
}
