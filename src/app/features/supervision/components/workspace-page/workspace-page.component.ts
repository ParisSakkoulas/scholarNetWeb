import { DatePipe } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { EMPTY, Observable, Subject, catchError, concatMap, debounceTime, tap } from 'rxjs';

import { TextAnchor } from '../../editor/anchor.util';
import type { EditorNodeJson } from '../../editor/editor-json';
import { authorColorIndex } from '../../editor/author-color.util';
import { HighlightItem, PENDING_ID } from '../../editor/comment-highlights.extension';
import {
  DOCUMENT_STATUS_META,
  DocumentComment,
  DocumentStatus,
  SupervisionRole,
  ThesisDocumentDetail,
} from '../../models/supervision.model';
import { SupervisionService } from '../../services/supervision.service';
import { CommentFilter, DocumentCommentsComponent } from '../document-comments/document-comments.component';
import { RichEditorComponent } from '../rich-editor/rich-editor.component';

type SaveState = 'saved' | 'unsaved' | 'saving' | 'conflict' | 'error';

const AUTOSAVE_MS = 1500;
/** how often a supervisor's view checks for the student's latest text */
const FOLLOW_MS = 10000;

/**
 * The supervision's co-working document. The student writes (autosaved); supervisors read what is
 * written and comment on selected text. Nothing a commenter does touches the document itself.
 */
@Component({
  selector: 'app-workspace-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    SelectButtonModule,
    SkeletonModule,
    TagModule,
    RichEditorComponent,
    DocumentCommentsComponent,
  ],
  templateUrl: './workspace-page.component.html',
})
export class WorkspacePageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(SupervisionService);
  private readonly messages = inject(MessageService);

  readonly supervisionId = this.route.snapshot.paramMap.get('id')!;

  readonly editorCmp = viewChild<RichEditorComponent>('editor');

  readonly loading = signal(true);
  readonly role = signal<SupervisionRole | null>(null);
  readonly readOnly = signal(false);
  readonly doc = signal<ThesisDocumentDetail | null>(null);
  readonly missing = signal(false);
  readonly starting = signal(false);

  readonly saveState = signal<SaveState>('saved');
  readonly savedAt = signal<Date | null>(null);
  /** null = the live draft; a number = a saved version shown read-only */
  readonly viewing = signal<number | null>(null);

  readonly threads = signal<DocumentComment[]>([]);
  readonly outdated = signal<string[]>([]);
  readonly pendingAnchor = signal<TextAnchor | null>(null);
  readonly activeId = signal<string | null>(null);

  readonly versionDialog = signal(false);
  readonly savingVersion = signal(false);
  versionNote = '';

  readonly statusMeta = DOCUMENT_STATUS_META;

  readonly isStudent = computed(() => this.role() === 'student');
  readonly isSupervisor = computed(() => this.role() === 'supervisor');
  readonly isLive = computed(() => this.viewing() === null);
  readonly editable = computed(() => this.isStudent() && !this.readOnly() && this.isLive());
  readonly canCommentNow = computed(() => !this.readOnly() && this.isLive());

  readonly versionOptions = computed(() => [
    { value: null as number | null, label: 'Live draft' },
    ...(this.doc()?.versions ?? []).map((v) => ({
      value: v.number as number | null,
      label: `v${v.number} · ${new Date(v.createdAt).toLocaleDateString()}${v.note ? ' · ' + v.note : ''}`,
    })),
  ]);

  readonly highlights = computed<HighlightItem[]>(() => {
    const items: HighlightItem[] = this.threads()
      .filter((t) => t.anchor?.quote && t.anchor.from !== undefined && t.anchor.to !== undefined)
      .map((t) => ({
        id: t._id,
        resolved: t.status === 'resolved',
        colorIndex: authorColorIndex(t.authorId?._id),
        anchor: {
          from: t.anchor!.from!,
          to: t.anchor!.to!,
          quote: t.anchor!.quote!,
          before: t.anchor!.before,
          after: t.anchor!.after,
        },
      }));
    // the text selected for a comment that is being written is highlighted too
    const pending = this.pendingAnchor();
    if (pending) items.push({ id: PENDING_ID, resolved: false, anchor: pending });
    return items;
  });

  // ---- layout: full width, optional full screen, comments in the margin on wide screens ----
  readonly focusMode = signal(false);
  private readonly wideQuery = window.matchMedia('(min-width: 1100px)');
  readonly wide = signal(this.wideQuery.matches);
  /** comments sit beside their text when there is room, otherwise below the editor */
  readonly marginComments = computed(() => this.wide() && this.isLive() && !!this.role());
  readonly anchorTops = signal<Record<string, number | null>>({});
  readonly commentFilter = signal<CommentFilter>('all');
  readonly filterOptions: { label: string; value: CommentFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'Resolved', value: 'resolved' },
  ];
  private readonly onWide = (e: MediaQueryListEvent) => this.wide.set(e.matches);

  readonly canMarkReady = computed(
    () => this.isStudent() && !this.readOnly() && ['draft', 'changes_requested'].includes(this.doc()?.status ?? ''),
  );
  readonly canReview = computed(
    () => this.isSupervisor() && !this.readOnly() && this.doc()?.status === 'ready_for_review',
  );

  // ---- autosave state (plain fields: they are never read by the template) ----
  private revision = 0;
  private latest: Record<string, unknown> | null = null;
  private dirty = false;
  private pendingContent: Record<string, unknown> | null = null;
  private readonly changes$ = new Subject<void>();
  private followTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.wideQuery.addEventListener('change', this.onWide);
    // sequential saves, each using the newest revision
    this.changes$
      .pipe(
        debounceTime(AUTOSAVE_MS),
        concatMap(() => this.persist()),
        takeUntilDestroyed(),
      )
      .subscribe();

    // the editor only exists after the document is known; hand it the content when it appears
    effect(() => {
      const ed = this.editorCmp();
      if (ed && this.pendingContent) {
        ed.load(this.pendingContent);
        this.pendingContent = null;
      }
    });
  }

  ngOnInit(): void {
    this.service.overview(this.supervisionId).subscribe({
      next: (o) => {
        this.role.set(o.role);
        this.readOnly.set(['ended', 'declined'].includes(o.supervision.status));
      },
      error: () => this.router.navigate(['/main/supervision']),
    });

    this.service.workspace(this.supervisionId).subscribe({
      next: (doc) => {
        if (!doc) {
          this.missing.set(true);
          this.loading.set(false);
          return;
        }
        this.openDoc(doc._id);
      },
      error: (err) => {
        this.loading.set(false);
        this.fail('Could not open the co-working document')(err);
      },
    });
  }

  ngOnDestroy(): void {
    this.wideQuery.removeEventListener('change', this.onWide);
    if (this.followTimer) clearInterval(this.followTimer);
    // leaving with unsaved text: best-effort save, the page is going away
    const doc = this.doc();
    if (this.dirty && this.latest && doc) {
      this.service.saveDraft(doc._id, this.latest, this.revision).subscribe({ error: () => undefined });
    }
  }

  @HostListener('window:keydown.escape')
  leaveFocusMode(): void {
    this.focusMode.set(false);
  }

  toggleFocus(): void {
    this.focusMode.update((v) => !v);
  }

  @HostListener('window:beforeunload', ['$event'])
  warnUnsaved(event: BeforeUnloadEvent): void {
    if (this.dirty || this.saveState() === 'saving') event.preventDefault();
  }

  private fail(summary: string) {
    return (err: { error?: { message?: string } }) =>
      this.messages.add({ severity: 'error', summary, detail: err?.error?.message });
  }

  // ---------------- loading ----------------

  private openDoc(docId: string): void {
    this.service.document(docId).subscribe({
      next: (d) => {
        this.doc.set(d);
        this.loadDraft(docId, () => {
          this.loading.set(false);
          this.startFollowing();
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.fail('Could not open the co-working document')(err);
      },
    });
  }

  reloadDoc(): void {
    const d = this.doc();
    if (d) this.service.document(d._id).subscribe({ next: (fresh) => this.doc.set(fresh) });
  }

  private loadDraft(docId: string, done?: () => void): void {
    this.service.draft(docId).subscribe({
      next: (draft) => {
        this.revision = draft.revision;
        this.show(draft.content);
        done?.();
      },
      error: (err) => {
        this.loading.set(false);
        this.fail('Could not load the document')(err);
      },
    });
  }

  private show(content: Record<string, unknown>): void {
    const ed = this.editorCmp();
    if (ed) ed.load(content);
    else this.pendingContent = content;
  }

  /** Supervisors see the student's progress without reloading. */
  private startFollowing(): void {
    if (this.followTimer || this.isStudent()) return;
    this.followTimer = setInterval(() => {
      const doc = this.doc();
      if (!doc || !this.isLive() || document.visibilityState !== 'visible') return;
      this.service.draft(doc._id).subscribe({
        next: (draft) => {
          if (draft.revision === this.revision) return;
          this.revision = draft.revision;
          this.show(draft.content);
        },
        error: () => undefined, // try again at the next tick
      });
    }, FOLLOW_MS);
  }

  start(): void {
    this.starting.set(true);
    this.service.createWorkspace(this.supervisionId).subscribe({
      next: (doc) => {
        this.starting.set(false);
        this.missing.set(false);
        this.loading.set(true);
        this.openDoc(doc._id);
      },
      error: (err) => {
        this.starting.set(false);
        this.fail('Could not start the document')(err);
      },
    });
  }

  // ---------------- autosave ----------------

  onContent(json: Record<string, unknown>): void {
    if (!this.editable()) return;
    this.latest = json;
    this.dirty = true;
    this.saveState.set('unsaved');
    this.changes$.next();
  }

  private persist(): Observable<unknown> {
    const doc = this.doc();
    if (!doc || !this.dirty || !this.latest) return EMPTY;
    const content = this.latest;
    this.dirty = false;
    this.saveState.set('saving');
    return this.service.saveDraft(doc._id, content, this.revision).pipe(
      tap((res) => {
        this.revision = res.revision;
        this.savedAt.set(new Date());
        // more typing happened while this request was in flight
        this.saveState.set(this.dirty ? 'unsaved' : 'saved');
      }),
      catchError((err) => {
        this.dirty = true;
        const conflict = err?.status === 409;
        this.saveState.set(conflict ? 'conflict' : 'error');
        if (!conflict) this.fail('Could not save, will retry')(err);
        return EMPTY;
      }),
    );
  }

  /** After a conflict: take the server copy (another tab saved first). */
  reloadFromServer(): void {
    const doc = this.doc();
    if (!doc) return;
    this.dirty = false;
    this.latest = null;
    this.loadDraft(doc._id, () => this.saveState.set('saved'));
  }

  retrySave(): void {
    this.changes$.next();
  }

  // ---------------- versions ----------------

  selectVersion(n: number | null): void {
    const doc = this.doc();
    if (!doc) return;
    this.viewing.set(n);
    this.pendingAnchor.set(null);
    if (n === null) {
      // back to live: unsaved typing has not reached the server yet, so show that
      if (this.dirty && this.latest) this.show(this.latest);
      else this.loadDraft(doc._id);
      return;
    }
    this.service.versionContent(doc._id, n).subscribe({
      next: (v) => this.show(v.content),
      error: this.fail('Could not open that version'),
    });
  }

  openVersionDialog(): void {
    this.versionNote = '';
    this.versionDialog.set(true);
  }

  saveVersion(): void {
    const doc = this.doc();
    if (!doc) return;
    this.savingVersion.set(true);
    this.service.saveEditorVersion(doc._id, this.versionNote).subscribe({
      next: (v) => {
        this.savingVersion.set(false);
        this.versionDialog.set(false);
        this.messages.add({ severity: 'success', summary: `Version ${v.number} saved` });
        this.reloadDoc();
      },
      error: (err) => {
        this.savingVersion.set(false);
        this.fail('Could not save the version')(err);
      },
    });
  }

  // ---------------- status ----------------

  setStatus(status: DocumentStatus): void {
    const doc = this.doc();
    if (!doc) return;
    this.service.setDocumentStatus(doc._id, status).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary:
            status === 'ready_for_review'
              ? 'Sent for review'
              : status === 'reviewed'
                ? 'Marked as reviewed'
                : 'Changes requested',
        });
        this.reloadDoc();
      },
      error: this.fail('Could not change the status'),
    });
  }

  // ---------------- export ----------------

  readonly exporting = signal(false);

  /** Downloads what is on screen (the live draft or the version being viewed) as a .docx. */
  async exportWord(): Promise<void> {
    const json = this.editorCmp()?.json();
    const doc = this.doc();
    if (!json || !doc) return;
    this.exporting.set(true);
    try {
      const { exportToDocx } = await import('../../editor/docx-export.util');
      await exportToDocx(json as unknown as EditorNodeJson, doc.title);
    } catch (err) {
      console.error('Word export failed', err);
      this.messages.add({ severity: 'error', summary: 'Could not create the Word file' });
    } finally {
      this.exporting.set(false);
    }
  }

  // ---------------- comments ----------------

  onThreads(list: DocumentComment[]): void {
    this.threads.set(list);
  }

  focusThread(id: string): void {
    if (id === PENDING_ID) return;
    this.activeId.set(id);
  }
}
