import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import {
  Circle,
  CircleStage,
  CircleVisibility,
  STAGE_LABEL,
  STAGE_OPTIONS,
  WEEKDAY_OPTIONS,
  personName,
} from '../../models/circle.model';
import { CirclesService } from '../../services/circles.service';
import { CircleFormComponent, browserTimezone } from '../circle-form/circle-form.component';

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];
const DEFAULT_PAGE_SIZE = 12;

/** Browse open circles, filter them, and join (or ask to join) one. */
@Component({
  selector: 'app-circle-browse',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    CircleFormComponent,
  ],
  templateUrl: './circle-browse.component.html',
})
export class CircleBrowseComponent implements OnInit, OnDestroy {
  private readonly service = inject(CirclesService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  readonly items = signal<Circle[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly joining = signal<string | null>(null);
  readonly formOpen = signal(false);

  field = '';
  stage: CircleStage | '' = '';
  visibility: CircleVisibility | '' = '';
  /** '' = every zone, 'mine' = circles that meet in the browser's zone */
  zone: '' | 'mine' = '';

  readonly stageOptions = [{ label: 'Any stage', value: '' }, ...STAGE_OPTIONS];
  readonly visibilityOptions = [
    { label: 'Public and invite-only', value: '' },
    { label: 'Public', value: 'public' },
    { label: 'Invite-only', value: 'invite' },
  ];
  readonly zoneOptions = [
    { label: 'Any time zone', value: '' },
    { label: `My time zone (${browserTimezone()})`, value: 'mine' },
  ];

  readonly stageLabel = STAGE_LABEL;
  readonly personName = personName;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  /** Index of the first row shown, as the PrimeNG paginator wants it. */
  readonly first = computed(() => (this.page() - 1) * this.pageSize());

  /** Page changed or "rows per page" picked. */
  onPage(event: PaginatorState): void {
    this.pageSize.set(event.rows ?? DEFAULT_PAGE_SIZE);
    this.page.set((event.page ?? 0) + 1);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private typing?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    clearTimeout(this.typing);
  }

  /** Selects apply straight away (the model is updated first, hence the microtask). */
  onFilterChange(): void {
    queueMicrotask(() => this.search());
  }

  /** Typing waits a moment so every key press is not a request. */
  onFieldInput(): void {
    clearTimeout(this.typing);
    this.typing = setTimeout(() => this.search(), 350);
  }

  clearFilters(): void {
    this.field = '';
    this.stage = '';
    this.visibility = '';
    this.zone = '';
    this.search();
  }

  get hasFilters(): boolean {
    return !!(this.field.trim() || this.stage || this.visibility || this.zone);
  }

  search(): void {
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.service
      .browse({
        field: this.field.trim(),
        stage: this.stage,
        visibility: this.visibility,
        timezone: this.zone === 'mine' ? browserTimezone() : '',
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }

  isFull(c: Circle): boolean {
    return (c.memberCount ?? 0) >= c.maxMembers;
  }

  scheduleText(c: Circle): string {
    const day = WEEKDAY_OPTIONS.find((d) => d.value === c.schedule.weekday)?.label ?? '';
    return `${day}s, ${c.schedule.time} (${c.schedule.timezone}), ${c.schedule.durationMin} min`;
  }

  join(c: Circle): void {
    this.joining.set(c._id);
    this.service.join(c._id).subscribe({
      next: () => {
        this.joining.set(null);
        const request = c.visibility === 'invite';
        this.messages.add({
          severity: 'success',
          summary: request ? 'Request sent' : 'You joined the circle',
          detail: request ? 'The owner will review it.' : c.name,
        });
        this.load();
      },
      error: (err) => {
        this.joining.set(null);
        this.messages.add({
          severity: 'error',
          summary: 'Could not join',
          detail: err?.error?.message ?? 'Something went wrong',
        });
        this.load();
      },
    });
  }

  onCreated(circle: Circle): void {
    this.formOpen.set(false);
    this.messages.add({ severity: 'success', summary: 'Circle created', detail: circle.name });
    this.router.navigate(['/main/circles', circle._id]);
  }
}
