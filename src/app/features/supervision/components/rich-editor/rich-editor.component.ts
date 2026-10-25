import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import { CharacterCount } from '@tiptap/extensions';
import { ButtonModule } from 'primeng/button';

import { anchorFromSelection, resolveAnchor, TextAnchor } from '../../editor/anchor.util';
import { Alignment, DEFAULT_FONT, DEFAULT_SIZE, FONT_FAMILIES, FONT_SIZES } from '../../editor/editor-options';
import {
  CommentHighlights,
  CommentHighlightsStorage,
  HighlightItem,
  refreshHighlights,
} from '../../editor/comment-highlights.extension';

/**
 * Tiptap wrapped for Angular (ngx-tiptap needs Angular 22+, this app is on 19, and the wrapper is
 * thin). The formatting available here must stay in step with the server whitelist in
 * api/src/features/supervisions/editor-content.util.ts.
 */
@Component({
  selector: 'app-rich-editor',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './rich-editor.component.html',
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      app-rich-editor { display: block; height: 100%; }
      .rich-editor__canvas { flex: 1 1 auto; min-height: 0; overflow: auto; background: #e2e8f0; padding: 1rem 1rem 1.5rem; display: flex; justify-content: center; align-items: flex-start; gap: 1.25rem; }
      .rich-editor__page { flex: 1 1 auto; max-width: 1100px; min-width: 0; background: #fff; box-shadow: 0 1px 4px rgb(15 23 42 / 0.25); }
      .rich-editor__margin { flex: 0 0 340px; min-width: 0; }
      .rich-editor .ProseMirror { min-height: 1056px; padding: 3rem 3.5rem; outline: none; line-height: 1.5; font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
      @media (max-width: 640px) { .rich-editor .ProseMirror { padding: 1.25rem 1rem; min-height: 24rem; } }
      .rich-editor .ProseMirror > * + * { margin-top: 0.75em; }
      .rich-editor .ProseMirror h1 { font-size: 1.75rem; font-weight: 700; line-height: 1.25; }
      .rich-editor .ProseMirror h2 { font-size: 1.4rem; font-weight: 700; line-height: 1.3; }
      .rich-editor .ProseMirror h3 { font-size: 1.15rem; font-weight: 600; }
      .rich-editor .ProseMirror ul { list-style: disc; padding-left: 1.5rem; }
      .rich-editor .ProseMirror ol { list-style: decimal; padding-left: 1.5rem; }
      .rich-editor .ProseMirror blockquote { border-left: 3px solid #cbd5e1; padding-left: 1rem; color: #475569; }
      .rich-editor .ProseMirror pre { background: #0f172a; color: #e2e8f0; padding: 0.75rem 1rem; border-radius: 0.5rem; overflow-x: auto; }
      .rich-editor .ProseMirror code { background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
      .rich-editor .ProseMirror pre code { background: none; padding: 0; }
      .rich-editor .ProseMirror a { color: #2563eb; text-decoration: underline; }
      .rich-editor .ProseMirror hr { border: 0; border-top: 1px solid #cbd5e1; }
      .rich-editor .ProseMirror table { border-collapse: collapse; width: 100%; table-layout: fixed; }
      .rich-editor .ProseMirror th, .rich-editor .ProseMirror td { border: 1px solid #cbd5e1; padding: 0.4rem 0.6rem; vertical-align: top; }
      .rich-editor .ProseMirror th { background: #f1f5f9; font-weight: 600; text-align: left; }
      .rich-editor .ProseMirror .selectedCell { background: #dbeafe; }
      .rich-editor .comment-hl { background: #fef08a; border-bottom: 2px solid #eab308; cursor: pointer; }
      .rich-editor .comment-hl--c0 { background: #bfdbfe; border-bottom-color: #3b82f6; }
      .rich-editor .comment-hl--c1 { background: #a7f3d0; border-bottom-color: #10b981; }
      .rich-editor .comment-hl--c2 { background: #e9d5ff; border-bottom-color: #a855f7; }
      .rich-editor .comment-hl--c3 { background: #fed7aa; border-bottom-color: #f97316; }
      .rich-editor .comment-hl--c4 { background: #fbcfe8; border-bottom-color: #ec4899; }
      .rich-editor .comment-hl--c5 { background: #99f6e4; border-bottom-color: #14b8a6; }
      .rich-editor .comment-hl--resolved { background: #f1f5f9; border-bottom-color: #cbd5e1; }
      .rich-editor .comment-hl--pending { background: #e2e8f0; border-bottom: 2px dashed #64748b; }
      .rich-editor .comment-hl--active { outline: 2px solid #334155; }
    `,
  ],
})
export class RichEditorComponent implements AfterViewInit, OnDestroy {
  /** Only the student edits; everyone else reads and comments. */
  readonly editable = input(false);
  /** Shows the "Comment on selection" button. */
  readonly commentable = input(false);
  readonly highlights = input<HighlightItem[]>([]);
  readonly activeId = input<string | null>(null);

  /** The whole document as ProseMirror JSON, on every edit (the parent debounces the save). */
  readonly contentChange = output<Record<string, unknown>>();
  readonly commentRequested = output<TextAnchor>();
  readonly highlightClicked = output<string>();
  /** Ids of comments whose quoted text no longer exists. */
  readonly outdatedChange = output<string[]>();
  /** Vertical position (px from the top of the page) of each comment's text; null = text gone. */
  readonly positionsChange = output<Record<string, number | null>>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private editor: Editor | null = null;
  private pending: Record<string, unknown> | null = null;
  private recomputeTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastOutdated = '';
  private lastPositions = '';

  /** bumped on every transaction so the toolbar re-reads which buttons are active */
  readonly tick = signal(0);
  readonly hasSelection = signal(false);

  constructor() {
    effect(() => {
      const items = this.highlights();
      const active = this.activeId();
      const ed = this.editor;
      if (!ed) return;
      const storage = this.storageOf(ed);
      storage.items = items;
      storage.activeId = active;
      refreshHighlights(ed);
      this.recompute();
    });
    effect(() => {
      this.editor?.setEditable(this.editable(), false);
    });
  }

  ngAfterViewInit(): void {
    this.editor = new Editor({
      element: this.host().nativeElement,
      editable: this.editable(),
      content: this.pending ?? undefined,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: {
            openOnClick: false,
            autolink: true,
            defaultProtocol: 'https',
            protocols: ['http', 'https', 'mailto'],
            HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
          },
        }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        TextStyle,
        FontFamily,
        FontSize,
        Color,
        Highlight.configure({ multicolor: true }),
        Subscript,
        Superscript,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        CharacterCount,
        CommentHighlights,
      ],
      editorProps: {
        attributes: { class: 'prose-editor', 'aria-label': 'Document editor', role: 'textbox' },
      },
      onUpdate: ({ editor }) => {
        this.contentChange.emit(editor.getJSON() as Record<string, unknown>);
        this.scheduleRecompute();
      },
      onTransaction: () => this.tick.update((n) => n + 1),
      onSelectionUpdate: ({ editor }) => this.hasSelection.set(!editor.state.selection.empty),
    });

    // wrapping changes when the window (or the margin column) resizes: positions must follow
    this.resizeObserver = new ResizeObserver(() => this.scheduleRecompute());
    this.resizeObserver.observe(this.host().nativeElement);

    const storage = this.storageOf(this.editor);
    storage.onClick = (id) => this.highlightClicked.emit(id);
    storage.items = this.highlights();
    refreshHighlights(this.editor);
    this.recompute();
  }

  ngOnDestroy(): void {
    if (this.recomputeTimer) clearTimeout(this.recomputeTimer);
    this.resizeObserver?.disconnect();
    this.editor?.destroy();
  }

  private storageOf(ed: Editor): CommentHighlightsStorage {
    return (ed.storage as unknown as Record<string, CommentHighlightsStorage>)['commentHighlights'];
  }

  /** Replaces the content without counting it as an edit (initial load, version switch, polling). */
  load(content: Record<string, unknown>): void {
    if (!this.editor) {
      this.pending = content;
      return;
    }
    this.editor.commands.setContent(content, { emitUpdate: false });
    this.recompute();
  }

  json(): Record<string, unknown> | null {
    return (this.editor?.getJSON() as Record<string, unknown>) ?? null;
  }

  // ---------------- comments ----------------

  requestComment(): void {
    const ed = this.editor;
    if (!ed) return;
    const { from, to } = ed.state.selection;
    const anchor = anchorFromSelection(ed.state.doc, from, to);
    if (anchor) this.commentRequested.emit(anchor);
  }

  private scheduleRecompute(): void {
    if (this.recomputeTimer) clearTimeout(this.recomputeTimer);
    this.recomputeTimer = setTimeout(() => this.recompute(), 400);
  }

  private recompute(): void {
    const ed = this.editor;
    if (!ed) return;
    const pageTop = this.host().nativeElement.getBoundingClientRect().top;
    const outdated: string[] = [];
    const positions: Record<string, number | null> = {};

    for (const h of this.highlights()) {
      const at = resolveAnchor(ed.state.doc, h.anchor);
      if (!at) {
        outdated.push(h.id);
        positions[h.id] = null;
        continue;
      }
      try {
        positions[h.id] = Math.round(ed.view.coordsAtPos(at.from).top - pageTop);
      } catch {
        positions[h.id] = null; // the editor is not laid out yet; the next pass fixes it
      }
    }

    // only tell the page when something changed, so it does not re-render for nothing
    const o = JSON.stringify(outdated);
    if (o !== this.lastOutdated) {
      this.lastOutdated = o;
      this.outdatedChange.emit(outdated);
    }
    const p = JSON.stringify(positions);
    if (p !== this.lastPositions) {
      this.lastPositions = p;
      this.positionsChange.emit(positions);
    }
  }

  // ---------------- Word-style formatting ----------------

  readonly fonts = FONT_FAMILIES;
  readonly sizes = FONT_SIZES;
  readonly defaultFont = DEFAULT_FONT;
  readonly defaultSize = DEFAULT_SIZE;

  currentFont(): string {
    this.tick();
    return (this.editor?.getAttributes('textStyle')['fontFamily'] as string) ?? '';
  }

  currentSize(): string {
    this.tick();
    return (this.editor?.getAttributes('textStyle')['fontSize'] as string) ?? '';
  }

  setFont(value: string): void {
    const chain = this.editor?.chain().focus();
    if (!chain) return;
    (value ? chain.setFontFamily(value) : chain.unsetFontFamily()).run();
  }

  setSize(value: string): void {
    const chain = this.editor?.chain().focus();
    if (!chain) return;
    (value ? chain.setFontSize(value) : chain.unsetFontSize()).run();
  }

  setColor(event: Event): void {
    this.editor?.chain().focus().setColor((event.target as HTMLInputElement).value).run();
  }

  setHighlight(event: Event): void {
    this.editor?.chain().focus().setHighlight({ color: (event.target as HTMLInputElement).value }).run();
  }

  clearHighlight(): void {
    this.editor?.chain().focus().unsetHighlight().run();
  }

  align(a: Alignment): void {
    this.editor?.chain().focus().setTextAlign(a).run();
  }

  isAligned(a: Alignment): boolean {
    this.tick();
    return !!this.editor?.isActive({ textAlign: a });
  }

  clearFormatting(): void {
    this.editor?.chain().focus().unsetAllMarks().clearNodes().run();
  }

  words(): number {
    this.tick();
    return this.editor?.storage['characterCount']?.words() ?? 0;
  }

  characters(): number {
    this.tick();
    return this.editor?.storage['characterCount']?.characters() ?? 0;
  }

  // ---------------- toolbar ----------------

  is(name: string, attrs?: Record<string, unknown>): boolean {
    this.tick(); // re-evaluate after every transaction
    return !!this.editor?.isActive(name, attrs);
  }

  /** Runs one editor command by name; templates cannot hold arrow functions. */
  cmd(name: string, args?: Record<string, unknown>): void {
    if (!this.editor) return;
    const chain = this.editor.chain().focus() as unknown as Record<string, (a?: unknown) => { run(): boolean }>;
    chain[name](args).run();
  }

  setLink(): void {
    const ed = this.editor;
    if (!ed) return;
    const previous = ed.getAttributes('link')['href'] as string | undefined;
    const url = window.prompt('Link address (http, https or mailto)', previous ?? 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      ed.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (!/^(https?:|mailto:)/i.test(url.trim())) {
      window.alert('Only http, https and mailto links are allowed.');
      return;
    }
    ed.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }
}
