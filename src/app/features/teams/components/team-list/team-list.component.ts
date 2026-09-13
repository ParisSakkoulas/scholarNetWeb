import { Component, inject, OnInit, signal } from '@angular/core';
import { Team } from '../../models/team.model';
import { TeamsService } from '../../services/teams.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TeamFormComponent } from '../team-form/team-form.component';

import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-team-list',
  imports: [CommonModule, TeamFormComponent, ButtonModule],
  templateUrl: './team-list.component.html',
  styleUrl: './team-list.component.css',
})
export class TeamListComponent implements OnInit {
  teams = signal<Team[]>([]);
  loading = signal(true);
  showCreateModal = signal(false);

  private teamsService = inject(TeamsService);
  private router = inject(Router);

  ngOnInit(): void {
    this.fetchTeams();
  }

  fetchTeams(): void {
    this.loading.set(true);
    this.teamsService.getMyTeams().subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openTeam(teamId: string): void {
    this.router.navigate(['/main/teams', teamId]);
  }

  onTeamCreated(team: Team): void {
    this.teams.update((list) => [team, ...list]);
    this.showCreateModal.set(false);
    this.openTeam(team._id);
  }
}
