import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';




import { environment } from '../../../environmets/environment';
import {
  EmailVerify,
  Login,
  LoginResponse,
  Register,
  RegisterResponse,
  User,
  VerifyEmailResponse
} from '../../features/auth/models/auth.model';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly apiAuth = `${environment.apiUrl}/auth`

  // Curent user states
  private _currentUser = signal<User | null>(null);
  currentUser = this._currentUser.asReadonly();
  isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    const stored = localStorage.getItem('user');
    if (stored) this._currentUser.set(JSON.parse(stored));
  }

  register(registerPayload: Register) {
    return this.http.post<RegisterResponse>(`${this.apiAuth}/register`, registerPayload)
  }

  login(loginPayload: Login) {
    return this.http.post<LoginResponse>(`${this.apiAuth}/login`, loginPayload).pipe(
      tap(response => {
        this._currentUser.set(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('accessToken', response.accessToken);
      })
    );
  }

  logout() {
    this._currentUser.set(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    this.router.navigate(['/auth/login']);
  }

  verifyEmai(emailVerifyPayload: string) {
    return this.http.get<VerifyEmailResponse>(`${this.apiAuth}/verify-email/${emailVerifyPayload}`)
  }
}
