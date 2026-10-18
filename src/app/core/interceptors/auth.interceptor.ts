import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environmets/environment';
import { AuthService } from '../services/auth.service';

const withToken = <T>(req: HttpRequest<T>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

/**
 * - Adds the access token, but only to our own API (never to third-party URLs).
 * - On a 401 it refreshes the token once and retries the request.
 * - If the refresh fails the session is over: clear it and go to the login page.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const usedToken = auth.getToken();

  return next(withToken(req, usedToken)).pipe(
    catchError((err: HttpErrorResponse) => {
      // login/refresh/etc. answer 401 for their own reasons (wrong password...): never retry those
      const isAuthEndpoint = req.url.includes('/auth/');
      if (err.status !== 401 || isAuthEndpoint || !usedToken) {
        return throwError(() => err);
      }

      return auth.refreshAccessToken(usedToken).pipe(
        switchMap((newToken) => next(withToken(req, newToken))),
        catchError((refreshErr) => {
          // refresh token expired, revoked or reused: the user must log in again
          if (refreshErr instanceof HttpErrorResponse && refreshErr.status === 401) {
            auth.clearSession();
            router.navigate(['/auth/login']);
          }
          return throwError(() => err);
        }),
      );
    }),
  );
};
