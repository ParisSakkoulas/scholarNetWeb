import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CircleSession,
  RESULT_LABEL,
  SessionEntry,
  SessionResult,
  isCheckoutOpen,
  isGoalOpen,
  personId,
  personName,
} from '../../models/circle.model';
import { CirclesService } from '../../services/circles.service';
import { formatCountdown } from '../circle-mine/circle-mine.component';

/** The timer runs in the browser only. Every round is at least this long, with no upper limit. */
export const MIN_ROUND_MINUTES = 20;
const DEFAULT_ROUND_MINUTES = 25;
const DEFAULT_ROUNDS = 3;
const TIMER_STORAGE_KEY = 'circle-timer-settings';

/** One session: everyone's goal, my goal form, the silent-writing timer and my checkout. */
@Component({
  selector: 'app-circle-session-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
  ],
  templateUrl: './session-page.component.html',
})
export class SessionPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(CirclesService);
  private readonly messages = inject(MessageService);
  private readonly auth = inject(AuthService);

  circleId!: string;
  sessionId!: string;

  readonly session = signal<CircleSession | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly now = signal(Date.now());

  goalText = '';
  result: SessionResult = 'done';
  note = '';

  // ---- timer ----
  readonly round = signal(1);
  readonly roundMinutes = signal(DEFAULT_ROUND_MINUTES);
  readonly rounds = signal(DEFAULT_ROUNDS);
  readonly remaining = signal(DEFAULT_ROUND_MINUTES * 60);
  readonly running = signal(false);
  readonly minRoundMinutes = MIN_ROUND_MINUTES;
  private tick?: ReturnType<typeof setInterval>;
  private clock?: ReturnType<typeof setInterval>;

  readonly resultOptions = (Object.keys(RESULT_LABEL) as SessionResult[]).map((value) => ({
    value,
    label: RESULT_LABEL[value],
  }));
  readonly resultLabel = RESULT_LABEL;
  readonly personName = personName;
  readonly personId = personId;

  private readonly myId = computed(() => this.auth.currentUser()?.id ?? null);

  readonly myEntry = computed<SessionEntry | null>(() => {
    const id = this.myId();
    return this.session()?.entries.find((e) => !!id && personId(e.userId) === id) ?? null;
  });
  readonly goalOpen = computed(() => !!this.session() && isGoalOpen(this.session()!, this.now()));
  readonly checkoutOpen = computed(() => !!this.session() && isCheckoutOpen(this.session()!, this.now()));
  readonly countdown = computed(() => {
    const s = this.session();
    if (!s) return '';
    const start = new Date(s.startsAt).getTime();
    return this.now() >= start ? '' : `Starts in ${formatCountdown(start - this.now())}`;
  });

  ngOnInit(): void {
    this.circleId = this.route.snapshot.paramMap.get('id')!;
    this.sessionId = this.route.snapshot.paramMap.get('sid')!;
    this.clock = setInterval(() => this.now.set(Date.now()), 1000);
    this.restoreTimerSettings();
    this.load();
  }

  ngOnDestroy(): void {
    clearInterval(this.tick);
    clearInterval(this.clock);
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.session(this.circleId, this.sessionId).subscribe({
      next: (s) => {
        this.apply(s);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.error?.message ?? 'Could not load this session');
        this.loading.set(false);
      },
    });
  }

  /** The list endpoint populates users; the write endpoints return raw ids, so reload after writes. */
  private apply(s: CircleSession): void {
    this.session.set(s);
    const mine = this.myEntry();
    if (mine?.goal && !this.goalText) this.goalText = mine.goal;
    if (mine?.result) this.result = mine.result;
    if (mine?.note && !this.note) this.note = mine.note;
  }

  private fail(summary: string, err: any): void {
    this.saving.set(false);
    const message = err?.error?.message;
    this.messages.add({
      severity: 'error',
      summary,
      detail: Array.isArray(message) ? message.join('. ') : (message ?? 'Something went wrong'),
    });
  }

  saveGoal(): void {
    const goal = this.goalText.trim();
    if (!goal) return;
    this.saving.set(true);
    this.service.setGoal(this.circleId, this.sessionId, goal).subscribe({
      next: () => {
        this.saving.set(false);
        this.messages.add({ severity: 'success', summary: 'Goal saved' });
        this.load();
      },
      error: (err) => this.fail('Could not save the goal', err),
    });
  }

  saveCheckout(): void {
    this.saving.set(true);
    this.service.checkout(this.circleId, this.sessionId, this.result, this.note.trim() || undefined).subscribe({
      next: () => {
        this.saving.set(false);
        this.messages.add({ severity: 'success', summary: 'Checked out. Well done!' });
        this.load();
      },
      error: (err) => this.fail('Could not check out', err),
    });
  }

  // ---------------- timer ----------------

  /** Settings are a per-person convenience: kept in the browser, and the page works without them. */
  private restoreTimerSettings(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) ?? 'null');
      if (saved) {
        this.roundMinutes.set(Math.max(MIN_ROUND_MINUTES, Math.floor(Number(saved.minutes)) || DEFAULT_ROUND_MINUTES));
        this.rounds.set(Math.max(1, Math.floor(Number(saved.rounds)) || DEFAULT_ROUNDS));
        this.remaining.set(this.roundMinutes() * 60);
      }
    } catch {
      /* private window or blocked storage: keep the defaults */
    }
  }

  /** Edit the round length (never below 20 minutes) or the number of rounds; only while stopped. */
  setTimer(minutes: number | null, rounds: number | null): void {
    if (this.running()) return;
    if (minutes !== null) {
      this.roundMinutes.set(Math.max(MIN_ROUND_MINUTES, Math.floor(minutes) || MIN_ROUND_MINUTES));
    }
    if (rounds !== null) this.rounds.set(Math.max(1, Math.floor(rounds) || 1));
    this.round.set(1);
    this.remaining.set(this.roundMinutes() * 60);
    try {
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({ minutes: this.roundMinutes(), rounds: this.rounds() }),
      );
    } catch {
      /* ignore */
    }
  }

  clockText(): string {
    const h = Math.floor(this.remaining() / 3600);
    const m = Math.floor((this.remaining() % 3600) / 60);
    const s = this.remaining() % 60;
    const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return h ? `${h}:${mmss}` : mmss;
  }

  startTimer(): void {
    if (this.running()) return;
    this.running.set(true);
    this.tick = setInterval(() => {
      const left = this.remaining() - 1;
      if (left > 0) return this.remaining.set(left);
      // round finished
      if (this.round() >= this.rounds()) {
        this.stopTimer();
        this.remaining.set(0);
        this.messages.add({ severity: 'success', summary: 'All rounds done', detail: 'Time to check out.' });
      } else {
        this.round.update((r) => r + 1);
        this.remaining.set(this.roundMinutes() * 60);
        this.messages.add({ severity: 'info', summary: `Round ${this.round()} of ${this.rounds()}` });
      }
    }, 1000);
  }

  stopTimer(): void {
    clearInterval(this.tick);
    this.running.set(false);
  }

  resetTimer(): void {
    this.stopTimer();
    this.round.set(1);
    this.remaining.set(this.roundMinutes() * 60);
  }
}
