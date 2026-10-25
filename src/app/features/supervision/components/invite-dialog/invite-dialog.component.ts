import { Component, inject, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { MessageService } from 'primeng/api';
import { UserService } from '../../../../core/services/user.service';
import { UserSearchResult } from '../../../teams/models/user-search.model';
import { Supervision } from '../../models/supervision.model';
import { SupervisionService } from '../../services/supervision.service';

interface Candidate extends UserSearchResult {
  fullName: string;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Student invites a supervisor: search by name, or type an email address. */
@Component({
  selector: 'app-invite-supervisor-dialog',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule, AutoCompleteModule],
  templateUrl: './invite-dialog.component.html',
})
export class InviteSupervisorDialogComponent {
  private readonly service = inject(SupervisionService);
  private readonly users = inject(UserService);
  private readonly messages = inject(MessageService);

  readonly visible = model(false);
  readonly invited = output<Supervision>();

  title = '';
  /** a picked user, or the raw text typed in the box */
  selection: Candidate | string | null = null;

  readonly suggestions = signal<Candidate[]>([]);
  readonly sending = signal(false);

  searchUsers(event: AutoCompleteCompleteEvent): void {
    this.users.search(event.query).subscribe({
      next: (list) =>
        this.suggestions.set(
          list.map((u) => ({
            ...u,
            fullName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username,
          })),
        ),
      error: () => this.suggestions.set([]),
    });
  }

  get typedEmail(): string | null {
    return typeof this.selection === 'string' && EMAIL_RX.test(this.selection.trim())
      ? this.selection.trim()
      : null;
  }

  get picked(): Candidate | null {
    return this.selection && typeof this.selection === 'object' ? this.selection : null;
  }

  get canSend(): boolean {
    return this.title.trim().length >= 3 && (!!this.picked || !!this.typedEmail);
  }

  send(): void {
    if (!this.canSend) return;
    this.sending.set(true);
    this.service
      .invite({
        title: this.title.trim(),
        ...(this.picked ? { supervisorId: this.picked._id } : { email: this.typedEmail! }),
      })
      .subscribe({
        next: (supervision) => {
          this.sending.set(false);
          this.messages.add({
            severity: 'success',
            summary: 'Invitation sent',
            detail: this.picked
              ? `${this.picked.fullName} will be notified.`
              : 'They will get an email and can answer after signing up.',
          });
          this.invited.emit(supervision);
          this.reset();
        },
        error: (err) => {
          this.sending.set(false);
          this.messages.add({ severity: 'error', summary: 'Could not send the invitation', detail: err?.error?.message });
        },
      });
  }

  private reset(): void {
    this.title = '';
    this.selection = null;
    this.suggestions.set([]);
    this.visible.set(false);
  }
}
