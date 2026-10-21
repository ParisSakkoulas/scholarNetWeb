import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SelectButtonModule } from 'primeng/selectbutton';
import { map } from 'rxjs';

import { FileRequestsComponent } from '../publications/file-requests/file-requests.component';
import { AuthorshipRequestsComponent } from './authorship-requests.component';

type RequestKind = 'files' | 'authorship';

/** One inbox for everything somebody asks of me: file access and authorship. */
@Component({
  selector: 'app-requests',
  imports: [FormsModule, SelectButtonModule, FileRequestsComponent, AuthorshipRequestsComponent],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-8">
      <header class="mb-5">
        <h1 class="m-0 text-2xl font-semibold text-gray-900">Requests</h1>
        <p class="m-0 mt-1 text-sm text-gray-500">
          Answer file access and authorship requests in one place.
        </p>
      </header>

      <p-selectbutton
        styleClass="mb-4"
        [options]="kinds"
        optionLabel="label"
        optionValue="value"
        [allowEmpty]="false"
        [ngModel]="kind()"
        (ngModelChange)="open($event)"
      />

      @if (kind() === 'files') {
        <app-file-requests [embedded]="true" />
      } @else {
        <app-authorship-requests />
      }
    </div>
  `,
})
export class RequestsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly kinds = [
    { label: 'File access', value: 'files' },
    { label: 'Authorship', value: 'authorship' },
  ];

  private readonly param = toSignal(this.route.paramMap.pipe(map((p) => p.get('kind'))));
  readonly kind = computed<RequestKind>(() => (this.param() === 'authorship' ? 'authorship' : 'files'));

  open(kind: RequestKind): void {
    this.router.navigate(['/main/requests', kind]);
  }
}
