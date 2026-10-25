import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';

import { AuthService } from '../../../../core/services/auth.service';
import { TextAnchor } from '../../editor/anchor.util';
import { authorColorIndex } from '../../editor/author-color.util';
import { PENDING_ID } from '../../editor/comment-highlights.extension';
import {
  CommentStatus,
  DocumentComment,
  SupervisionRole,
  personName,
} from '../../models/supervision.model';
import { SupervisionService } from '../../services/supervision.service';

export type CommentFilter = 'all' | CommentStatus;

/** One accent per comment author, so who wrote what is visible at a glance. Full class names so Tailwind keeps them. */
const AUTHOR_COLORS = [
  { border: 'border-l-blue-500', name: 'text-blue-700', tint: 'bg-blue-50' },
  { border: 'border-l-emerald-500', name: 'text-emerald-700', tint: 'bg-emerald-50' },
  { border: 'border-l-purple-500', name: 'text-purple-700', tint: 'bg-purple-50' },
  { border: 'border-l-orange-500', name: 'text-orange-700', tint: 'bg-orange-50' },
  { border: 'border-l-pink-500', name: 'text-pink-700', tint: 'bg-pink-50' },
  { border: 'border-l-teal-500', name: 'text-teal-700', tint: 'bg-teal-50' },
];

/** space kept between two stacked margin cards */
const GAP = 8;

/**
 * Comment threads of a document (upload or editor mode). Every comment and reply shows who wrote
 * it and when, since both the student and the supervisors can comment.
 *
 * `layout="panel"` is a plain list. `layout="margin"` places each thread level with the text it is
 * about (`anchorTops` says where that text is) and pushes cards down when they would overlap.
 */
@Component({
  selector: 'app-document-comments',
  standalone: true,
  imports: [
    DatePipe,
    NgTemplateOutlet,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    SelectButtonModule,
    SkeletonModule,
    TagModule,
    Textarea,
  ],
  templateUrl: './document-comments.component.html',
  providers: [ConfirmationService],
})
export class DocumentCommentsComponent implements OnInit, OnDestroy {
  private readonly service = inject(SupervisionService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly auth = inject(AuthService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly docId = input.required<string>();
  /** Upload documents: the version the comments belong to. Editor documents: leave empty. */
  readonly versionId = input<string | null>(null);
  readonly role = input.required<SupervisionRole>();
  readonly readOnly = input(false);
  /** Both sides can start a thread; the page turns it off when there is nothing to comment on. */
  readonly canStart = input(true);
  /** Text selected in the editor that the next new comment will be attached to. */
  readonly pendingAnchor = input<TextAnchor | null>(null);
  readonly activeId = input<string | null>(null);
  /** Comments whose quoted text was edited away. */
  readonly outdatedIds = input<string[]>([]);
  /** Refresh interval, so new comments from the other side show up without reloading. */
  readonly pollMs = input(0);
  readonly layout = input<'panel' | 'margin'>('panel');
  /** Margin layout: vertical position of each thread's text (null = the text is gone). */
  readonly anchorTops = input<Record<string, number | null>>({});
  /** The page can drive the filter itself (margin layout has no room for the buttons). */
  readonly filter = model<CommentFilter>('all');
  readonly showFilter = input(true);

  readonly threadsChange = output<DocumentComment[]>();
  readonly threadClicked = output<DocumentComment>();
  readonly anchorCleared = output<void>();
  /** after any change, so the page can refresh its own counters */
  readonly changed = output<void>();

  readonly threads = signal<DocumentComment[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly filterOptions: { label: string; value: CommentFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'Resolved', value: 'resolved' },
  ];

  readonly personName = personName;
  readonly pendingId = PENDING_ID;
  newComment = '';
  replies: Record<string, string> = {};

  /** margin layout: where each card ends up after resolving overlaps */
  readonly tops = signal<Record<string, number>>({});
  readonly marginHeight = signal(0);

  private timer: ReturnType<typeof setInterval> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private restackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.versionId(); // reload when the version, the document or the filter changes
      this.docId();
      this.filter();
      // load() reads other signals; they must not retrigger this effect
      untracked(() => this.load(true));
    });
    effect(() => {
      const id = this.activeId();
      if (id) setTimeout(() => document.getElementById('thread-' + id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    });
    effect(() => {
      // anything that can move or resize a card
      this.threads();
      this.anchorTops();
      this.pendingAnchor();
      this.layout();
      this.queueRestack();
    });
  }

  ngOnInit(): void {
    if (this.pollMs() > 0) {
      this.timer = setInterval(() => {
        if (document.visibilityState === 'visible') this.load(false);
      }, this.pollMs());
    }
    // a reply box opening, or a long comment wrapping, changes a card's height
    this.resizeObserver = new ResizeObserver(() => this.queueRestack());
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.restackTimer) clearTimeout(this.restackTimer);
    this.resizeObserver?.disconnect();
  }

  isOutdated(t: DocumentComment): boolean {
    return this.outdatedIds().includes(t._id);
  }

  canResolve(t: DocumentComment): boolean {
    return (
      !this.readOnly() &&
      (this.role() === 'supervisor' || t.authorId?._id === this.auth.currentUser()?.id)
    );
  }

  /** the same author always gets the same colour */
  authorColor(c: DocumentComment) {
    return AUTHOR_COLORS[authorColorIndex(c.authorId?._id)];
  }

  /** a supervisor can delete any comment, everyone else only their own */
  canDelete(c: DocumentComment): boolean {
    return (
      !this.readOnly() &&
      (this.role() === 'supervisor' || c.authorId?._id === this.auth.currentUser()?.id)
    );
  }

  // ---------------- margin layout ----------------

  private queueRestack(): void {
    if (this.layout() !== 'margin') return;
    if (this.restackTimer) clearTimeout(this.restackTimer);
    // wait for the cards to be rendered so they can be measured
    this.restackTimer = setTimeout(() => this.restack());
  }

  /**
   * Each card wants to sit level with its text. Walking down the page in order, a card that would
   * overlap the one above is pushed below it; cards whose text is gone go to the bottom.
   */
  private restack(): void {
    const cards = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('[data-card]'));
    const tops = this.anchorTops();
    const items = cards.map((el) => {
      this.resizeObserver?.observe(el);
      const id = el.dataset['card']!;
      const wanted = tops[id];
      return { id, height: el.offsetHeight, wanted: typeof wanted === 'number' ? wanted : null };
    });
    const anchored = items.filter((i) => i.wanted !== null).sort((a, b) => a.wanted! - b.wanted!);
    const loose = items.filter((i) => i.wanted === null);

    const next: Record<string, number> = {};
    let y = 0;
    for (const item of [...anchored, ...loose]) {
      const top = Math.max(item.wanted ?? y, y);
      next[item.id] = top;
      y = top + item.height + GAP;
    }

    const current = this.tops();
    const same =
      Object.keys(next).length === Object.keys(current).length &&
      Object.keys(next).every((k) => current[k] === next[k]);
    if (!same) this.tops.set(next);
    if (this.marginHeight() !== y) this.marginHeight.set(y);
  }

  // ---------------- data ----------------

  load(showSkeleton: boolean): void {
    if (showSkeleton) this.loading.set(true);
    this.error.set(false);
    const f = this.filter();
    this.service
      .comments(this.docId(), {
        versionId: this.versionId() ?? undefined,
        status: f === 'all' ? undefined : f,
      })
      .subscribe({
        next: (list) => {
          this.threads.set(list);
          this.threadsChange.emit(list);
          this.loading.set(false);
        },
        error: () => {
          // a failed background refresh keeps what is on screen
          if (showSkeleton) this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  private fail(summary: string) {
    return (err: { error?: { message?: string } }) =>
      this.messages.add({ severity: 'error', summary, detail: err?.error?.message });
  }

  add(): void {
    const text = this.newComment.trim();
    if (!text) return;
    const anchor = this.pendingAnchor();
    this.service
      .addComment(this.docId(), {
        text,
        versionId: this.versionId() ?? undefined,
        anchor: anchor ?? undefined,
      })
      .subscribe({
        next: () => {
          this.newComment = '';
          if (anchor) this.anchorCleared.emit();
          this.load(false);
          this.changed.emit();
        },
        error: this.fail('Could not add the comment'),
      });
  }

  reply(thread: DocumentComment): void {
    const text = (this.replies[thread._id] ?? '').trim();
    if (!text) return;
    this.service.addComment(this.docId(), { text, parentId: thread._id }).subscribe({
      next: () => {
        delete this.replies[thread._id];
        this.load(false);
        this.changed.emit();
      },
      error: this.fail('Could not send the reply'),
    });
  }

  remove(comment: DocumentComment, isThread: boolean): void {
    const what = isThread && comment.replies?.length ? 'this comment and its replies' : 'this comment';
    this.confirmation.confirm({
      header: 'Delete comment',
      message: `Delete ${what}? This can't be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary' },
      accept: () =>
        this.service.deleteComment(comment._id).subscribe({
          next: () => {
            this.load(false);
            this.changed.emit();
          },
          error: this.fail('Could not delete the comment'),
        }),
    });
  }

  toggleResolved(thread: DocumentComment): void {
    const next: CommentStatus = thread.status === 'open' ? 'resolved' : 'open';
    this.service.resolveComment(thread._id, next).subscribe({
      next: () => {
        this.load(false);
        this.changed.emit();
      },
      error: this.fail('Could not update the thread'),
    });
  }
}
