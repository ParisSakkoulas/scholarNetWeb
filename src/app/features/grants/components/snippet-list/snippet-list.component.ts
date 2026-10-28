import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { Team } from '../../../teams/models/team.model';
import { TeamsService } from '../../../teams/services/teams.service';
import { SNIPPET_TYPE_LABEL, SNIPPET_TYPE_OPTIONS, Snippet } from '../../models/snippet.model';
import { SnippetsService } from '../../services/snippets.service';
import { copyText } from '../../utils/copy-text';
import { SnippetFormComponent } from '../snippet-form/snippet-form.component';

/** The snippet library: reusable text for applications, personal or shared with a team. */
@Component({
  selector: 'app-snippet-list',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    SnippetFormComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './snippet-list.component.html',
})
export class SnippetListComponent implements OnInit, OnDestroy {
  private readonly service = inject(SnippetsService);
  private readonly teamsService = inject(TeamsService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  readonly items = signal<Snippet[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly formOpen = signal(false);
  readonly editing = signal<Snippet | null>(null);
  readonly copiedId = signal<string | null>(null);

  search = '';
  type = '';
  scope = '';
  private typing?: ReturnType<typeof setTimeout>;

  readonly typeChoices = [{ label: 'Any type', value: '' }, ...SNIPPET_TYPE_OPTIONS];
  readonly scopeChoices = signal<{ label: string; value: string }[]>([
    { label: 'Mine and my teams\'', value: '' },
    { label: 'Only mine', value: 'personal' },
    { label: 'All my teams', value: 'team' },
  ]);
  readonly typeLabel = SNIPPET_TYPE_LABEL;

  get hasFilters(): boolean {
    return !!(this.search.trim() || this.type || this.scope);
  }

  ngOnInit(): void {
    this.load();
    this.teamsService.getMyTeams().subscribe({
      next: (teams: Team[]) =>
        this.scopeChoices.update((c) => [...c, ...teams.map((t) => ({ label: `Team: ${t.name}`, value: t._id }))]),
      error: () => {
        /* the filter just has fewer choices */
      },
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.typing);
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.service.list({ search: this.search, type: this.type, scope: this.scope }).subscribe({
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

  onSelect(): void {
    queueMicrotask(() => this.load());
  }

  onType(): void {
    clearTimeout(this.typing);
    this.typing = setTimeout(() => this.load(), 350);
  }

  clear(): void {
    this.search = this.type = this.scope = '';
    this.load();
  }

  async copy(s: Snippet): Promise<void> {
    const ok = await copyText(s.content);
    if (ok) {
      this.copiedId.set(s._id);
      setTimeout(() => this.copiedId.set(null), 2000);
      this.messages.add({ severity: 'success', summary: 'Copied', detail: `"${s.title}" is on your clipboard.` });
    } else {
      this.messages.add({ severity: 'warn', summary: 'Could not copy', detail: 'Select the text and copy it by hand.' });
    }
  }

  onSaved(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved' });
    this.load();
  }

  confirmDelete(s: Snippet): void {
    this.confirmation.confirm({
      header: 'Delete snippet',
      message: `Delete "${s.title}"? ${s.teamId ? 'Your team loses it too.' : ''}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () =>
        this.service.remove(s._id).subscribe({
          next: () => this.load(),
          error: (err) =>
            this.messages.add({ severity: 'error', summary: 'Could not delete', detail: err?.error?.message ?? 'Something went wrong' }),
        }),
    });
  }
}
