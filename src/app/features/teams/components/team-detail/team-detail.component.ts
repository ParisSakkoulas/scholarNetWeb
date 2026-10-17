import { CommonModule } from '@angular/common';
import { Component, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectFormComponent } from '../project-form/project-form.component';
import { Project } from '../../models/project.model';
import { Team } from '../../models/team.model';
import { ProjectsService } from '../../services/projects.service';
import { TeamsService } from '../../services/teams.service';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { PageQuery } from '../../../../shared/models/page-query';
import {
  toTableColumns,
  toTableConfig,
} from '../../../../shared/utils/collection-blueprints-helpers/collection-blueprint.adapters';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { projectsBlueprint } from '../../configs/projects.blueprint';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    AvatarModule,
    CardModule,
    TagModule,
    ProjectFormComponent,
    GenericTableComponent,
  ],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.css',
})
export class TeamDetailComponent {
  team = signal<Team | null>(null);
  showProjectModal = signal(false);

  teamId!: string;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teamsService = inject(TeamsService);
  private projectsService = inject(ProjectsService);

  private readonly table = viewChild.required(GenericTableComponent);

  readonly columns = toTableColumns(projectsBlueprint);
  readonly config = toTableConfig(projectsBlueprint);

  // teamId is read in ngOnInit, so fetchPage is only assigned once it's known —
  // see the comment on the property below.
  fetchPage!: (
    query: PageQuery,
  ) => ReturnType<ProjectsService['getForTeamPage']>;

  readonly rowActions = [
    {
      icon: 'pi pi-arrow-right',
      label: 'Open',
      handler: (row: Project) => this.openProject(row._id),
    },
  ];

  ngOnInit(): void {
    this.teamId = this.route.snapshot.paramMap.get('teamId')!;
    this.fetchPage = (query: PageQuery) =>
      this.projectsService.getForTeamPage(this.teamId, query);
    this.fetchTeam();
  }

  fetchTeam(): void {
    this.teamsService
      .getTeam(this.teamId)
      .subscribe((team) => this.team.set(team));
  }

  openProject(projectId: string): void {
    this.router.navigate(['/main/projects', projectId]);
  }

  goToMembers(): void {
    this.router.navigate(['/main/teams', this.teamId, 'members']);
  }

  initials(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }

  visibilitySeverity(visibility: string): 'success' | 'secondary' {
    return visibility === 'public' ? 'success' : 'secondary';
  }

  onProjectCreated(_project: Project): void {
    this.showProjectModal.set(false);
    this.table().reload();
  }
}
