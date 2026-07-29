import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { User } from '../../features/auth/models/auth.model';

import { Observable, tap } from 'rxjs';
import { environment } from '../../../environmets/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  private readonly apiUsers = `${environment.apiUrl}/users`;

  getUser(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUsers}/${userId}`);
  }

  checkUsernameExists(
    username: string,
    excludeUserId?: string,
  ): Observable<{ exists: boolean }> {
    let params = new HttpParams().set('username', username);
    if (excludeUserId) params = params.set('excludeUserId', excludeUserId);
    return this.http.get<{ exists: boolean }>(
      `${this.apiUsers}/check-username`,
      { params },
    );
  }

  checkEmailExists(
    email: string,
    excludeUserId?: string,
  ): Observable<{ exists: boolean }> {
    let params = new HttpParams().set('email', email);
    if (excludeUserId) params = params.set('excludeUserId', excludeUserId);
    return this.http.get<{ exists: boolean }>(`${this.apiUsers}/check-email`, {
      params,
    });
  }
}
