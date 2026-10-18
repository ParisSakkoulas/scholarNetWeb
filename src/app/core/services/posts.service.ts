import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environmets/environment';
import {
  CommentPage,
  Post,
  PostComment,
  PostPage,
} from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/posts`;

  private paging(page: number, limit: number): HttpParams {
    return new HttpParams().set('page', page).set('limit', limit);
  }

  create(content: string): Observable<Post> {
    return this.http.post<Post>(this.api, { content });
  }

  /** Posts from the people I follow, plus my own. */
  feed(page = 1, limit = 10): Observable<PostPage> {
    return this.http.get<PostPage>(`${this.api}/feed`, {
      params: this.paging(page, limit),
    });
  }

  userPosts(userId: string, page = 1, limit = 10): Observable<PostPage> {
    return this.http.get<PostPage>(`${this.api}/user/${userId}`, {
      params: this.paging(page, limit),
    });
  }

  getOne(postId: string): Observable<Post> {
    return this.http.get<Post>(`${this.api}/${postId}`);
  }

  /** Only works for your own posts. */
  remove(postId: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(`${this.api}/${postId}`);
  }

  like(postId: string): Observable<{ liked: true; likesCount: number }> {
    return this.http.post<{ liked: true; likesCount: number }>(
      `${this.api}/${postId}/like`,
      {},
    );
  }

  unlike(postId: string): Observable<{ liked: false; likesCount: number }> {
    return this.http.delete<{ liked: false; likesCount: number }>(
      `${this.api}/${postId}/like`,
    );
  }

  comments(postId: string, page = 1, limit = 10): Observable<CommentPage> {
    return this.http.get<CommentPage>(`${this.api}/${postId}/comments`, {
      params: this.paging(page, limit),
    });
  }

  addComment(postId: string, content: string): Observable<PostComment> {
    return this.http.post<PostComment>(`${this.api}/${postId}/comments`, {
      content,
    });
  }

  /** The comment's author or the post's author can delete a comment. */
  removeComment(
    postId: string,
    commentId: string,
  ): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(
      `${this.api}/${postId}/comments/${commentId}`,
    );
  }
}
