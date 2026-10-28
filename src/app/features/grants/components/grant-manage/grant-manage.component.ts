import { Component, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { PageQuery } from '../../../../shared/models/page-query';
import {
  toTableColumns,
  toTableConfig,
} from '../../../../shared/utils/collection-blueprints-helpers/collection-blueprint.adapters';
import { grantsManageBlueprint } from '../../configs/grants-manage.blueprint';
import { GrantCall, GrantStatus } from '../../models/grant.model';
import { GrantsService } from '../../services/grants.service';
import { GrantFormComponent } from '../grant-form/grant-form.component';

/** Moderator screen: review submissions, and add, edit or remove calls. Admins only. */
@Component({
  selector: 'app-grant-manage',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    SelectButtonModule,
    TextareaModule,
    GenericTableComponent,
    GrantFormComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './grant-manage.component.html',
})
export class GrantManageComponent {
  private readonly service = inject(GrantsService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  private readonly table = viewChild.required(GenericTableComponent);

  readonly status = signal<GrantStatus | ''>('pending');
  readonly statusTabs: { label: string; value: GrantStatus | '' }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: '' },
  ];

  readonly formMode = signal<'create' | null>(null);
  readonly editing = signal<GrantCall | null>(null);
  readonly rejecting = signal<GrantCall | null>(null);
  rejectNote = '';

  readonly columns = toTableColumns(grantsManageBlueprint);
  readonly config = toTableConfig(grantsManageBlueprint);

  /** The table asks for pages; the status tab is read at that moment. */
  readonly fetchPage = (query: PageQuery) => this.service.manage(query, this.status());

  readonly rowActions = [
    { icon: 'pi pi-arrow-right', label: 'Open', handler: (row: GrantCall) => this.router.navigate(['/main/grants', row._id]) },
    { icon: 'pi pi-check', label: 'Approve', handler: (row: GrantCall) => this.approve(row) },
    { icon: 'pi pi-times', label: 'Reject', handler: (row: GrantCall) => this.askReject(row) },
    { icon: 'pi pi-pencil', label: 'Edit', handler: (row: GrantCall) => this.editing.set(row) },
    { icon: 'pi pi-trash', label: 'Delete', handler: (row: GrantCall) => this.confirmDelete(row) },
  ];

  setStatus(value: GrantStatus | '' | null): void {
    if (value === null) return;
    this.status.set(value);
    this.table().reload();
  }

  private fail(summary: string, err: any): void {
    this.messages.add({ severity: 'error', summary, detail: err?.error?.message ?? 'Something went wrong' });
  }

  private onlyPending(row: GrantCall): boolean {
    if (row.status === 'pending') return true;
    this.messages.add({ severity: 'info', summary: 'Not pending', detail: 'Only pending submissions can be approved or rejected.' });
    return false;
  }

  approve(row: GrantCall): void {
    if (!this.onlyPending(row)) return;
    this.service.review(row._id, 'approve').subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Call approved', detail: row.title });
        this.table().reload();
      },
      error: (err) => this.fail('Could not approve', err),
    });
  }

  askReject(row: GrantCall): void {
    if (!this.onlyPending(row)) return;
    this.rejectNote = '';
    this.rejecting.set(row);
  }

  reject(): void {
    const row = this.rejecting();
    if (!row) return;
    this.service.review(row._id, 'reject', this.rejectNote.trim() || undefined).subscribe({
      next: () => {
        this.rejecting.set(null);
        this.messages.add({ severity: 'info', summary: 'Call rejected', detail: row.title });
        this.table().reload();
      },
      error: (err) => this.fail('Could not reject', err),
    });
  }

  onSaved(): void {
    this.formMode.set(null);
    this.editing.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved' });
    this.table().reload();
  }

  private confirmDelete(row: GrantCall): void {
    this.confirmation.confirm({
      header: 'Delete call',
      message: `Delete "${row.title}"? This can't be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () =>
        this.service.remove(row._id).subscribe({
          next: () => this.table().reload(),
          error: (err) => this.fail('Could not delete', err),
        }),
    });
  }
}
