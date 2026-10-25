import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

import {
  MAX_POST_LENGTH,
  Post,
  REACTIONS,
  REPORT_REASONS,
  ReactionType,
  ReportReason,
} from '../../../../core/models/post.model';
import { AuthService } from '../../../../core/services/auth.service';
import { FollowsService } from '../../../../core/services/follows.service';
import { PostsService } from '../../../../core/services/posts.service';
import { timeAgo } from '../../../../shared/utils/time-ago';
import { PostCommentsComponent } from '../post-comments/post-comments.component';

/**
 * One post in the feed: author, text, like button with a reaction picker, comment button, and a delete
 * button for the author. The parent must provide ConfirmationService and
 * MessageService (it renders the single <p-confirmdialog> and <p-toast>).
 */
@Component({
  selector: 'sn-post-card',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    AvatarModule,
    ButtonModule,
    DialogModule,
    MenuModule,
    SelectModule,
    TextareaModule,
    PostCommentsComponent,
  ],
  templateUrl: './post-card.component.html',
})
export class PostCardComponent {
  private readonly postsService = inject(PostsService);
  private readonly authService = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly follows = inject(FollowsService);

  readonly post = input.required<Post>();
  /** open the comments straight away (used on the single-post page) */
  readonly startExpanded = input(false);

  readonly deleted = output<string>();

  /** local copy so likes and comment counts update without reloading the feed */
  private readonly changes = signal<Partial<Post>>({});
  readonly view = computed<Post>(() => ({ ...this.post(), ...this.changes() }));

  readonly showComments = signal(false);
  readonly likeBusy = signal(false);

  readonly isMine = computed(
    () => this.view().author._id === this.authService.currentUser()?.id,
  );

  readonly authorName = computed(() => {
    const a = this.view().author;
    return `${a.firstName} ${a.lastName}`.trim() || a.username;
  });

  readonly initials = computed(() => {
    const a = this.view().author;
    return `${a.firstName?.[0] ?? ''}${a.lastName?.[0] ?? ''}`.toUpperCase();
  });

  readonly timeAgo = computed(() => timeAgo(this.view().createdAt));

  ngOnInit(): void {
    this.showComments.set(this.startExpanded());
  }

  // ---- the "..." menu: different for my posts and other people's ----

  /** null until the first time the menu opens on someone else's post */
  readonly following = signal<boolean | null>(null);

  readonly menuItems = computed<MenuItem[]>(() => {
    const copy: MenuItem = { label: 'Copy link', icon: 'pi pi-link', command: () => this.copyLink() };
    if (this.isMine()) {
      return [
        { label: 'Edit post', icon: 'pi pi-pencil', command: () => this.startEdit() },
        copy,
        { separator: true },
        { label: 'Delete post', icon: 'pi pi-trash', styleClass: 'text-red-600', command: () => this.confirmDelete() },
      ];
    }
    const name = this.view().author.firstName || `@${this.view().author.username}`;
    const isFollowing = this.following() === true;
    return [
      copy,
      {
        label: isFollowing ? `Unfollow ${name}` : `Follow ${name}`,
        icon: isFollowing ? 'pi pi-user-minus' : 'pi pi-user-plus',
        disabled: this.following() === null,
        command: () => this.toggleFollow(),
      },
      { separator: true },
      { label: 'Report post', icon: 'pi pi-flag', command: () => this.openReport() },
    ];
  });

  /** looks up whether I follow the author when the menu of someone else's post is opened */
  onMenuShow(): void {
    if (this.isMine() || this.following() !== null) return;
    this.follows.getStatus(this.view().author._id).subscribe({
      next: (s) => this.following.set(s.isFollowing),
      error: () => this.following.set(false),
    });
  }

  copyLink(): void {
    const url = `${window.location.origin}/main/posts/${this.view()._id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => this.messages.add({ severity: 'success', summary: 'Link copied' }))
      .catch(() => this.messages.add({ severity: 'warn', summary: 'Could not copy the link' }));
  }

  toggleFollow(): void {
    const author = this.view().author;
    const was = this.following() === true;
    this.following.set(!was);
    const request$: Observable<unknown> = was
      ? this.follows.unfollow(author._id)
      : this.follows.follow(author._id);
    request$.subscribe({
      next: () =>
        this.messages.add({
          severity: 'success',
          summary: was ? `Unfollowed ${author.firstName}` : `Following ${author.firstName}`,
        }),
      error: () => {
        this.following.set(was);
        this.messages.add({ severity: 'error', summary: 'Could not update the follow' });
      },
    });
  }

  // ---- edit (my posts) ----

  readonly maxLength = MAX_POST_LENGTH;
  readonly editing = signal(false);
  readonly savingEdit = signal(false);
  editText = '';

  startEdit(): void {
    this.editText = this.view().content;
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    const text = this.editText.trim();
    if (!text || this.savingEdit()) return;
    if (text === this.view().content) return this.cancelEdit();
    this.savingEdit.set(true);
    this.postsService.edit(this.view()._id, text).subscribe({
      next: (post) => {
        this.savingEdit.set(false);
        this.editing.set(false);
        this.changes.update((c) => ({ ...c, content: post.content, editedAt: post.editedAt }));
        this.messages.add({ severity: 'success', summary: 'Post updated' });
      },
      error: (err) => {
        this.savingEdit.set(false);
        this.messages.add({ severity: 'error', summary: 'Could not save', detail: err?.error?.message });
      },
    });
  }

  // ---- report (other people's posts) ----

  readonly reportOpen = signal(false);
  readonly reporting = signal(false);
  readonly reportReasons = REPORT_REASONS;
  reportReason: ReportReason | null = null;
  reportDetails = '';

  openReport(): void {
    this.reportReason = null;
    this.reportDetails = '';
    this.reportOpen.set(true);
  }

  sendReport(): void {
    if (!this.reportReason) return;
    this.reporting.set(true);
    this.postsService.report(this.view()._id, this.reportReason, this.reportDetails).subscribe({
      next: () => {
        this.reporting.set(false);
        this.reportOpen.set(false);
        this.messages.add({ severity: 'success', summary: 'Thanks, we will review this post' });
      },
      error: (err) => {
        this.reporting.set(false);
        this.messages.add({ severity: 'error', summary: 'Could not send the report', detail: err?.error?.message });
      },
    });
  }

  // ---- reactions ----

  readonly reactionList = REACTIONS;
  readonly pickerOpen = signal(false);
  private pickerTimer: ReturnType<typeof setTimeout> | null = null;

  /** the reaction I gave, as its emoji/label/colour (null when I have not reacted) */
  readonly myReaction = computed(() => {
    const type = this.view().myReaction ?? (this.view().likedByMe ? 'like' : null);
    return REACTIONS.find((r) => r.type === type) ?? null;
  });

  /** the most used reactions (up to three), for the summary under the post */
  readonly topReactions = computed(() => {
    const v = this.view();
    const counts = { ...(v.reactions ?? {}) } as Partial<Record<ReactionType, number>>;
    // older likes have no type; whatever the breakdown does not explain is a plain like
    const known = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
    if (v.likesCount > known) counts.like = (counts.like ?? 0) + (v.likesCount - known);
    return REACTIONS.filter((r) => (counts[r.type] ?? 0) > 0)
      .sort((a, b) => (counts[b.type] ?? 0) - (counts[a.type] ?? 0))
      .slice(0, 3);
  });

  /** opens after a short hover (or a long press on touch screens), so passing over does not flash it */
  hoverOpen(): void {
    this.clearPickerTimer();
    this.pickerTimer = setTimeout(() => this.pickerOpen.set(true), 350);
  }

  hoverClose(): void {
    this.clearPickerTimer();
    this.pickerTimer = setTimeout(() => this.pickerOpen.set(false), 300);
  }

  private clearPickerTimer(): void {
    if (this.pickerTimer) clearTimeout(this.pickerTimer);
    this.pickerTimer = null;
  }

  /** the Like button: reacts with a like, or takes my reaction back */
  toggleLike(): void {
    this.react(this.myReaction() ? null : 'like');
  }

  /** picking the reaction I already have takes it back */
  pick(type: ReactionType): void {
    this.pickerOpen.set(false);
    this.clearPickerTimer();
    this.react(this.myReaction()?.type === type ? null : type);
  }

  private react(type: ReactionType | null): void {
    if (this.likeBusy()) return;
    const p = this.view();
    const before = {
      likedByMe: p.likedByMe,
      myReaction: p.myReaction ?? null,
      likesCount: p.likesCount,
      reactions: p.reactions,
    };

    // show the change at once, undo it if the request fails
    const delta = (type ? 1 : 0) - (p.likedByMe ? 1 : 0);
    this.changes.update((c) => ({
      ...c,
      likedByMe: !!type,
      myReaction: type,
      likesCount: Math.max(0, p.likesCount + delta),
    }));

    this.likeBusy.set(true);
    const request$ = type ? this.postsService.like(p._id, type) : this.postsService.unlike(p._id);
    request$.subscribe({
      next: (res) => {
        this.likeBusy.set(false);
        this.changes.update((c) => ({
          ...c,
          likesCount: res.likesCount,
          myReaction: res.myReaction,
          likedByMe: res.liked,
          reactions: res.reactions,
        }));
      },
      error: () => {
        this.likeBusy.set(false);
        this.changes.update((c) => ({ ...c, ...before }));
        this.messages.add({ severity: 'error', summary: 'Could not update your reaction' });
      },
    });
  }

  onCommentCountChanged(delta: number): void {
    this.changes.update((c) => ({
      ...c,
      commentsCount: Math.max(0, this.view().commentsCount + delta),
    }));
  }

  confirmDelete(): void {
    this.confirmation.confirm({
      header: 'Delete post',
      message: 'Delete this post? Its likes and comments will be removed too.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () =>
        this.postsService.remove(this.view()._id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Post deleted' });
            this.deleted.emit(this.view()._id);
          },
          error: (err) =>
            this.messages.add({
              severity: 'error',
              summary: 'Could not delete',
              detail: err?.error?.message ?? 'Something went wrong',
            }),
        }),
    });
  }
}
