import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import {
  MAX_COMMENT_LENGTH,
  PostAuthor,
  PostComment,
} from '../../../../core/models/post.model';
import { AuthService } from '../../../../core/services/auth.service';
import { PostsService } from '../../../../core/services/posts.service';
import { timeAgo } from '../../../../shared/utils/time-ago';

/** Comment list + "write a comment" box under a post. */
@Component({
  selector: 'sn-post-comments',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AvatarModule,
    ButtonModule,
    InputTextModule,
  ],
  templateUrl: './post-comments.component.html',
})
export class PostCommentsComponent implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly authService = inject(AuthService);
  private readonly messages = inject(MessageService);

  readonly postId = input.required<string>();
  /** the post's author may delete any comment on their post */
  readonly postAuthorId = input.required<string>();

  /** +1 / -1, so the post card can keep its comment count in sync */
  readonly countChanged = output<number>();

  readonly pageSize = 5;
  readonly maxLength = MAX_COMMENT_LENGTH;
  readonly comments = signal<PostComment[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly loading = signal(false);
  readonly sending = signal(false);

  readonly hasMore = computed(() => this.comments().length < this.total());

  readonly text = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(MAX_COMMENT_LENGTH)],
  });

  private readonly myId = computed(() => this.authService.currentUser()?.id);

  readonly myInitials = computed(() => {
    const u = this.authService.currentUser();
    return `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase();
  });

  readonly timeAgo = timeAgo;

  ngOnInit(): void {
    this.loadMore();
  }

  loadMore(): void {
    this.loading.set(true);
    this.postsService
      .comments(this.postId(), this.page() + 1, this.pageSize)
      .subscribe({
        next: (res) => {
          // skip any comment already shown (e.g. one just added by me)
          const seen = new Set(this.comments().map((c) => c._id));
          this.comments.update((list) => [
            ...list,
            ...res.data.filter((c) => !seen.has(c._id)),
          ]);
          this.total.set(res.total);
          this.page.set(res.page);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  submit(): void {
    const content = this.text.value.trim();
    if (!content || this.text.invalid || this.sending()) return;

    this.sending.set(true);
    this.postsService.addComment(this.postId(), content).subscribe({
      next: (comment) => {
        this.sending.set(false);
        this.text.reset('');
        // newest first, like the API
        this.comments.update((list) => [comment, ...list]);
        this.total.update((n) => n + 1);
        this.countChanged.emit(1);
      },
      error: (err) => {
        this.sending.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Could not comment',
          detail: err?.error?.message ?? 'Something went wrong',
        });
      },
    });
  }

  canDelete(c: PostComment): boolean {
    const me = this.myId();
    return !!me && (c.author._id === me || this.postAuthorId() === me);
  }

  remove(c: PostComment): void {
    this.postsService.removeComment(this.postId(), c._id).subscribe({
      next: () => {
        this.comments.update((list) => list.filter((x) => x._id !== c._id));
        this.total.update((n) => Math.max(0, n - 1));
        this.countChanged.emit(-1);
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Could not delete comment',
          detail: err?.error?.message ?? 'Something went wrong',
        }),
    });
  }

  name(a: PostAuthor): string {
    return `${a.firstName} ${a.lastName}`.trim() || a.username;
  }

  initials(a: PostAuthor): string {
    return `${a.firstName?.[0] ?? ''}${a.lastName?.[0] ?? ''}`.toUpperCase();
  }
}
