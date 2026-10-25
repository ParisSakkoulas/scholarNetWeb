import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { resolveAnchor, TextAnchor } from './anchor.util';

export interface HighlightItem {
  id: string;
  anchor: TextAnchor;
  resolved: boolean;
  /** which author colour to paint with (see author-color.util) */
  colorIndex?: number;
}

export interface CommentHighlightsStorage {
  items: HighlightItem[];
  activeId: string | null;
  onClick: ((id: string) => void) | null;
}

/** Highlight id of the text currently selected for a new comment. */
export const PENDING_ID = '__pending__';

const key = new PluginKey<DecorationSet>('commentHighlights');

/**
 * Paints comment anchors over the text. These are decorations, not marks: they are never part of
 * the document content, so a supervisor's comment can never write to (or conflict with) the
 * student's document. Call `refresh()` after changing `storage.items` or `storage.activeId`.
 */
export const CommentHighlights = Extension.create<unknown, CommentHighlightsStorage>({
  name: 'commentHighlights',

  addStorage() {
    return { items: [], activeId: null, onClick: null };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;

    const build = (doc: Parameters<typeof resolveAnchor>[0]) => {
      const decorations: Decoration[] = [];
      for (const item of storage.items) {
        const at = resolveAnchor(doc, item.anchor);
        if (!at) continue;
        const classes = [
          'comment-hl',
          item.colorIndex !== undefined ? `comment-hl--c${item.colorIndex}` : '',
          item.resolved ? 'comment-hl--resolved' : '',
          item.id === storage.activeId ? 'comment-hl--active' : '',
          item.id === PENDING_ID ? 'comment-hl--pending' : '',
        ];
        decorations.push(
          Decoration.inline(at.from, at.to, {
            class: classes.filter(Boolean).join(' '),
            'data-comment-id': item.id,
          }),
        );
      }
      return DecorationSet.create(doc, decorations);
    };

    return [
      new Plugin({
        key,
        state: {
          init: (_, state) => build(state.doc),
          apply: (tr, old, _prev, next) =>
            tr.docChanged || tr.getMeta(key) ? build(next.doc) : old,
        },
        props: {
          decorations: (state) => key.getState(state),
          handleClick: (_view, _pos, event) => {
            const el = (event.target as HTMLElement | null)?.closest?.('[data-comment-id]');
            const id = el?.getAttribute('data-comment-id');
            if (id) storage.onClick?.(id);
            return false;
          },
        },
      }),
    ];
  },
});

/** Forces the decorations to be rebuilt from the current storage. */
export function refreshHighlights(editor: { view: { state: { tr: any }; dispatch: (tr: any) => void } }) {
  editor.view.dispatch(editor.view.state.tr.setMeta(key, true));
}
