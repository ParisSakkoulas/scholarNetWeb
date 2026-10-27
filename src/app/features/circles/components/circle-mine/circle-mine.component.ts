import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { MyCircle, STAGE_LABEL, isGoalOpen } from '../../models/circle.model';
import { CirclesService } from '../../services/circles.service';

/** "2d 4h", "3h 12m", "5m 20s" or "now". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

/** My circles, each with its next session and a live countdown. */
@Component({
  selector: 'app-circle-mine',
  standalone: true,
  imports: [DatePipe, RouterLink, ButtonModule, SkeletonModule, TagModule],
  templateUrl: './circle-mine.component.html',
})
export class CircleMineComponent implements OnInit, OnDestroy {
  private readonly service = inject(CirclesService);

  readonly items = signal<MyCircle[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  /** ticks every second so the countdowns stay live */
  readonly now = signal(Date.now());
  private timer?: ReturnType<typeof setInterval>;

  readonly stageLabel = STAGE_LABEL;

  ngOnInit(): void {
    this.load();
    this.timer = setInterval(() => this.now.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.service.mine().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  countdown(item: MyCircle): string {
    const next = item.nextSession;
    if (!next) return '';
    const start = new Date(next.startsAt).getTime();
    if (this.now() >= start) return 'In progress';
    return `Starts in ${formatCountdown(start - this.now())}`;
  }

  goalOpen(item: MyCircle): boolean {
    return !!item.nextSession && item.myStatus === 'active' && isGoalOpen(item.nextSession, this.now());
  }
}
