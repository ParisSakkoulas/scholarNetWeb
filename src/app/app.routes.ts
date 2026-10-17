import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./shared/components/ui/public-home/public-home.component').then(
            (m) => m.PublicHomeComponent,
          ),
      },
    ],
  },

  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/components/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/components/register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },

      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/components/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },

      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/components/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },

      {
        path: 'verify-email/:token',
        loadComponent: () =>
          import('./features/auth/components/verify-email/verify-email.component').then(
            (m) => m.VerifyEmailComponent,
          ),
      },

      {
        path: 'unlock',
        loadComponent: () =>
          import('./features/auth/components/unlock-account/unlock-account.component').then(
            (m) => m.UnlockAccountComponent,
          ),
      },

      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  {
    path: 'main',
    component: MainLayoutComponent,
    children: [
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },

      {
        path: 'profile/:userId',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },

      {
        path: 'profile/:userId/edit',
        loadComponent: () =>
          import('./features/profile/edit-profile/edit-profile.component').then(
            (m) => m.EditProfileComponent,
          ),
      },

      {
        path: 'search',
        loadComponent: () =>
          import('./features/profile/profile-search/profile-search.component').then(
            (m) => m.ProfileSearchComponent,
          ),
      },

      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
      },

      // Teams
      {
        path: 'teams',
        loadComponent: () =>
          import('./features/teams/components/team-list/team-list.component').then(
            (m) => m.TeamListComponent,
          ),
      },
      {
        path: 'teams/:teamId',
        loadComponent: () =>
          import('./features/teams/components/team-detail/team-detail.component').then(
            (m) => m.TeamDetailComponent,
          ),
      },
      {
        path: 'teams/:teamId/members',
        loadComponent: () =>
          import('./features/teams/components/team-members/team-members.component').then(
            (m) => m.TeamMembersComponent,
          ),
      },

      // Projects (not nested under teams — matches your API's flat /projects/:id routes)
      {
        path: 'projects/:projectId',
        loadComponent: () =>
          import('./features/teams/components/project-board/project-board.component').then(
            (m) => m.ProjectBoardComponent,
          ),
      },
    ],
  },

  // {
  //     path: 'profile',
  //     children: [
  //         { path: '', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
  //         { path: ':userId', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
  //     ]
  // },
];
