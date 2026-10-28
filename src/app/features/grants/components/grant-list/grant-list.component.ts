import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CAREER_STAGE_OPTIONS,
  CareerStage,
  DISCLAIMER,
  FUNDING_TYPE_OPTIONS,
  FundingType,
  GrantCall,
  GrantTab,
  SORT_OPTIONS,
  STATUS_META,
  amountText,
  countryOptions,
  deadlineText,
  deadlineTone,
} from '../../models/grant.model';
import { GrantsService } from '../../services/grants.service';
import { GrantFormComponent } from '../grant-form/grant-form.component';
import { GrantPreferencesComponent } from '../grant-preferences/grant-preferences.component';

type View = GrantTab | 'mine' | 'foryou';

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];
const DEFAULT_PAGE_SIZE = 12;
const iso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '');

/** The radar: browse and filter funding calls, save or dismiss them, submit a new one. */
@Component({
  selector: 'app-grant-list',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    DatePickerModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    SelectButtonModule,
    SkeletonModule,
    TagModule,
    GrantFormComponent,
    GrantPreferencesComponent,
  ],
  templateUrl: './grant-list.component.html',
})
export class GrantListComponent implements OnInit, OnDestroy {
  private readonly service = inject(GrantsService);
  private readonly messages = inject(MessageService);
  private readonly auth = inject(AuthService);

  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'admin');

  readonly view = signal<View>('all');
  readonly items = signal<GrantCall[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly formMode = signal<'create' | 'submit' | null>(null);
  readonly prefsOpen = signal(false);
  /** false until the user has saved preferences, so "For you" can ask for them */
  readonly hasPreferences = signal(true);
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

  // filters
  search = '';
  country = '';
  careerStage: CareerStage | '' = '';
  field = '';
  fundingType: FundingType | '' = '';
  range: Date[] | null = null;
  includeClosed = false;
  sort = 'deadline';
  private typing?: ReturnType<typeof setTimeout>;

  readonly tabs: { label: string; value: View }[] = [
    { label: 'Open calls', value: 'all' },
    { label: 'For you', value: 'foryou' },
    { label: 'Saved', value: 'saved' },
    { label: 'Dismissed', value: 'dismissed' },
    { label: 'My submissions', value: 'mine' },
  ];
  readonly countryChoices = [{ code: '', name: 'Any country' }, ...countryOptions()];
  readonly stageChoices = [{ label: 'Any career stage', value: '' }, ...CAREER_STAGE_OPTIONS];
  readonly typeChoices = [{ label: 'Any funding type', value: '' }, ...FUNDING_TYPE_OPTIONS];
  readonly sortChoices = SORT_OPTIONS;

  readonly disclaimer = DISCLAIMER;
  readonly statusMeta = STATUS_META;
  readonly amountText = amountText;
  readonly deadlineText = deadlineText;
  readonly deadlineTone = deadlineTone;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    clearTimeout(this.typing);
  }

  /** The filter bar belongs to the three plain lists. */
  get filtering(): boolean {
    return ['all', 'saved', 'dismissed'].includes(this.view());
  }

  /** Everything except "My submissions" is paged. */
  get paged(): boolean {
    return this.view() !== 'mine';
  }

  get hasFilters(): boolean {
    return !!(this.search.trim() || this.country || this.careerStage || this.field.trim() || this.fundingType || this.range?.[0] || this.includeClosed);
  }

  setView(view: View | null): void {
    if (!view) return;
    this.view.set(view);
    this.page.set(1);
    this.load();
  }

  apply(): void {
    this.page.set(1);
    this.load();
  }

  onSelectChange(): void {
    queueMicrotask(() => this.apply());
  }

  onType(): void {
    clearTimeout(this.typing);
    this.typing = setTimeout(() => this.apply(), 350);
  }

  clearFilters(): void {
    this.search = this.country = this.field = '';
    this.careerStage = this.fundingType = '';
    this.range = null;
    this.includeClosed = false;
    this.apply();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);

    if (this.view() === 'foryou') {
      this.service.matches(this.page(), this.pageSize()).subscribe({
        next: (res) => {
          this.hasPreferences.set(res.hasPreferences);
          this.done(res.data, res.total);
        },
        error: () => this.failed(),
      });
      return;
    }

    if (this.view() === 'mine') {
      this.service.mySubmissions().subscribe({
        next: (list) => this.done(list, list.length),
        error: () => this.failed(),
      });
      return;
    }

    this.service
      .list({
        tab: this.view() as GrantTab,
        search: this.search.trim(),
        country: this.country,
        careerStage: this.careerStage,
        field: this.field.trim(),
        fundingType: this.fundingType,
        deadlineFrom: iso(this.range?.[0] ?? null),
        deadlineTo: iso(this.range?.[1] ?? null),
        includeClosed: this.includeClosed,
        sort: this.sort,
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (res) => this.done(res.data, res.total),
        error: () => this.failed(),
      });
  }

  private done(items: GrantCall[], total: number): void {
    this.items.set(items);
    this.total.set(total);
    this.loading.set(false);
  }

  private failed(): void {
    this.loadError.set(true);
    this.loading.set(false);
  }

  // ---------------- save / dismiss ----------------

  private fail(err: any): void {
    this.messages.add({ severity: 'error', summary: 'Could not update', detail: err?.error?.message ?? 'Something went wrong' });
  }

  private setMark(call: GrantCall, mark: GrantCall['mySave']): void {
    const view = this.view();
    // a call that no longer belongs in this tab leaves the list
    const leaves = (view === 'saved' && mark !== 'saved') || (view === 'dismissed' && mark !== 'dismissed') || ((view === 'all' || view === 'foryou') && mark === 'dismissed');
    if (leaves) {
      this.items.update((l) => l.filter((c) => c._id !== call._id));
      this.total.update((t) => Math.max(0, t - 1));
    } else {
      this.items.update((l) => l.map((c) => (c._id === call._id ? { ...c, mySave: mark } : c)));
    }
  }

  toggleSave(call: GrantCall): void {
    const request$ = call.mySave === 'saved' ? this.service.unmark(call._id) : this.service.save(call._id);
    request$.subscribe({
      next: () => this.setMark(call, call.mySave === 'saved' ? null : 'saved'),
      error: (err) => this.fail(err),
    });
  }

  dismiss(call: GrantCall): void {
    this.service.dismiss(call._id).subscribe({
      next: () => {
        this.setMark(call, 'dismissed');
        this.messages.add({ severity: 'info', summary: 'Call dismissed', detail: 'Find it under the Dismissed tab.' });
      },
      error: (err) => this.fail(err),
    });
  }

  restore(call: GrantCall): void {
    this.service.unmark(call._id).subscribe({
      next: () => this.setMark(call, null),
      error: (err) => this.fail(err),
    });
  }

  // ---------------- submit ----------------

  onPreferencesSaved(): void {
    this.prefsOpen.set(false);
    this.messages.add({ severity: 'success', summary: 'Preferences saved' });
    if (this.view() === 'foryou') this.apply();
  }

  onSaved(call: GrantCall): void {
    const mode = this.formMode();
    this.formMode.set(null);
    this.messages.add({
      severity: 'success',
      summary: mode === 'submit' ? 'Submitted for review' : 'Call added',
      detail: mode === 'submit' ? 'A moderator will review it. You will be notified.' : call.title,
    });
    this.load();
  }
}
