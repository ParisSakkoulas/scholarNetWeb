import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { Team } from '../../models/team.model';
import { TeamsService } from '../../services/teams.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TeamFormComponent } from '../team-form/team-form.component';

import { ButtonModule } from 'primeng/button';
import { PageQuery } from '../../../../shared/models/page-query';
import {
  toTableColumns,
  toTableConfig,
} from '../../../../shared/utils/collection-blueprints-helpers/collection-blueprint.adapters';
import { teamsBlueprint } from '../../configs/teams.blueprint';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-team-list',
  imports: [
    TeamFormComponent,
    ButtonModule,
    GenericTableComponent,
    ConfirmDialogModule,
  ],
  templateUrl: './team-list.component.html',
  styleUrl: './team-list.component.css',
  providers: [ConfirmationService],
})
export class TeamListComponent {
  private teamsService = inject(TeamsService);
  private router = inject(Router);
  private confirmation = inject(ConfirmationService);

  // reference to the table so edit/delete can trigger a refetch after they finish
  private readonly table = viewChild.required(GenericTableComponent);

  showCreateModal = signal(false);
  editingTeam = signal<Team | null>(null);

  readonly columns = toTableColumns(teamsBlueprint);
  readonly config = toTableConfig(teamsBlueprint);

  readonly fetchPage = (
    query: PageQuery,
  ): ReturnType<TeamsService['getMyTeamsPage']> =>
    this.teamsService.getMyTeamsPage(query);

  readonly rowActions = [
    {
      icon: 'pi pi-arrow-right',
      label: 'Open',
      handler: (row: Team) => this.openTeam(row._id),
    },
    {
      icon: 'pi pi-pencil',
      label: 'Edit',
      handler: (row: Team) => this.editingTeam.set(row),
    },
    {
      icon: 'pi pi-trash',
      label: 'Delete',
      handler: (row: Team) => this.confirmDelete(row),
    },
  ];

  openTeam(teamId: string): void {
    this.router.navigate(['/main/teams', teamId]);
  }

  onTeamCreated(team: Team): void {
    this.showCreateModal.set(false);
    this.openTeam(team._id);
  }

  onTeamUpdated(): void {
    this.editingTeam.set(null);
    this.table().reload();
  }

  private confirmDelete(team: Team): void {
    this.confirmation.confirm({
      header: 'Delete team',
      message: `Delete "${team.name}"? This can't be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary' },
      accept: () =>
        this.teamsService
          .deleteTeam(team._id)
          .subscribe(() => this.table().reload()),
    });
  }
}
