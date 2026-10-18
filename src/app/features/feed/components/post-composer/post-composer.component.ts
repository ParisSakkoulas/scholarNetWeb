import { Component, computed, inject, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

import { MAX_POST_LENGTH, Post } from '../../../../core/models/post.model';
import { AuthService } from '../../../../core/services/auth.service';
import { PostsService } from '../../../../core/services/posts.service';

/** "Share an update" box at the top of the feed. */
@Component({
  selector: 'sn-post-composer',
  standalone: true,
  imports: [ReactiveFormsModule, AvatarModule, ButtonModule, TextareaModule],
  templateUrl: './post-composer.component.html',
})
export class PostComposerComponent {
  private readonly postsService = inject(PostsService);
  private readonly authService = inject(AuthService);
  private readonly messages = inject(MessageService);

  readonly posted = output<Post>();

  readonly maxLength = MAX_POST_LENGTH;
  readonly content = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(MAX_POST_LENGTH)],
  });
  readonly sending = signal(false);

  readonly initials = computed(() => {
    const u = this.authService.currentUser();
    return `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase();
  });

  get length(): number {
    return this.content.value.length;
  }

  get canPost(): boolean {
    return !!this.content.value.trim() && this.content.valid && !this.sending();
  }

  submit(): void {
    if (!this.canPost) return;

    this.sending.set(true);
    this.postsService.create(this.content.value.trim()).subscribe({
      next: (post) => {
        this.sending.set(false);
        this.content.reset('');
        this.posted.emit(post);
      },
      error: (err) => {
        this.sending.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Could not publish',
          detail: err?.error?.message ?? 'Something went wrong',
        });
      },
    });
  }
}
