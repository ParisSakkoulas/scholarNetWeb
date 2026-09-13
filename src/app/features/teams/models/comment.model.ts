export interface Comment {
  _id: string;
  entityType: 'task' | 'project';
  entityId: string;
  authorId:
    | {
        _id: string;
        name: string;
        avatarUrl?: string;
      }
    | string;
  body: string;
  createdAt: string;
}

export interface CreateCommentPayload {
  body: string;
}
