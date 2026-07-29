import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { RemoteOptions } from '../models/generic-config.model';

export interface OptionItem {
  label: string;
  value: any;
}

@Injectable({ providedIn: 'root' })
export class GenericOptionsService {
  constructor(private http: HttpClient) {}

  /**
   * Fetch options for a remote select, applying any cascading dependencies.
   * `formValues` is the current form model — used to resolve dependsOn.formKey.
   */
  search(
    remote: RemoteOptions,
    formValues: Record<string, any>,
    term = '',
  ): Observable<OptionItem[]> {
    const params: Record<string, any> = { [remote.searchField]: term };
    for (const dep of remote.dependsOn ?? []) {
      params[dep.searchKey] = formValues[dep.formKey];
    }
    return this.http.get<any[]>(`/api/${remote.url}`, { params }).pipe(
      map((rows) =>
        rows.map((r) => ({
          label: r[remote.titleField],
          value: r[remote.valueField],
        })),
      ),
    );
  }

  /**
   * Resolve the related record behind an autocomplete's `watch` field so the
   * caller can pull `sourcePath` off it (e.g. author code -> author record -> affiliation).
   */
  fetchRelated(endpoint: string, id: any): Promise<any> {
    return firstValueFrom(this.http.get<any>(`/api/${endpoint}/${id}`));
  }
}

/** Read a dotted path off an object, e.g. getPath(author, 'affiliation.institution'). */
export function getPath(obj: any, path: string): any {
  return path
    .split('.')
    .reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}
