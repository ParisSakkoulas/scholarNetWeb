import {
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors,
} from '@angular/forms';
import { Observable, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
  first,
} from 'rxjs/operators';

export function uniqueFieldValidator(
  checkFn: (value: string) => Observable<{ exists: boolean }>,
  getCurrentValue: () => string,
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const value = control.value;

    if (!value || value === getCurrentValue()) {
      return of(null);
    }

    return of(value).pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(() =>
        checkFn(value).pipe(
          map((res) => (res.exists ? { alreadyExists: true } : null)),
          catchError(() => of(null)),
        ),
      ),
      first(),
    );
  };
}
