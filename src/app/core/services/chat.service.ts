import { HttpClient, HttpParams } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../../environmets/environment';
import {
  ChatMessage,
  Conversation,
  ConversationPage,
  MessageHistory,
  SocketAck,
} from '../models/message.model';
import { AuthService } from './auth.service';

const TYPING_TIMEOUT_MS = 4000;
const HISTORY_PAGE = 30;

/** One loaded conversation thread, oldest message first. */
export interface Thread {
  messages: ChatMessage[];
  hasMore: boolean;
}

/**
 * Real-time chat. Owns the socket.io connection to the API's `/chat` namespace
 * (opened while a user is signed in) and the shared state the UI renders:
 * conversation list, loaded threads, unread total and typing indicators.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = `${environment.apiUrl}/messages`;

  private socket: Socket | null = null;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private typingSent = new Set<string>();

  private readonly _connected = signal(false);
  readonly connected = this._connected.asReadonly();

  private readonly _conversations = signal<Conversation[]>([]);
  readonly conversations = this._conversations.asReadonly();

  private readonly _unreadTotal = signal(0);
  readonly unreadTotal = this._unreadTotal.asReadonly();

  private readonly _threads = signal<Record<string, Thread>>({});
  readonly threads = this._threads.asReadonly();

  /** conversationId -> the other user is typing. */
  private readonly _typing = signal<Record<string, boolean>>({});
  readonly typing = this._typing.asReadonly();

  /** Conversation currently on screen; new messages in it are marked read straight away. */
  private readonly _activeId = signal<string | null>(null);
  readonly activeId = this._activeId.asReadonly();

  constructor() {
    effect(() => {
      if (this.auth.currentUser()) {
        this.connect();
        this.refreshUnread();
      } else {
        this.disconnect();
      }
    });
  }

  // ---------------- SOCKET ----------------

  private connect(): void {
    if (this.socket) return;

    const socket = io(`${environment.apiUrl}/chat`, {
      // a function so every (re)connect sends the current token
      auth: (cb) => cb({ token: this.auth.getToken() ?? '' }),
    });
    this.socket = socket;

    socket.on('connect', () => {
      this._connected.set(true);
      // catch up on anything missed while offline
      this.refreshUnread();
      this.loadConversations().subscribe({ error: () => undefined });
      const active = this._activeId();
      if (active) this.reloadThread(active);
    });
    socket.on('disconnect', () => this._connected.set(false));

    socket.on('message:new', (m: ChatMessage) => this.onMessage(m));
    socket.on(
      'message:read',
      (e: { conversationId: string; readerId: string; readAt: string }) =>
        this.onRead(e),
    );
    socket.on(
      'typing',
      (e: { conversationId: string; userId: string; isTyping: boolean }) =>
        this.setTyping(e.conversationId, e.isTyping),
    );
  }

  private disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.typingSent.clear();
    this._connected.set(false);
    this._conversations.set([]);
    this._threads.set({});
    this._typing.set({});
    this._unreadTotal.set(0);
    this._activeId.set(null);
  }

  // ---------------- REST ----------------

  loadConversations(page = 1, limit = 30): Observable<ConversationPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http
      .get<ConversationPage>(`${this.api}/conversations`, { params })
      .pipe(
        tap((res) => {
          this._conversations.set(res.data);
          this._unreadTotal.set(
            res.data.reduce((sum, c) => sum + c.unreadCount, 0),
          );
        }),
      );
  }

  /** Opens (or creates) the chat with a connected user. */
  openWith(userId: string): Observable<Conversation> {
    return this.http
      .post<Conversation>(`${this.api}/conversations`, { userId })
      .pipe(
        tap((c) => {
          // a brand new chat has no messages yet, so it stays out of the list until one is sent
          if (c.lastMessage) this.upsertConversation(c);
        }),
      );
  }

  refreshUnread(): void {
    this.http
      .get<{ unread: number }>(`${this.api}/unread-count`)
      .subscribe({
        next: (res) => this._unreadTotal.set(res.unread),
        error: () => undefined,
      });
  }

  /** Loads the newest page of a thread (replacing what is cached). */
  async loadThread(conversationId: string): Promise<void> {
    const res = await firstValueFrom(this.fetchHistory(conversationId));
    this._threads.update((t) => ({
      ...t,
      [conversationId]: { messages: [...res.data].reverse(), hasMore: res.hasMore },
    }));
  }

  /** Prepends the next older page. */
  async loadOlder(conversationId: string): Promise<void> {
    const thread = this._threads()[conversationId];
    const oldest = thread?.messages[0];
    if (!thread || !oldest) return;
    const res = await firstValueFrom(this.fetchHistory(conversationId, oldest._id));
    this._threads.update((t) => ({
      ...t,
      [conversationId]: {
        messages: [...[...res.data].reverse(), ...thread.messages],
        hasMore: res.hasMore,
      },
    }));
  }

  private fetchHistory(conversationId: string, before?: string) {
    let params = new HttpParams().set('limit', HISTORY_PAGE);
    if (before) params = params.set('before', before);
    return this.http.get<MessageHistory>(
      `${this.api}/conversations/${conversationId}/messages`,
      { params },
    );
  }

  private reloadThread(conversationId: string): void {
    this.loadThread(conversationId)
      .then(() => this.markRead(conversationId))
      .catch(() => undefined);
  }

  // ---------------- ACTIONS ----------------

  /** Marks which conversation is on screen (null when the chat page is left). */
  setActive(conversationId: string | null): void {
    const previous = this._activeId();
    if (previous && previous !== conversationId) this.stopTyping(previous);
    this._activeId.set(conversationId);
    if (conversationId) this.markRead(conversationId);
  }

  /** Sends over the socket, falling back to HTTP when it is down. Resolves with the saved message. */
  async send(conversationId: string, text: string): Promise<ChatMessage> {
    this.stopTyping(conversationId);

    let message: ChatMessage;
    if (this.socket?.connected) {
      const ack = await this.emitWithAck('message:send', { conversationId, text });
      if (!ack.ok || !ack.message) {
        throw new Error(ack.error ?? 'Could not send the message.');
      }
      message = ack.message;
    } else {
      message = await firstValueFrom(
        this.http.post<ChatMessage>(
          `${this.api}/conversations/${conversationId}/messages`,
          { text },
        ),
      );
    }
    // the server also pushes message:new to this tab; onMessage de-duplicates by id
    this.onMessage(message);
    return message;
  }

  markRead(conversationId: string): void {
    const convo = this._conversations().find((c) => c._id === conversationId);
    if (convo && convo.unreadCount > 0) {
      this._unreadTotal.update((n) => Math.max(0, n - convo.unreadCount));
      this.patchConversation(conversationId, { unreadCount: 0 });
    }
    if (this.socket?.connected) {
      this.socket.emit('message:read', { conversationId });
    } else {
      this.http
        .patch(`${this.api}/conversations/${conversationId}/read`, {})
        .subscribe({ error: () => undefined });
    }
  }

  /** Call on every keystroke; emits typing:start once, typing:stop after a pause. */
  notifyTyping(conversationId: string): void {
    if (!this.socket?.connected) return;
    if (!this.typingSent.has(conversationId)) {
      this.typingSent.add(conversationId);
      this.socket.emit('typing:start', { conversationId });
    }
    const key = `out:${conversationId}`;
    clearTimeout(this.timers.get(key));
    this.timers.set(key, setTimeout(() => this.stopTyping(conversationId), 2000));
  }

  stopTyping(conversationId: string): void {
    clearTimeout(this.timers.get(`out:${conversationId}`));
    if (this.typingSent.delete(conversationId) && this.socket?.connected) {
      this.socket.emit('typing:stop', { conversationId });
    }
  }

  // ---------------- INCOMING EVENTS ----------------

  private onMessage(m: ChatMessage): void {
    const me = this.auth.currentUser()?.id;
    const mine = m.sender === me;

    // already handled (the ack and the socket event both deliver our own messages)
    const thread = this._threads()[m.conversation];
    const duplicate = !!thread?.messages.some((x) => x._id === m._id);
    if (thread && !duplicate) {
      this._threads.update((threads) => ({
        ...threads,
        [m.conversation]: { ...thread, messages: [...thread.messages, m] },
      }));
    }
    if (duplicate) return;

    if (!mine) this.setTyping(m.conversation, false);

    const known = this._conversations().find((c) => c._id === m.conversation);
    if (!known) {
      // first message of a chat we have not listed yet
      this.loadConversations().subscribe({ error: () => undefined });
      return;
    }

    const viewing = this._activeId() === m.conversation;
    const bumpUnread = !mine && !viewing;
    this.upsertConversation({
      ...known,
      lastMessage: { sender: m.sender, text: m.text, createdAt: m.createdAt },
      lastMessageAt: m.createdAt,
      unreadCount: bumpUnread ? known.unreadCount + 1 : known.unreadCount,
    });
    if (bumpUnread) this._unreadTotal.update((n) => n + 1);
    if (!mine && viewing) this.markRead(m.conversation);
  }

  private onRead(e: { conversationId: string; readerId: string; readAt: string }): void {
    this._threads.update((threads) => {
      const thread = threads[e.conversationId];
      if (!thread) return threads;
      return {
        ...threads,
        [e.conversationId]: {
          ...thread,
          messages: thread.messages.map((m) =>
            m.sender !== e.readerId && !m.readAt ? { ...m, readAt: e.readAt } : m,
          ),
        },
      };
    });
  }

  private setTyping(conversationId: string, isTyping: boolean): void {
    const key = `in:${conversationId}`;
    clearTimeout(this.timers.get(key));
    this._typing.update((t) => ({ ...t, [conversationId]: isTyping }));
    if (isTyping) {
      // safety net in case typing:stop is lost
      this.timers.set(
        key,
        setTimeout(() => this.setTyping(conversationId, false), TYPING_TIMEOUT_MS),
      );
    }
  }

  // ---------------- LIST HELPERS ----------------

  private upsertConversation(c: Conversation): void {
    this._conversations.update((list) =>
      [c, ...list.filter((x) => x._id !== c._id)].sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      ),
    );
  }

  private patchConversation(id: string, patch: Partial<Conversation>): void {
    this._conversations.update((list) =>
      list.map((c) => (c._id === id ? { ...c, ...patch } : c)),
    );
  }

  private emitWithAck(event: string, payload: unknown): Promise<SocketAck> {
    return new Promise((resolve, reject) => {
      this.socket!.timeout(10_000).emit(event, payload, (err: unknown, ack: SocketAck) =>
        err ? reject(new Error('The server did not respond.')) : resolve(ack),
      );
    });
  }
}
