import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
import { SkeletonModule } from 'primeng/skeleton';

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
    SkeletonModule,
    ProjectFormComponent,
  ],
  templateUrl: './team-detail.component.html',
})
export class TeamDetailComponent {
  team = signal<Team | null>(null);
  projects = signal<Project[]>([]);
  loading = signal(true);
  showProjectModal = signal(false);

  teamId!: string;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teamsService = inject(TeamsService);
  private projectsService = inject(ProjectsService);

  ngOnInit(): void {
    this.teamId = this.route.snapshot.paramMap.get('teamId')!;
    this.fetchTeam();
    this.fetchProjects();
  }

  fetchTeam(): void {
    this.teamsService
      .getTeam(this.teamId)
      .subscribe((team) => this.team.set(team));
  }

  fetchProjects(): void {
    this.loading.set(true);
    this.projectsService.getForTeam(this.teamId).subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openProject(projectId: string): void {
    this.router.navigate(['/main/projects', projectId]);
  }

  goToMembers(): void {
    this.router.navigate(['/main/teams', this.teamId, 'members']);
  }

  onProjectCreated(project: Project): void {
    this.projects.update((list) => [project, ...list]);
    this.showProjectModal.set(false);
  }
}
