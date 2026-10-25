import { PagedResult } from './follow.model';

export type ReactionType = 'like' | 'celebrate' | 'support' | 'love' | 'insightful' | 'funny';

export const REACTIONS: { type: ReactionType; label: string; emoji: string; color: string }[] = [
  { type: 'like', label: 'Like', emoji: '👍', color: 'text-blue-600' },
  { type: 'celebrate', label: 'Celebrate', emoji: '👏', color: 'text-green-600' },
  { type: 'support', label: 'Support', emoji: '🤝', color: 'text-purple-600' },
  { type: 'love', label: 'Love', emoji: '❤️', color: 'text-red-600' },
  { type: 'insightful', label: 'Insightful', emoji: '💡', color: 'text-amber-600' },
  { type: 'funny', label: 'Funny', emoji: '😂', color: 'text-orange-600' },
];

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
  /** which reaction I gave, if any */
  myReaction?: ReactionType | null;
  /** reactions per type; the total is `likesCount` */
  reactions?: Partial<Record<ReactionType, number>>;
  createdAt: string;
  updatedAt: string;
  /** set once the author has changed the text */
  editedAt?: string | null;
}

export type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or hate' },
  { value: 'misinformation', label: 'False information' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Something else' },
];

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
