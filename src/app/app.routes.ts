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
                    import('./shared/components/ui/public-home/public-home.component')
                        .then(m => m.PublicHomeComponent),
            }

        ],
    },

    {
        path: 'auth',
        children: [
            { path: 'login', loadComponent: () => import('./features/auth/components/login/login.component').then(m => m.LoginComponent) },
            { path: 'register', loadComponent: () => import('./features/auth/components/register/register.component').then(m => m.RegisterComponent) },
            { path: 'verify-email/:token', loadComponent: () => import('./features/auth/components/verify-email/verify-email.component').then(m => m.VerifyEmailComponent) },
            { path: '', redirectTo: 'login', pathMatch: 'full' },
        ]
    },



    {
        path: 'main',
        component: MainLayoutComponent,
        children: [
            {
                path: 'profile',
                loadComponent: () =>
                    import('./features/profile/profile.component')
                        .then(m => m.ProfileComponent),
            },

            {
                path: 'profile/:userId',
                loadComponent: () =>
                    import('./features/profile/profile.component')
                        .then(m => m.ProfileComponent),
            },

            {
                path: 'profile/:userId/edit',
                loadComponent: () =>
                    import('./features/profile/edit-profile/edit-profile.component')
                        .then(m => m.EditProfileComponent),
            }

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