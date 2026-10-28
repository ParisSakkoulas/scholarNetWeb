import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { SNIPPET_TYPE_LABEL, SNIPPET_TYPE_OPTIONS, Snippet } from '../../models/snippet.model';
import { SnippetsService } from '../../services/snippets.service';
import { copyText } from '../../utils/copy-text';

/** Inside a proposal section: pick a snippet and copy it, to paste into your own document. */
@Component({
  selector: 'app-snippet-picker',
  standalone: true,
  imports: [FormsModule, RouterLink, ButtonModule, DialogModule, InputTextModule, SelectModule, SkeletonModule, TagModule],
  templateUrl: './snippet-picker.component.html',
})
export class SnippetPickerComponent implements OnInit {
  /** The proposal's team, so its shared snippets are offered next to the personal ones. */
  @Input() teamId: string | null = null;
  /** The section being worked on, only shown in the title. */
  @Input() sectionTitle = '';
  @Output() closed = new EventEmitter<void>();

  private readonly service = inject(SnippetsService);
  private readonly messages = inject(MessageService);

  readonly all = signal<Snippet[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly copiedId = signal<string | null>(null);
  readonly search = signal('');
  readonly type = signal('');

  readonly typeChoices = [{ label: 'Any type', value: '' }, ...SNIPPET_TYPE_OPTIONS];
  readonly typeLabel = SNIPPET_TYPE_LABEL;

  /** Personal snippets and this proposal's team's, narrowed by the search and the type. */
  readonly shown = computed(() => {
    const q = this.search().trim().toLowerCase();
    const t = this.type();
    return this.all().filter(
      (s) =>
        (!s.teamId || s.teamId._id === this.teamId) &&
        (!t || s.type === t) &&
        (!q || s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)),
    );
  });

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (list) => {
        this.all.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  async copy(s: Snippet): Promise<void> {
    const ok = await copyText(s.content);
    if (ok) {
      this.copiedId.set(s._id);
      setTimeout(() => this.copiedId.set(null), 2000);
      this.messages.add({ severity: 'success', summary: 'Copied', detail: 'Paste it into your draft.' });
    } else {
      this.messages.add({ severity: 'warn', summary: 'Could not copy', detail: 'Select the text and copy it by hand.' });
    }
  }
}
