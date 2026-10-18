import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';

import { Post } from '../../../core/models/post.model';
import { PostsService } from '../../../core/services/posts.service';
import { PostCardComponent } from '../components/post-card/post-card.component';

/** One post on its own page, opened from a "liked / commented on your post" notification. */
@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    SkeletonModule,
    ToastModule,
    PostCardComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmdialog />

    <div class="mx-auto min-h-[calc(100vh-12rem)] max-w-2xl px-4 py-8">
      <p-button
        label="Back to feed"
        icon="pi pi-arrow-left"
        [text]="true"
        severity="secondary"
        size="small"
        routerLink="/main/feed"
      />

      <div class="mt-3">
        @if (post(); as p) {
          <sn-post-card
            [post]="p"
            [startExpanded]="true"
            (deleted)="onDeleted()"
          />
        } @else if (notFound()) {
          <div
            class="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--p-content-border-color)] px-4 py-14 text-center text-surface-500"
          >
            <i class="pi pi-ban text-4xl" aria-hidden="true"></i>
            <p class="m-0 font-medium text-surface-700">
              This post is no longer available
            </p>
            <p class="m-0 text-sm">It may have been deleted by its author.</p>
          </div>
        } @else {
          <p-skeleton width="100%" height="10rem" />
        }
      </div>
    </div>
  `,
})
export class PostDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postsService = inject(PostsService);

  readonly post = signal<Post | null>(null);
  readonly notFound = signal(false);

  ngOnInit(): void {
    const postId = this.route.snapshot.paramMap.get('postId');
    if (!postId) {
      this.notFound.set(true);
      return;
    }
    this.postsService.getOne(postId).subscribe({
      next: (post) => this.post.set(post),
      error: () => this.notFound.set(true),
    });
  }

  onDeleted(): void {
    this.router.navigate(['/main/feed']);
  }
}
