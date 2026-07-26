// features/profile/services/profile.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environmets/environment';
import { Profile } from '../models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private http = inject(HttpClient);

  private readonly apiProfile = `${environment.apiUrl}/profile`;

  private _profile = signal<Profile | null>(null);
  profile = this._profile.asReadonly();

  getProfile(userId: string): Observable<Profile> {
    return this.http
      .get<Profile>(`${this.apiProfile}/${userId}`)
      .pipe(tap((profile) => this._profile.set(profile)));
  }

  searchProfiles(query: string): Observable<Profile[]> {
    return this.http.get<Profile[]>(this.apiProfile, {
      params: { q: query },
    });
  }

  updateProfileInofo(profilePayload: Profile) {
    return this.http.patch(`${this.apiProfile}/me`);
  }

  // ---------------- OWN PROFILE — UPDATE ----------------

  // updateProfile(payload: UpdateProfilePayload): Observable<Profile> {
  //     return this.http.patch<Profile>(`${this.apiProfile}/me`, payload).pipe(
  //         tap((profile) => this._profile.set(profile)),
  //     );
  // }

  // ---------------- POSITIONS ----------------

  // addPosition(payload: CreatePositionPayload): Observable<Profile> {
  //     return this.http.post<Profile>(`${this.apiProfile}/me/positions`, payload).pipe(
  //         tap((profile) => this._profile.set(profile)),
  //     );
  // }

  // updatePosition(positionId: string, payload: UpdatePositionPayload): Observable<Profile> {
  //     return this.http
  //         .patch<Profile>(`${this.apiProfile}/me/positions/${positionId}`, payload)
  //         .pipe(tap((profile) => this._profile.set(profile)));
  // }

  removePosition(positionId: string): Observable<Profile> {
    return this.http
      .delete<Profile>(`${this.apiProfile}/me/positions/${positionId}`)
      .pipe(tap((profile) => this._profile.set(profile)));
  }

  // ---------------- EDUCATION ----------------

  // addEducation(payload: CreateEducationPayload): Observable<Profile> {
  //     return this.http.post<Profile>(`${this.apiProfile}/me/education`, payload).pipe(
  //         tap((profile) => this._profile.set(profile)),
  //     );
  // }

  // updateEducation(educationId: string, payload: UpdateEducationPayload): Observable<Profile> {
  //     return this.http
  //         .patch<Profile>(`${this.apiProfile}/me/education/${educationId}`, payload)
  //         .pipe(tap((profile) => this._profile.set(profile)));
  // }

  removeEducation(educationId: string): Observable<Profile> {
    return this.http
      .delete<Profile>(`${this.apiProfile}/me/education/${educationId}`)
      .pipe(tap((profile) => this._profile.set(profile)));
  }

  // ---------------- SKILLS ----------------

  // addSkill(payload: CreateSkillPayload): Observable<Profile> {
  //     return this.http.post<Profile>(`${this.apiProfile}/me/skills`, payload).pipe(
  //         tap((profile) => this._profile.set(profile)),
  //     );
  // }

  removeSkill(skillId: string): Observable<Profile> {
    return this.http
      .delete<Profile>(`${this.apiProfile}/me/skills/${skillId}`)
      .pipe(tap((profile) => this._profile.set(profile)));
  }

  // addInterest(payload: CreateInterestPayload): Observable<Profile> {
  //     return this.http.post<Profile>(`${this.apiProfile}/me/interests`, payload).pipe(
  //         tap((profile) => this._profile.set(profile)),
  //     );
  // }

  removeInterest(interestId: string): Observable<Profile> {
    return this.http
      .delete<Profile>(`${this.apiProfile}/me/interests/${interestId}`)
      .pipe(tap((profile) => this._profile.set(profile)));
  }
}
