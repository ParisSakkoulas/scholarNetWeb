import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { Team } from '../../../teams/models/team.model';
import { TeamsService } from '../../../teams/services/teams.service';
import { SNIPPET_TYPE_OPTIONS, Snippet, SnippetPayload, SnippetType } from '../../models/snippet.model';
import { SnippetsService } from '../../services/snippets.service';

/** Create or edit a snippet. Whether it is personal or shared with a team is chosen once, at creation. */
@Component({
  selector: 'app-snippet-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TextareaModule],
  templateUrl: './snippet-form.component.html',
})
export class SnippetFormComponent implements OnInit {
  @Input() snippet: Snippet | null = null;
  @Output() saved = new EventEmitter<Snippet>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SnippetsService);
  private readonly teamsService = inject(TeamsService);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly typeOptions = SNIPPET_TYPE_OPTIONS;
  readonly shareOptions = signal<{ label: string; value: string | null }[]>([{ label: 'Only me', value: null }]);

  form!: ReturnType<SnippetFormComponent['buildForm']>;

  get isEdit(): boolean {
    return !!this.snippet;
  }

  private buildForm() {
    const s = this.snippet;
    return this.fb.group({
      type: [(s?.type ?? 'bio') as SnippetType, Validators.required],
      title: [s?.title ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      content: [s?.content ?? '', [Validators.required, Validators.maxLength(5000)]],
      teamId: [null as string | null],
    });
  }

  ngOnInit(): void {
    this.form = this.buildForm();
    if (!this.isEdit) {
      this.teamsService.getMyTeams().subscribe({
        next: (teams: Team[]) =>
          this.shareOptions.set([
            { label: 'Only me', value: null },
            ...teams.map((t) => ({ label: `Share with team: ${t.name}`, value: t._id })),
          ]),
        error: () => {
          /* personal snippets still work */
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);

    const request$ = this.snippet
      ? this.service.update(this.snippet._id, { type: v.type!, title: v.title!.trim(), content: v.content! })
      : this.service.create({
          type: v.type!,
          title: v.title!.trim(),
          content: v.content!,
          ...(v.teamId ? { teamId: v.teamId } : {}),
        } as SnippetPayload);

    request$.subscribe({
      next: (snippet) => {
        this.submitting.set(false);
        this.saved.emit(snippet);
      },
      error: (err) => {
        this.submitting.set(false);
        const message = err?.error?.message;
        this.error.set(Array.isArray(message) ? message.join('. ') : (message ?? 'Something went wrong'));
      },
    });
  }
}
