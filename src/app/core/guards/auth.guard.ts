import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Keeps logged-out visitors out of the app; the API still enforces access on every call. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.getToken() ? true : inject(Router).createUrlTree(['/auth/login']);
};
