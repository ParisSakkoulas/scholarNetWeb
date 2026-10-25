import {
  AfterViewChecked,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import {
  ChatMessage,
  ChatUser,
  Conversation,
} from '../../core/models/message.model';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { timeAgo } from '../../shared/utils/time-ago';

const MAX_LENGTH = 4000;

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [FormsModule, AvatarModule, ButtonModule, SkeletonModule],
  templateUrl: './messages.component.html',
})
export class MessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('scroller') private scroller?: ElementRef<HTMLElement>;

  readonly maxLength = MAX_LENGTH;
  readonly timeAgo = timeAgo;

  readonly conversations = this.chat.conversations;
  readonly connected = this.chat.connected;
  readonly listLoading = signal(true);
  readonly threadLoading = signal(false);
  readonly loadingOlder = signal(false);
  readonly sending = signal(false);

  /** Conversation shown on the right. May not be in the list yet (a chat with no messages). */
  readonly selected = signal<Conversation | null>(null);
  draft = '';

  readonly meId = computed(() => this.auth.currentUser()?.id ?? '');
  readonly thread = computed(() => {
    const id = this.selected()?._id;
    return id ? this.chat.threads()[id] : undefined;
  });
  readonly messages = computed(() => this.thread()?.messages ?? []);
  readonly otherTyping = computed(() => {
    const id = this.selected()?._id;
    return !!id && !!this.chat.typing()[id];
  });

  /** The last message I sent, used to show "Seen". */
  readonly lastMineId = computed(() => {
    const mine = this.messages().filter((m) => m.sender === this.meId());
    return mine.at(-1)?._id ?? null;
  });

  private stickToBottom = true;
  private lastRenderedId: string | null = null;

  constructor() {
    // keep the open chat's header (unread badge etc.) in sync with the list
    effect(() => {
      const current = this.selected();
      if (!current) return;
      const fresh = this.chat.conversations().find((c) => c._id === current._id);
      if (fresh && fresh !== current) this.selected.set(fresh);
    });
  }

  ngOnInit(): void {
    this.chat.loadConversations().subscribe({
      next: () => this.listLoading.set(false),
      error: () => this.listLoading.set(false),
    });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const userId = params.get('user');
        if (userId) this.openWithUser(userId);
      });
  }

  ngOnDestroy(): void {
    this.chat.setActive(null);
  }

  ngAfterViewChecked(): void {
    // jump to the newest message when it changes, unless the user scrolled up to read history
    const last = this.messages().at(-1)?._id ?? null;
    if (last !== this.lastRenderedId) {
      this.lastRenderedId = last;
      if (this.stickToBottom) this.scrollToBottom();
    }
  }

  // ---------------- selection ----------------

  openWithUser(userId: string): void {
    this.chat.openWith(userId).subscribe({
      next: (c) => {
        this.select(c);
        // drop the query param so a refresh does not re-open it
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
      },
      error: (err) =>
        this.fail('Could not open the chat', err?.error?.message),
    });
  }

  select(c: Conversation): void {
    if (this.selected()?._id === c._id) return;
    this.selected.set(c);
    this.draft = '';
    this.stickToBottom = true;
    this.lastRenderedId = null;
    this.chat.setActive(c._id);

    this.threadLoading.set(true);
    this.chat
      .loadThread(c._id)
      .catch((err) => this.fail('Could not load messages', err?.error?.message))
      .finally(() => {
        this.threadLoading.set(false);
        this.scrollToBottom();
      });
  }

  back(): void {
    this.chat.setActive(null);
    this.selected.set(null);
  }

  // ---------------- composing ----------------

  onInput(): void {
    const id = this.selected()?._id;
    if (id && this.draft.trim()) this.chat.notifyTyping(id);
  }

  onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.shiftKey) return; // newline
    e.preventDefault();
    void this.send();
  }

  async send(): Promise<void> {
    const convo = this.selected();
    const text = this.draft.trim();
    if (!convo || !text || this.sending()) return;

    this.sending.set(true);
    this.stickToBottom = true;
    try {
      await this.chat.send(convo._id, text);
      this.draft = '';
    } catch (err) {
      this.fail('Message not sent', (err as Error).message);
    } finally {
      this.sending.set(false);
    }
  }

  async loadOlder(): Promise<void> {
    const id = this.selected()?._id;
    const el = this.scroller?.nativeElement;
    if (!id || this.loadingOlder()) return;

    const before = el?.scrollHeight ?? 0;
    this.loadingOlder.set(true);
    this.stickToBottom = false;
    try {
      await this.chat.loadOlder(id);
      // keep the viewport anchored on what the user was reading
      queueMicrotask(() => {
        if (el) el.scrollTop = el.scrollHeight - before;
      });
    } catch (err) {
      this.fail('Could not load earlier messages', (err as { error?: { message?: string } })?.error?.message);
    } finally {
      this.loadingOlder.set(false);
    }
  }

  onScroll(): void {
    const el = this.scroller?.nativeElement;
    if (!el) return;
    this.stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // ---------------- view helpers ----------------

  isMine(m: ChatMessage): boolean {
    return m.sender === this.meId();
  }

  /** Start a new visual group when the sender changes or 5+ minutes passed. */
  showTime(index: number): boolean {
    const list = this.messages();
    if (index === 0) return true;
    const gap =
      new Date(list[index].createdAt).getTime() -
      new Date(list[index - 1].createdAt).getTime();
    return gap > 5 * 60 * 1000 || list[index].sender !== list[index - 1].sender;
  }

  fullName(u: ChatUser | null): string {
    return u ? `${u.firstName} ${u.lastName}`.trim() : 'Unknown user';
  }

  initials(u: ChatUser | null): string {
    if (!u) return '?';
    return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
  }

  preview(c: Conversation): string {
    if (!c.lastMessage) return 'No messages yet';
    return (c.lastMessage.sender === this.meId() ? 'You: ' : '') + c.lastMessage.text;
  }

  openProfile(u: ChatUser | null): void {
    if (u) this.router.navigate(['/main/profile', u._id]);
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      const el = this.scroller?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  private fail(summary: string, detail?: string): void {
    this.toasts.add({
      severity: 'error',
      summary,
      detail: detail ?? 'Something went wrong',
    });
  }
}
