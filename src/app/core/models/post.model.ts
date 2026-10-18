import { PagedResult } from './follow.model';

export interface PostAuthor {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  profilePhotoUrl?: string;
}

export interface Post {
  _id: string;
  author: PostAuthor;
  content: string;
  likesCount: number;
  commentsCount: number;
  /** added by the API for the signed-in user */
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostComment {
  _id: string;
  post: string;
  author: PostAuthor;
  content: string;
  createdAt: string;
}

export type PostPage = PagedResult<Post>;
export type CommentPage = PagedResult<PostComment>;

export const MAX_POST_LENGTH = 5000;
export const MAX_COMMENT_LENGTH = 1000;
