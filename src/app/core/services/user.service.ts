import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { User } from "../../features/auth/models/auth.model";

import { Observable, tap } from "rxjs";
import { environment } from "../../../environmets/environment";


@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);

    private readonly apiUsers = `${environment.apiUrl}/users`;


    getUser(userId: string): Observable<User> {
        return this.http.get<User>(`${this.apiUsers}/${userId}`)
    }


}  