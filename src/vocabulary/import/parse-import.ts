import Papa from 'papaparse';
import { Buffer } from 'buffer';

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export type ImportDelimiter = ';' | ',' | '\t';
export type ImportRow = { line: number; text: string; translation: string; reading: string; meaningNote: string };
export type ImportError = { line: number; message: string };
export type ImportPreview = { rows: ImportRow[]; errors: ImportError[]; duplicates: { line: number; text: string }[]; duplicateCount: number; totalRows: number };

export function importWordKey(text: string): string {
  return text.trim().normalize('NFKC').toLowerCase();
}

export function parseImport(text: string, delimiter: ImportDelimiter, existingWords: string[]): ImportPreview {
  if (![';', ',', '\t'].includes(delimiter)) throw new Error('Неподдерживаемый разделитель.');
  if (Buffer.byteLength(text, 'utf8') > MAX_IMPORT_BYTES) throw new Error('Текст больше 5 МиБ.');
  if (text.includes('\uFFFD') || text.includes('\0')) throw new Error('Не удалось прочитать текст в UTF-8.');
  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  const duplicates: { line: number; text: string }[] = [];
  const seen = new Set(existingWords.map(importWordKey));
  let duplicateCount = 0, totalRows = 0, currentLine = 1, previousCursor = 0;
  // UTF-8 BOM не является частью первого слова.
  const source = text.replace(/^\uFEFF/, '');
  Papa.parse<string[]>(source, {
    delimiter,
    skipEmptyLines: false,
    step(result, parser) {
      const line = currentLine;
      const consumed = source.slice(previousCursor, result.meta.cursor);
      currentLine += (consumed.match(/\r\n|\r|\n/g) ?? []).length;
      previousCursor = result.meta.cursor;
      const fields = result.data.map((field) => field.trim());
      if (fields.every((field) => !field) && fields.length === 1 && result.errors.length === 0) return;
      totalRows++;
      if (totalRows > MAX_IMPORT_ROWS) { parser.abort(); return; }
      if (result.errors.length) { errors.push({ line, message: 'Некорректные кавычки в CSV.' }); return; }
      if (fields.length < 2 || fields.length > 4) { errors.push({ line, message: 'Нужно от 2 до 4 полей: слово, перевод, чтение, комментарий.' }); return; }
      const [word, translation, reading = '', meaningNote = ''] = fields;
      if (!word || !translation) { errors.push({ line, message: 'Слово и перевод обязательны.' }); return; }
      const key = importWordKey(word);
      if (seen.has(key)) { duplicateCount++; duplicates.push({ line, text: word }); return; }
      seen.add(key);
      rows.push({ line, text: word, translation, reading, meaningNote });
    },
  });
  if (totalRows > MAX_IMPORT_ROWS) throw new Error('За один раз можно импортировать не более 5000 записей.');
  if (totalRows === 0) throw new Error('Нет данных для импорта.');
  return { rows, errors, duplicates, duplicateCount, totalRows };
}
