/** ProseMirror JSON as the editor and the API exchange it. */
export interface EditorNodeJson {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorNodeJson[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}
