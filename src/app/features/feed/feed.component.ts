import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';

import { Post } from '../../core/models/post.model';
import { PostsService } from '../../core/services/posts.service';
import { PostCardComponent } from './components/post-card/post-card.component';
import { PostComposerComponent } from './components/post-composer/post-composer.component';

/** Main feed: posts from the people I follow, plus my own. */
@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    SkeletonModule,
    PostCardComponent,
    PostComposerComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './feed.component.html',
})
export class FeedComponent implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly messages = inject(MessageService);

  readonly pageSize = 10;
  readonly posts = signal<Post[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly loading = signal(false);
  readonly failed = signal(false);

  readonly hasMore = computed(() => this.posts().length < this.total());

  ngOnInit(): void {
    this.loadMore();
  }

  loadMore(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.failed.set(false);

    this.postsService.feed(this.page() + 1, this.pageSize).subscribe({
      next: (res) => {
        // a post I just wrote is already in the list; don't show it twice
        const seen = new Set(this.posts().map((p) => p._id));
        this.posts.update((list) => [
          ...list,
          ...res.data.filter((p) => !seen.has(p._id)),
        ]);
        this.total.set(res.total);
        this.page.set(res.page);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }

  onPosted(post: Post): void {
    this.posts.update((list) => [post, ...list]);
    this.total.update((n) => n + 1);
    this.messages.add({ severity: 'success', summary: 'Posted' });
  }

  onDeleted(postId: string): void {
    this.posts.update((list) => list.filter((p) => p._id !== postId));
    this.total.update((n) => Math.max(0, n - 1));
  }
}
