import { parse as parseCsv } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { HttpError } from '../services/access.js';

const MAX_ROWS = 5000;
const MAX_COLUMNS = 100;
const MAX_HEADER_CHARS = 64;
const MAX_CELL_CHARS = 4000;

function fail(message, code = 'IMPORT_PARSE_ERROR', details) {
  throw new HttpError(400, message, code, details);
}

function scalar(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('result' in value) return scalar(value.result);
    if ('text' in value) return String(value.text);
    if ('richText' in value) return value.richText.map(item => item.text || '').join('');
    if ('hyperlink' in value) return String(value.text || value.hyperlink || '');
  }
  return String(value);
}

function normalizedRows(headers, inputRows) {
  const cleanHeaders = headers.map(value => scalar(value).trim());
  if (!cleanHeaders.length || cleanHeaders.some(value => !value)) fail('Every import column must have a non-empty header', 'IMPORT_HEADER_INVALID');
  if (cleanHeaders.some(value => value.length > MAX_HEADER_CHARS)) fail(`Import headers may contain at most ${MAX_HEADER_CHARS} characters`, 'IMPORT_HEADER_LIMIT');
  if (cleanHeaders.length > MAX_COLUMNS) fail(`Import files may contain at most ${MAX_COLUMNS} columns`, 'IMPORT_COLUMN_LIMIT');
  const duplicates = cleanHeaders.filter((value, index) => cleanHeaders.indexOf(value) !== index);
  if (duplicates.length) fail('Import headers must be unique', 'IMPORT_HEADER_DUPLICATE', { headers: [...new Set(duplicates)] });
  if (inputRows.length > MAX_ROWS) fail(`Import files may contain at most ${MAX_ROWS} data rows`, 'IMPORT_ROW_LIMIT');
  return inputRows.map((values, rowIndex) => {
    const row = {};
    cleanHeaders.forEach((header, columnIndex) => {
      const value = scalar(values[columnIndex] ?? '').trim();
      if (value.length > MAX_CELL_CHARS) fail(`Cell text may contain at most ${MAX_CELL_CHARS} characters`, 'IMPORT_CELL_LIMIT', { row: rowIndex + 2, field: header });
      row[header] = value;
    });
    return row;
  }).filter(row => Object.values(row).some(value => value !== ''));
}

export async function parseStructuredInput({ channel, buffer }) {
  if (!buffer?.length) fail('Choose a non-empty import file', 'IMPORT_FILE_EMPTY');
  if (channel === 'csv') {
    let matrix;
    try { matrix = parseCsv(buffer, { bom: true, relax_quotes: false, skip_empty_lines: true }); }
    catch (error) { fail(`CSV could not be parsed: ${error.message}`); }
    const [headers = [], ...rows] = matrix;
    return normalizedRows(headers, rows);
  }
  if (channel === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(buffer); }
    catch (error) { fail(`XLSX could not be parsed: ${error.message}`); }
    const worksheet = workbook.worksheets.find(item => item.actualRowCount > 0);
    if (!worksheet) fail('The XLSX workbook does not contain a populated worksheet');
    const matrix = [];
    worksheet.eachRow({ includeEmpty: false }, row => matrix.push(row.values.slice(1)));
    const [headers = [], ...rows] = matrix;
    return normalizedRows(headers, rows);
  }
  if (channel === 'connector_json' || channel === 'json') {
    let body;
    try { body = JSON.parse(buffer.toString('utf8')); }
    catch { fail('Connector response is not valid JSON', 'IMPORT_JSON_INVALID'); }
    if (!body || !Array.isArray(body.records)) fail('Connector JSON must contain a records array', 'IMPORT_JSON_SHAPE_INVALID');
    if (body.records.length > MAX_ROWS) fail(`Connector responses may contain at most ${MAX_ROWS} records`, 'IMPORT_ROW_LIMIT');
    if (body.records.some(item => !item || Array.isArray(item) || typeof item !== 'object')) fail('Every connector record must be an object', 'IMPORT_JSON_SHAPE_INVALID');
    const headers = [...new Set(body.records.flatMap(item => Object.keys(item)))];
    return normalizedRows(headers, body.records.map(item => headers.map(header => item[header])));
  }
  fail('Unsupported import channel', 'IMPORT_CHANNEL_UNSUPPORTED');
}
