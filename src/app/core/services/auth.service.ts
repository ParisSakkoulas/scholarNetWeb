import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  catchError,
  finalize,
  firstValueFrom,
  from,
  Observable,
  of,
  shareReplay,
  tap,
} from 'rxjs';

import { environment } from '../../../environmets/environment';
import {
  EmailVerify,
  Login,
  LoginResponse,
  Register,
  RegisterResponse,
  User,
  VerifyEmailResponse,
} from '../../features/auth/models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly apiAuth = `${environment.apiUrl}/auth`;
  private refresh$?: Observable<string>;

  // Curent user states
  private _currentUser = signal<User | null>(null);
  currentUser = this._currentUser.asReadonly();
  isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    const stored = localStorage.getItem('user');
    if (stored) this._currentUser.set(JSON.parse(stored));
  }

  register(registerPayload: Register) {
    return this.http.post<RegisterResponse>(
      `${this.apiAuth}/register`,
      registerPayload,
    );
  }

  login(loginPayload: Login) {
    return (
      this.http
        // withCredentials: lets the browser store the httpOnly refresh-token cookie
        .post<LoginResponse>(`${this.apiAuth}/login`, loginPayload, {
          withCredentials: true,
        })
        .pipe(
          tap((response) => {
            this._currentUser.set(response.user);
            localStorage.setItem('user', JSON.stringify(response.user));
            localStorage.setItem('accessToken', response.accessToken);
          }),
        )
    );
  }

  /**
   * Gets a new access token using the refresh-token cookie.
   *
   * - One request at a time: calls made while a refresh is running share its result.
   * - Across browser tabs: the API rotates the refresh token and treats a replayed old one as
   *   theft (it ends the session), so tabs take a lock and, if another tab already refreshed,
   *   reuse that token instead of sending the old cookie again.
   *
   * @param failedToken the access token that just got a 401 (to detect "someone already refreshed")
   */
  refreshAccessToken(failedToken: string | null): Observable<string> {
    if (!this.refresh$) {
      this.refresh$ = from(
        this.withTabLock(async () => {
          const current = this.getToken();
          if (current && current !== failedToken) return current;

          const res = await firstValueFrom(
            this.http.post<{ accessToken: string }>(
              `${this.apiAuth}/refresh`,
              {},
              { withCredentials: true },
            ),
          );
          localStorage.setItem('accessToken', res.accessToken);
          return res.accessToken;
        }),
      ).pipe(
        finalize(() => (this.refresh$ = undefined)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.refresh$;
  }

  private withTabLock<T>(task: () => Promise<T>): Promise<T> {
    const locks = (navigator as Navigator & { locks?: LockManager }).locks;
    return locks ? locks.request('scholarnet-token-refresh', task) : task();
  }

  /** Keep the cached signed-in user in sync after a profile/account edit. */
  updateCurrentUser(patch: Partial<User>): void {
    const current = this._currentUser();
    if (!current) return;
    const updated = { ...current, ...patch };
    this._currentUser.set(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  }

  /** Ends the session on the server (revokes the refresh token), then clears it locally. */
  logout() {
    const hasSession = !!this.getToken();
    const done = () => {
      this.clearSession();
      this.router.navigate(['/auth/login']);
    };
    if (!hasSession) return done();

    // the local session is cleared even if the server is unreachable or the token already expired
    this.http
      .post(`${this.apiAuth}/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe(done);
  }

  /** Forgets the session in this browser only (no server call). Used when a refresh fails. */
  clearSession() {
    this._currentUser.set(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  }

  verifyEmai(emailVerifyPayload: string) {
    return this.http.get<VerifyEmailResponse>(
      `${this.apiAuth}/verify-email/${emailVerifyPayload}`,
    );
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.apiAuth}/forgot-password`, {
      email,
    });
  }

  unlock(token: string) {
    return this.http.post<{ message: string }>(`${this.apiAuth}/unlock`, {
      token,
    });
  }

  resetPassword(payload: { token: string; newPassword: string }) {
    return this.http.post<{ message: string }>(
      `${this.apiAuth}/reset-password`,
      payload,
    );
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }
}
