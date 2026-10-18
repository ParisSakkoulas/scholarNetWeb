import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { map } from 'rxjs';

import {
  PUBLICATION_TYPE_LABEL,
  Publication,
  PublicationType,
} from '../../../core/models/publication.model';
import { PublicationsService } from '../../../core/services/publications.service';
import { GenericTableComponent } from '../../../shared/components/generic-table/generic-table.component';
import { PageQuery } from '../../../shared/models/page-query';
import {
  toTableColumns,
  toTableConfig,
} from '../../../shared/utils/collection-blueprints-helpers/collection-blueprint.adapters';
import { AuthService } from '../../../core/services/auth.service';
import { publicationsBlueprint } from '../configs/publications.blueprint';
import { PublicationFormComponent } from '../publication-form/publication-form.component';

type Scope = 'mine' | 'all';

@Component({
  selector: 'app-publication-list',
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule,
    SelectButtonModule,
    ConfirmDialogModule,
    ToastModule,
    GenericTableComponent,
    PublicationFormComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './publication-list.component.html',
})
export class PublicationListComponent {
  private readonly service = inject(PublicationsService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly auth = inject(AuthService);

  private readonly tableRef = viewChild.required(GenericTableComponent);

  readonly columns = toTableColumns(publicationsBlueprint);
  readonly config = toTableConfig(publicationsBlueprint);

  readonly scope = signal<Scope>('mine');
  readonly typeFilter = signal<PublicationType | null>(null);
  readonly showCreate = signal(false);
  readonly editing = signal<Publication | null>(null);

  readonly scopeOptions = [
    { label: 'My publications', value: 'mine' },
    { label: 'Discover', value: 'all' },
  ];
  readonly typeOptions = Object.entries(PUBLICATION_TYPE_LABEL).map(
    ([value, label]) => ({ value, label }),
  );

  /** Same function reference for the table's lifetime; it reads the current filters when called. */
  readonly fetchPage = (query: PageQuery) => {
    const filters = {
      page: query.page,
      limit: query.pageSize,
      q: query.search,
      type: this.typeFilter(),
    };
    const request$ =
      this.scope() === 'mine'
        ? this.service.mine(filters)
        : this.service.search(filters);
    return request$.pipe(map((r) => ({ data: r.data, total: r.total })));
  };

  readonly actions = computed(() => {
    const open = {
      icon: 'pi pi-arrow-right',
      label: 'Open',
      handler: (row: Publication) => this.open(row._id),
    };
    if (this.scope() === 'all') return [open];
    return [
      open,
      {
        icon: 'pi pi-pencil',
        label: 'Edit',
        handler: (row: Publication) => this.editing.set(row),
      },
      {
        icon: 'pi pi-trash',
        label: 'Delete',
        handler: (row: Publication) => this.confirmDelete(row),
      },
    ];
  });

  /** the form created a publication but is still open (a reference step failed) */
  refreshTable(): void {
    this.tableRef().reload();
  }

  onScopeChange(scope: Scope): void {
    this.scope.set(scope);
    this.reloadFromStart();
  }

  onTypeChange(type: PublicationType | null): void {
    this.typeFilter.set(type);
    this.reloadFromStart();
  }

  open(id: string): void {
    this.router.navigate(['/main/publications', id]);
  }

  onCreated(pub: Publication): void {
    this.showCreate.set(false);
    this.messages.add({ severity: 'success', summary: 'Publication added', detail: pub.title });
    this.tableRef().reload();
  }

  onUpdated(pub: Publication): void {
    this.editing.set(null);
    this.messages.add({ severity: 'success', summary: 'Publication updated', detail: pub.title });
    this.tableRef().reload();
  }

  private confirmDelete(pub: Publication): void {
    this.confirmation.confirm({
      header: 'Delete publication',
      message: `Delete "${pub.title}"? This can't be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary' },
      accept: () =>
        this.service.remove(pub._id).subscribe({
          next: () => this.tableRef().reload(),
          error: (err) =>
            this.messages.add({
              severity: 'error',
              summary: 'Could not delete',
              detail: err?.error?.message ?? 'Something went wrong',
            }),
        }),
    });
  }

  /** Filters changed: the table keeps its page, so remount it to start at page 1. */
  private reloadFromStart(): void {
    this.tableKey.update((k) => k + 1);
  }
  readonly tableKey = signal(0);
}
