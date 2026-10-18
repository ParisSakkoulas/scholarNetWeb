/** Matches the user card the API populates on a conversation. */
export interface ChatUser {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  profilePhotoUrl?: string;
}

/** A chat message as stored by the API. */
export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  readAt?: string | null;
  createdAt: string;
}

/** Row in GET /messages/conversations (the other participant is `user`). */
export interface Conversation {
  _id: string;
  user: ChatUser | null;
  lastMessage: { sender: string; text: string; createdAt: string } | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ConversationPage {
  data: Conversation[];
  total: number;
  page: number;
  limit: number;
}

export interface MessageHistory {
  data: ChatMessage[];
  hasMore: boolean;
}

/** Ack returned by the gateway for client -> server events. */
export interface SocketAck {
  ok: boolean;
  error?: string;
  message?: ChatMessage;
}
