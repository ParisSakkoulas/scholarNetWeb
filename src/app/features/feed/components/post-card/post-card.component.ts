import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

import { Post } from '../../../../core/models/post.model';
import { AuthService } from '../../../../core/services/auth.service';
import { PostsService } from '../../../../core/services/posts.service';
import { timeAgo } from '../../../../shared/utils/time-ago';
import { PostCommentsComponent } from '../post-comments/post-comments.component';

/**
 * One post in the feed: author, text, like / comment buttons, and a delete
 * button for the author. The parent must provide ConfirmationService and
 * MessageService (it renders the single <p-confirmdialog> and <p-toast>).
 */
@Component({
  selector: 'sn-post-card',
  standalone: true,
  imports: [RouterLink, AvatarModule, ButtonModule, PostCommentsComponent],
  templateUrl: './post-card.component.html',
})
export class PostCardComponent {
  private readonly postsService = inject(PostsService);
  private readonly authService = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

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

  toggleLike(): void {
    if (this.likeBusy()) return;
    const p = this.view();
    const wasLiked = p.likedByMe;

    // show the change at once, undo it if the request fails
    this.changes.update((c) => ({
      ...c,
      likedByMe: !wasLiked,
      likesCount: Math.max(0, p.likesCount + (wasLiked ? -1 : 1)),
    }));

    this.likeBusy.set(true);
    const request$: Observable<{ likesCount: number }> = wasLiked
      ? this.postsService.unlike(p._id)
      : this.postsService.like(p._id);

    request$.subscribe({
      next: (res) => {
        this.likeBusy.set(false);
        this.changes.update((c) => ({ ...c, likesCount: res.likesCount }));
      },
      error: () => {
        this.likeBusy.set(false);
        this.changes.update((c) => ({
          ...c,
          likedByMe: wasLiked,
          likesCount: p.likesCount,
        }));
        this.messages.add({ severity: 'error', summary: 'Could not update like' });
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
