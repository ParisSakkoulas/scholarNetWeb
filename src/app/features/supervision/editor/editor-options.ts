/**
 * Formatting choices of the editor. The server accepts exactly these fonts and sizes (and any
 * #rrggbb colour), see api/src/features/supervisions/editor-content.util.ts: keep both in step.
 */
export const FONT_FAMILIES = [
  'Arial',
  'Calibri',
  'Cambria',
  'Courier New',
  'Georgia',
  'Times New Roman',
  'Verdana',
];

export const FONT_SIZES = ['10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '24pt', '36pt'];

export const DEFAULT_FONT = 'Calibri';
export const DEFAULT_SIZE = '11pt';

export type Alignment = 'left' | 'center' | 'right' | 'justify';
