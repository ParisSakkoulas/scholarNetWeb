import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Keeps non-admins off admin screens. The API checks the role again on every call. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.currentUser()?.role === 'admin' ? true : inject(Router).createUrlTree(['/main/grants']);
};
