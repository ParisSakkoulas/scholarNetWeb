import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { User } from '../../features/auth/models/auth.model';

import { Observable, tap } from 'rxjs';
import { environment } from '../../../environmets/environment';
import { UserSearchResult } from '../../features/teams/models/user-search.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  private readonly apiUsers = `${environment.apiUrl}/users`;

  getUser(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUsers}/${userId}`);
  }

  /** Matches against email and username, for the team-invite search box. */
  search(query: string): Observable<UserSearchResult[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<UserSearchResult[]>(`${this.apiUsers}/search`, {
      params,
    });
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

  /** PATCH /users/me — first name, last name and username. */
  updateUserInfo(payload: {
    firstName: string;
    lastName: string;
    username: string;
  }): Observable<User> {
    return this.http.patch<User>(`${this.apiUsers}/me`, payload);
  }

  /** PATCH /users/change-email: stores a pending email and mails a confirmation
   *  link to the new address; the current email stays until it is confirmed. */
  requestEmailChange(
    currentPassword: string,
    newEmail: string,
  ): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUsers}/change-email`, {
      currentPassword,
      newEmail,
    });
  }
}
