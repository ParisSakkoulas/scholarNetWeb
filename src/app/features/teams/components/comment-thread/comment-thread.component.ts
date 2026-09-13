import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentsService } from '../../services/comments.service';
import { Comment } from '../../models/comment.model';

@Component({
  selector: 'app-comment-thread',
  imports: [CommonModule, FormsModule],
  templateUrl: './comment-thread.component.html',
  styleUrl: './comment-thread.component.css',
})
export class CommentThreadComponent implements OnInit {
  @Input({ required: true }) taskId!: string;

  comments = signal<Comment[]>([]);
  newComment = signal('');
  loading = signal(true);
  posting = signal(false);

  constructor(private commentsService: CommentsService) {}

  ngOnInit(): void {
    this.fetchComments();
  }

  fetchComments(): void {
    this.loading.set(true);
    this.commentsService.getForTask(this.taskId).subscribe({
      next: (comments) => {
        this.comments.set(comments);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  post(): void {
    if (!this.newComment().trim()) return;
    this.posting.set(true);
    this.commentsService
      .create(this.taskId, { body: this.newComment() })
      .subscribe({
        next: (comment) => {
          this.comments.update((list) => [...list, comment]);
          this.newComment.set('');
          this.posting.set(false);
        },
        error: () => this.posting.set(false),
      });
  }

  remove(commentId: string): void {
    this.commentsService.remove(commentId).subscribe(() => {
      this.comments.update((list) => list.filter((c) => c._id !== commentId));
    });
  }

  authorName(comment: Comment): string {
    return typeof comment.authorId === 'string'
      ? comment.authorId
      : comment.authorId.name;
  }

  authorId(comment: Comment): string {
    return typeof comment.authorId === 'string'
      ? comment.authorId
      : comment.authorId._id;
  }
}
